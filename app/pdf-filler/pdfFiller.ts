import { PDFDocument, PDFName, PDFDict, PDFBool } from 'pdf-lib';
import { InputModel, toPdfFields } from './field_map';

export interface PdfFillResult {
  success: boolean;
  error?: string;
  fieldsFilled?: number;
  totalFields?: number;
  blob?: Blob;
}

export interface PdfFillOptions {
  pdfUrl?: string;
  filename?: string;
  action?: 'download' | 'open';
  returnBlob?: boolean;
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
  const { pdfUrl = '/charSheet.pdf', filename, action = 'download', returnBlob = false } = options;

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

        // Handle different field types using method detection instead of constructor.name
        // This avoids issues with minified constructor names in production builds
        
        // Check for text fields (has setText method)
        if (typeof (field as any).setText === 'function') {
          console.log(`📝 Setting text field "${fieldName}" = "${value}"`);
          const textField = field as any;
          textField.setText(value == null ? '' : String(value));
          fieldsFilled++;
          continue;
        }

        // Check for checkboxes (has check and uncheck methods)
        if (typeof (field as any).check === 'function' && typeof (field as any).uncheck === 'function') {
          console.log(`☑️ Setting checkbox "${fieldName}" = ${value}`);
          const checkBox = field as any;
          if (typeof value === 'boolean') {
            value ? checkBox.check() : checkBox.uncheck();
            fieldsFilled++;
          }
          continue;
        }

        // Check for dropdown/radio fields (has select method)
        if (typeof (field as any).select === 'function') {
          console.log(`📋 Setting selectable field "${fieldName}" = "${value}"`);
          const selectField = field as any;
          selectField.select(String(value));
          fieldsFilled++;
          continue;
        }

        // Log unknown field types for debugging
        console.log(`⚠️ Unknown field type for "${fieldName}". Available methods:`, 
          Object.getOwnPropertyNames(Object.getPrototypeOf(field)).filter(name => typeof (field as any)[name] === 'function'));
      } catch (e) {
        console.log(`Could not set field ${fieldName}:`, e);
      }
    }
    
    console.log(`Successfully filled ${fieldsFilled} of ${Object.keys(pdfFields).length}`);

    // Flatten the form to make it non-editable and reduce file size
    console.log('🔧 Flattening PDF form fields...');
    form.flatten();
    console.log('✅ PDF form fields flattened successfully');

    const pdfBytes = await pdfDoc.save();
    const blob = new Blob([new Uint8Array(pdfBytes)], { type: 'application/pdf' });
    
    if (returnBlob) {
      // Return blob for batch processing
      return {
        success: true,
        fieldsFilled,
        totalFields: Object.keys(pdfFields).length,
        blob
      };
    }
    
    const url = URL.createObjectURL(blob);
    
    if (action === 'open') {
      // Open PDF in new tab
      const newWindow = window.open(url, '_blank');
      if (!newWindow) {
        // Fallback to download if popup is blocked
        const link = document.createElement('a');
        link.href = url;
        link.download = filename || `${characterData.identity.class}_Level${characterData.identity.level}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    } else {
      // Download PDF
      const link = document.createElement('a');
      link.href = url;
      link.download = filename || `${characterData.identity.class}_Level${characterData.identity.level}}.pdf`;
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

