# PDF Font Size Investigation

The `scripts/analyze_pdf_fonts.py` tool inspects the AcroForm dictionary and each widget annotation in `app/pdf/DND 5E Character Sheet.pdf`. For widgets that declare a `/DA` entry we capture the font resource and the requested size.

Key observations from the automated report:

- The document-level AcroForm default appearance is `/Helv 0 Tf 0 g`, which uses the Helvetica resource at font size `0` (auto-sizing). This matches expectations for editable forms.  
- A subset of widgets override that default and explicitly request 12 pt text via `/DA(/Helv 12 Tf 0 g)`, `/DA(/HeBo 12 Tf 0 g)`, or `/DA(/TiRo 12 Tf 0 g)`. These overrides appear on the weapon table and portrait/faction fields. Their bounding boxes are narrow, so rendering the text at 12 pt causes the overflow observed in generated PDFs.  
- Other widgets omit the `/DA` key entirely and therefore fall back to the document-level auto-size behaviour.

Because our PDF filling pipeline renders new appearance streams from the `/DA` entry, any field with an explicit `12 Tf` override will be drawn at 12 pt regardless of the available space. The native Acrobat UI likely ignores these overrides and auto-sizes the text, masking the issue when the form is completed manually.

The short-term mitigation is to normalise or replace the `/DA` strings on the affected fields before generating appearance streams. Alternatively, the filler can post-process the widgets and substitute a smaller font size when the bounding rectangle is cramped.
