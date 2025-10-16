import { PDFDocument, PDFName, PDFDict, PDFBool } from 'pdf-lib';
import { InputModel, toPdfFields } from './field_map';

export interface PdfFillResult {
  success: boolean;
  error?: string;
  fieldsFilled?: number;
  totalFields?: number;
}

export interface PdfFillOptions {
  pdfUrl?: string;
  filename?: string;
  action?: 'download' | 'open';
}

/**
 * Fills a PDF form with character data and triggers download or opens in new tab
 * @param characterData - The character data to fill into the PDF
 * @param options - Configuration options for PDF filling
 * @returns Promise that resolves with fill result information
 */
export async function fillCharacterSheetPdf(
  characterData: InputModel,
  options: PdfFillOptions = {}
): Promise<PdfFillResult> {
  const { pdfUrl = '/charSheet.pdf', filename, action = 'download' } = options;

  try {
    // Convert character data to PDF field mappings
    const pdfFields = toPdfFields(characterData);
    
    const response = await fetch(pdfUrl);
    if (!response.ok) throw new Error('Failed to load PDF template');
    const existingPdfBytes = await response.arrayBuffer();
    
    // 🔧 Load PDF and set NeedAppearances to preserve original styling
    console.log('🔧 Loading PDF and preserving original field appearances');
    const pdfDoc = await PDFDocument.load(existingPdfBytes);
    const form = pdfDoc.getForm();

    // 🔧 Ask viewers to repaint using existing field styling
    console.log('🔧 Setting NeedAppearances = true to preserve original styling');
    const acro = pdfDoc.context.lookup(pdfDoc.catalog.get(PDFName.of('AcroForm')), PDFDict);
    if (acro) {
      acro.set(PDFName.of('NeedAppearances'), PDFBool.True);
      console.log('✅ NeedAppearances set to true - PDF will use original field styling');
    } else {
      console.log('⚠️ No AcroForm found');
    }
    
    const fieldNames = form.getFields().map(f => f.getName());
    console.log('Available PDF fields:', fieldNames);
    
    let fieldsFilled = 0;
    for (const [fieldName, value] of Object.entries(pdfFields)) {
      try {
        const field = form.getField(fieldName);
        if (!field) continue;

        // Handle different field types using proper PDF-lib methods
        if (field.constructor.name === 'PDFTextField') {
          console.log(`📝 Setting text field "${fieldName}" = "${value}"`);
          const textField = field as any;
          
          // Set text without modifying font to preserve original styling
          textField.setText(value == null ? '' : String(value));
          fieldsFilled++;
          continue;
        }

        if (field.constructor.name === 'PDFCheckBox') {
          console.log(`☑️ Setting checkbox "${fieldName}" = ${value}`);
          const checkBox = field as any;
          if (typeof value === 'boolean') {
            value ? checkBox.check() : checkBox.uncheck();
            fieldsFilled++;
          }
          continue;
        }

        if (field.constructor.name === 'PDFDropdown') {
          console.log(`📋 Setting dropdown "${fieldName}" = "${value}"`);
          const dropdown = field as any;
          dropdown.select(String(value));
          fieldsFilled++;
          continue;
        }

        if (field.constructor.name === 'PDFRadioGroup') {
          console.log(`🔘 Setting radio group "${fieldName}" = "${value}"`);
          const radioGroup = field as any;
          radioGroup.select(String(value));
          fieldsFilled++;
          continue;
        }

        // Fallback for other field types
        console.log(`⚠️ Unknown field type "${field.constructor.name}" for field "${fieldName}"`);
      } catch (e) {
        console.log(`Could not set field ${fieldName}:`, e);
      }
    }
    
    console.log(`Successfully filled ${fieldsFilled} of ${Object.keys(pdfFields).length}`);

    const pdfBytes = await pdfDoc.save();
    const blob = new Blob([new Uint8Array(pdfBytes)], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    
    if (action === 'open') {
      // Open PDF in new tab
      const newWindow = window.open(url, '_blank');
      if (!newWindow) {
        // Fallback to download if popup is blocked
        const link = document.createElement('a');
        link.href = url;
        link.download = filename || `${characterData.identity.name.replace(/\s+/g, '_')}_Character_Sheet.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    } else {
      // Download PDF
      const link = document.createElement('a');
      link.href = url;
      link.download = filename || `${characterData.identity.name.replace(/\s+/g, '_')}_Character_Sheet.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
    
    // Clean up the object URL after a short delay to allow the action to complete
    setTimeout(() => URL.revokeObjectURL(url), 1000);

    return {
      success: true,
      fieldsFilled,
      totalFields: Object.keys(pdfFields).length
    };

  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to generate PDF'
    };
  }
}

/**
 * Validates character data structure
 * @param data - The character data to validate
 * @returns Validation result with error message if invalid
 */
export function validateCharacterData(data: any): { valid: boolean; error?: string } {
  try {
    // Basic validation for required fields
    if (!data.identity?.name || !data.identity?.class || !data.abilities) {
      return {
        valid: false,
        error: 'Invalid character data: missing required fields (identity.name, identity.class, abilities)'
      };
    }
    
    // Validate abilities object
    const requiredAbilities = ['str', 'dex', 'con', 'int', 'wis', 'cha'];
    for (const ability of requiredAbilities) {
      if (typeof data.abilities[ability] !== 'number') {
        return {
          valid: false,
          error: `Invalid character data: missing or invalid ability score for ${ability}`
        };
      }
    }
    
    return { valid: true };
  } catch (err) {
    return {
      valid: false,
      error: err instanceof Error ? err.message : 'Invalid JSON format'
    };
  }
}

