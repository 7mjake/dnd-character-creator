import re
import zlib
from pathlib import Path
from typing import Dict, Tuple

PDF_PATH = Path('app/pdf/DND 5E Character Sheet.pdf')

def read_number(stream: memoryview, index: int) -> Tuple[int, int]:
    length = len(stream)
    while index < length and stream[index] in b" \n\r\t\f\x00":
        index += 1
    start = index
    while index < length and stream[index] not in b" \n\r\t\f\x00":
        index += 1
    if start == index:
        raise ValueError('Unable to parse number from object stream')
    return int(bytes(stream[start:index])), index


def parse_object_stream(raw: bytes, n_objects: int) -> Dict[int, bytes]:
    mapping: Dict[int, bytes] = {}
    mv = memoryview(raw)
    index = 0
    header_pairs = []
    for _ in range(n_objects):
        try:
            obj_num, index = read_number(mv, index)
            offset, index = read_number(mv, index)
        except ValueError:
            # If we cannot parse the header the object stream is malformed for our
            # simple parser. Abort parsing this stream so the caller can ignore it.
            return {}
        header_pairs.append((obj_num, offset))
    data_start = index
    for i, (obj_num, offset) in enumerate(header_pairs):
        next_offset = header_pairs[i + 1][1] if i + 1 < len(header_pairs) else len(raw) - data_start
        content = raw[data_start + offset : data_start + next_offset]
        mapping[obj_num] = content
    return mapping


def collect_objects(pdf_bytes: bytes) -> Dict[int, bytes]:
    objects: Dict[int, bytes] = {}
    # parse standard objects
    for match in re.finditer(rb"(\d+) 0 obj(.*?)endobj", pdf_bytes, re.S):
        obj_num = int(match.group(1))
        body = match.group(2)
        # ignore if this is actually an object stream (handled separately)
        if b"/Type/ObjStm" in body:
            continue
        objects[obj_num] = body.strip()
    # parse object streams
    pattern = re.compile(rb"(\d+) 0 obj(.*?)/Type/ObjStm(.*?)stream\r?\n", re.S)
    for match in pattern.finditer(pdf_bytes):
        obj_num = int(match.group(1))
        dict_section = match.group(0)
        length_match = re.search(rb"/Length (\d+)", dict_section)
        n_match = re.search(rb"/N (\d+)", dict_section)
        if not length_match or not n_match:
            continue
        length = int(length_match.group(1))
        n_objects = int(n_match.group(1))
        stream_start = match.end()
        stream_data = pdf_bytes[stream_start : stream_start + length]
        try:
            decoded = zlib.decompress(stream_data)
        except zlib.error:
            continue
        inner_objects = parse_object_stream(decoded, n_objects)
        if not inner_objects:
            continue
        for inner_num, content in inner_objects.items():
            objects[inner_num] = content.strip()
    return objects


def collect_widget_defaults(pdf_bytes: bytes) -> Dict[str, Tuple[str, float, str]]:
    defaults: Dict[str, Tuple[str, float, str]] = {}

    def inspect_entry(raw: bytes) -> None:
        if b'/Subtype/Widget' not in raw or b'/DA(' not in raw:
            return
        da_match = re.search(rb"/DA\(([^)]*)\)", raw)
        if not da_match:
            return
        da_string = da_match.group(1).decode('latin1', errors='replace')
        font_name, font_size = parse_da(da_string)
        t_match = re.search(rb"/T(\([^\)]*\)|<[^>]*>)", raw)
        field_name = decode_field_name(t_match.group(1)) if t_match else 'UNKNOWN'
        rect_match = re.search(rb"/Rect\[([^\]]*)\]", raw)
        rect = rect_match.group(1).decode('latin1', errors='replace') if rect_match else 'UNKNOWN'
        defaults[field_name] = (font_name, font_size, rect)

    # direct objects
    for match in re.finditer(rb"(\d+) 0 obj(.*?)endobj", pdf_bytes, re.S):
        body = match.group(2)
        if b"/Type/ObjStm" in body:
            continue
        inspect_entry(body)

    # object streams
    pattern = re.compile(rb"(\d+) 0 obj(.*?)/Type/ObjStm(.*?)stream\r?\n", re.S)
    for match in pattern.finditer(pdf_bytes):
        length_match = re.search(rb"/Length (\d+)", match.group(0))
        n_match = re.search(rb"/N (\d+)", match.group(0))
        if not length_match or not n_match:
            continue
        length = int(length_match.group(1))
        n_objects = int(n_match.group(1))
        stream_data = pdf_bytes[match.end() : match.end() + length]
        try:
            decoded = zlib.decompress(stream_data)
        except zlib.error:
            continue
        inner_objects = parse_object_stream(decoded, n_objects)
        for raw in inner_objects.values():
            inspect_entry(raw)

    return defaults


def parse_da(da: str) -> Tuple[str, float]:
    tokens = da.strip().split()
    font_name = ''
    size = float('nan')
    for i, token in enumerate(tokens):
        if token.endswith('Tf') and i >= 1:
            font_name = tokens[i - 1]
            try:
                size = float(tokens[i - 2])
            except (ValueError, IndexError):
                try:
                    size = float(tokens[i - 1])
                    font_name = tokens[i - 2]
                except (ValueError, IndexError):
                    size = float('nan')
            break
    return font_name, size


def decode_field_name(raw: bytes) -> str:
    if raw.startswith(b'(') and raw.endswith(b')'):
        content = raw[1:-1]
        if b"\x00" in content:
            try:
                return content.decode('utf-16-be')
            except UnicodeDecodeError:
                return content.decode('latin1', errors='replace')
        return content.decode('latin1', errors='replace')
    if raw.startswith(b'<') and raw.endswith(b'>'):
        hex_bytes = bytes.fromhex(raw[1:-1].decode('ascii'))
        try:
            return hex_bytes.decode('utf-16-be')
        except UnicodeDecodeError:
            return hex_bytes.decode('latin1', errors='replace')
    return raw.decode('latin1', errors='replace')


def main() -> None:
    pdf_bytes = PDF_PATH.read_bytes()
    objects = collect_objects(pdf_bytes)
    widget_defaults = collect_widget_defaults(pdf_bytes)

    acroform_raw = objects.get(2248)
    if acroform_raw is None:
        print('AcroForm dictionary not found')
    else:
        match = re.search(rb"/DA\(([^)]*)\)", acroform_raw)
        if match:
            acroform_da = match.group(1).decode('latin1', errors='replace')
            font_name, font_size = parse_da(acroform_da)
            print(f"AcroForm default appearance: {acroform_da} (font={font_name}, size={font_size})")
        else:
            print('AcroForm dictionary missing /DA entry')

    field_info = [
        (name, font, size, rect) for name, (font, size, rect) in widget_defaults.items()
    ]

    # sort by font size descending to highlight large defaults
    field_info.sort(key=lambda x: x[2], reverse=True)
    print("\nTop fields by default font size:")
    for name, font, size, rect in field_info[:15]:
        print(f"  Field '{name}' uses font '{font}' with size {size} (rect {rect})")

    large_fields = [info for info in field_info if info[2] >= 12]
    print(
        f"\nTotal fields with default font size >= 12: {len(large_fields)} out of {len(field_info)} widgets"
    )

if __name__ == '__main__':
    main()
