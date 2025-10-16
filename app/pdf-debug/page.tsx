'use client';

import React, { useState } from 'react';
import { PDFDocument } from 'pdf-lib';

interface FieldInfo {
  name: string;
  type: string;
  value?: any;
  defaultValue?: any;
  isReadOnly?: boolean;
  isRequired?: boolean;
  options?: string[];
  maxLength?: number;
  flags?: number;
  fontSize?: number;
  fontName?: string;
  textColor?: string;
  backgroundColor?: string;
  borderColor?: string;
  fieldRect?: { x: number; y: number; width: number; height: number };
}

const PDFDebugPage: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [fieldInfo, setFieldInfo] = useState<FieldInfo[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [analysisComplete, setAnalysisComplete] = useState(false);

  const analyzePDFFields = async () => {
    setIsLoading(true);
    setError(null);
    setFieldInfo([]);
    setAnalysisComplete(false);

    try {
      console.log('🔍 Starting PDF field analysis...');
      
      // Load the D&D 5E Character Sheet PDF
      const response = await fetch('/charSheet.pdf');
      if (!response.ok) {
        throw new Error(`Failed to fetch PDF: ${response.status} ${response.statusText}`);
      }
      
      const existingPdfBytes = await response.arrayBuffer();
      console.log('📄 PDF loaded successfully, size:', existingPdfBytes.byteLength, 'bytes');
      
      // Load the PDF document
      const pdfDoc = await PDFDocument.load(existingPdfBytes);
      const form = pdfDoc.getForm();
      
      console.log('📋 PDF form loaded, analyzing fields...');
      
      // Get all form fields
      const fields = form.getFields();
      console.log(`🎯 Found ${fields.length} form fields in the PDF`);
      
      const fieldDetails: FieldInfo[] = [];
      
      // Analyze each field in detail
      fields.forEach((field, index) => {
        try {
          const fieldName = field.getName();
          const fieldType = field.constructor.name;
          
          console.log(`\n📝 Field ${index + 1}: "${fieldName}"`);
          console.log(`   Type: ${fieldType}`);
          
          const fieldInfo: FieldInfo = {
            name: fieldName,
            type: fieldType,
          };
          
          // Get field properties based on type
          if ('getValue' in field) {
            try {
              fieldInfo.value = (field as any).getValue();
              console.log(`   Current Value: ${fieldInfo.value}`);
            } catch (e) {
              console.log(`   Value: Error reading - ${e}`);
            }
          }
          
          if ('getDefaultValue' in field) {
            try {
              fieldInfo.defaultValue = (field as any).getDefaultValue();
              console.log(`   Default Value: ${fieldInfo.defaultValue}`);
            } catch (e) {
              console.log(`   Default Value: Error reading - ${e}`);
            }
          }
          
          if ('isReadOnly' in field) {
            try {
              fieldInfo.isReadOnly = (field as any).isReadOnly();
              console.log(`   Read Only: ${fieldInfo.isReadOnly}`);
            } catch (e) {
              console.log(`   Read Only: Error reading - ${e}`);
            }
          }
          
          if ('isRequired' in field) {
            try {
              fieldInfo.isRequired = (field as any).isRequired();
              console.log(`   Required: ${fieldInfo.isRequired}`);
            } catch (e) {
              console.log(`   Required: Error reading - ${e}`);
            }
          }
          
          if ('getMaxLength' in field) {
            try {
              fieldInfo.maxLength = (field as any).getMaxLength();
              console.log(`   Max Length: ${fieldInfo.maxLength}`);
            } catch (e) {
              console.log(`   Max Length: Error reading - ${e}`);
            }
          }
          
          if ('getOptions' in field) {
            try {
              fieldInfo.options = (field as any).getOptions();
              console.log(`   Options: ${fieldInfo.options?.length || 0} available`);
              if (fieldInfo.options && fieldInfo.options.length > 0) {
                console.log(`   Options List: [${fieldInfo.options.slice(0, 5).join(', ')}${fieldInfo.options.length > 5 ? '...' : ''}]`);
              }
            } catch (e) {
              console.log(`   Options: Error reading - ${e}`);
            }
          }
          
          // Try to get field flags (advanced property)
          try {
            const fieldDict = (field as any).acroField?.dict;
            if (fieldDict && 'get' in fieldDict) {
              const flags = fieldDict.get('Ff');
              if (flags) {
                fieldInfo.flags = flags;
                console.log(`   Flags: ${flags} (binary: ${flags.toString(2)})`);
              }
            }
          } catch (e) {
            // Flags not available or error reading
          }

          // Try to get font and appearance information
          try {
            const fieldDict = (field as any).acroField?.dict;
            if (fieldDict && 'get' in fieldDict) {
              // Get font information
              const da = fieldDict.get('DA'); // Default appearance
              if (da) {
                console.log(`   Default Appearance: ${da}`);
                // Parse font size from appearance string (e.g., "/Helv 9 Tf" means Helvetica 9pt)
                const fontMatch = da.match(/\/(\w+)\s+(\d+(?:\.\d+)?)\s+Tf/);
                if (fontMatch) {
                  fieldInfo.fontName = fontMatch[1];
                  fieldInfo.fontSize = parseFloat(fontMatch[2]);
                  console.log(`   Font: ${fieldInfo.fontName} ${fieldInfo.fontSize}pt`);
                }
              }

              // Get field rectangle (position and size)
              const rect = fieldDict.get('Rect');
              if (rect && rect.length === 4) {
                fieldInfo.fieldRect = {
                  x: rect[0],
                  y: rect[1], 
                  width: rect[2] - rect[0],
                  height: rect[3] - rect[1]
                };
                console.log(`   Field Rect: ${fieldInfo.fieldRect.width.toFixed(1)}x${fieldInfo.fieldRect.height.toFixed(1)} at (${fieldInfo.fieldRect.x.toFixed(1)}, ${fieldInfo.fieldRect.y.toFixed(1)})`);
              }

              // Get border and background colors
              const borderColor = fieldDict.get('BC');
              if (borderColor) {
                fieldInfo.borderColor = borderColor.toString();
                console.log(`   Border Color: ${fieldInfo.borderColor}`);
              }

              const backgroundColor = fieldDict.get('BG');
              if (backgroundColor) {
                fieldInfo.backgroundColor = backgroundColor.toString();
                console.log(`   Background Color: ${fieldInfo.backgroundColor}`);
              }

              // Check for text color in appearance
              const textColorMatch = da?.match(/rg\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)/);
              if (textColorMatch) {
                fieldInfo.textColor = `rgb(${textColorMatch[1]}, ${textColorMatch[2]}, ${textColorMatch[3]})`;
                console.log(`   Text Color: ${fieldInfo.textColor}`);
              }
            }
          } catch (e) {
            console.log(`   Appearance: Error reading - ${e}`);
          }
          
          fieldDetails.push(fieldInfo);
          
        } catch (fieldError) {
          console.error(`❌ Error analyzing field ${index + 1}:`, fieldError);
          fieldDetails.push({
            name: `ERROR_FIELD_${index + 1}`,
            type: 'ERROR',
            value: `Error: ${fieldError}`,
          });
        }
      });
      
      setFieldInfo(fieldDetails);
      setAnalysisComplete(true);
      
      // Log summary
      console.log('\n📊 ANALYSIS SUMMARY:');
      console.log(`Total fields found: ${fieldDetails.length}`);
      
      const typeCounts = fieldDetails.reduce((acc, field) => {
        acc[field.type] = (acc[field.type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
      console.log('Field types:');
      Object.entries(typeCounts).forEach(([type, count]) => {
        console.log(`  ${type}: ${count}`);
      });
      
      const fieldsWithValues = fieldDetails.filter(f => f.value !== undefined && f.value !== null && f.value !== '');
      console.log(`Fields with values: ${fieldsWithValues.length}`);
      
      const readOnlyFields = fieldDetails.filter(f => f.isReadOnly);
      console.log(`Read-only fields: ${readOnlyFields.length}`);
      
      const requiredFields = fieldDetails.filter(f => f.isRequired);
      console.log(`Required fields: ${requiredFields.length}`);
      
      console.log('\n✅ PDF field analysis complete!');
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      console.error('❌ Error during PDF analysis:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const exportFieldData = () => {
    const data = {
      timestamp: new Date().toISOString(),
      totalFields: fieldInfo.length,
      analysis: fieldInfo,
      summary: {
        fieldTypes: fieldInfo.reduce((acc, field) => {
          acc[field.type] = (acc[field.type] || 0) + 1;
          return acc;
        }, {} as Record<string, number>),
        fieldsWithValues: fieldInfo.filter(f => f.value !== undefined && f.value !== null && f.value !== '').length,
        readOnlyFields: fieldInfo.filter(f => f.isReadOnly).length,
        requiredFields: fieldInfo.filter(f => f.isRequired).length,
      }
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `charSheet_pdf_fields_analysis_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const copyFieldNames = () => {
    const fieldNames = fieldInfo.map(f => f.name).join('\n');
    navigator.clipboard.writeText(fieldNames).then(() => {
      alert('Field names copied to clipboard!');
    }).catch(() => {
      alert('Failed to copy to clipboard');
    });
  };

  return (
    <div className="min-h-screen bg-gray-100 py-8">
      <div className="max-w-6xl mx-auto px-4">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-4 text-gray-800">
            PDF Field Debugging Tool
          </h1>
          <p className="text-lg text-gray-600 mb-4">
            Analyze and log all form fields in the D&D 5e Character Sheet PDF
          </p>
          <a 
            href="/"
            className="inline-block px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            ← Back to Character Sheets
          </a>
        </div>
        
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h2 className="text-2xl font-bold mb-4 text-gray-800">PDF Field Analysis</h2>
          
          <div className="mb-6">
            <p className="text-gray-600 mb-4">
              Click the button below to analyze all form fields in the charSheet.pdf file. 
              This will log detailed information about each field to the browser console and display a summary here.
            </p>
            
            <div className="flex gap-4 mb-4">
              <button
                onClick={analyzePDFFields}
                disabled={isLoading}
                className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Analyzing PDF...' : 'Analyze PDF Fields'}
              </button>
              
              {analysisComplete && (
                <>
                  <button
                    onClick={exportFieldData}
                    className="px-6 py-3 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
                  >
                    Export Analysis Data
                  </button>
                  
                  <button
                    onClick={copyFieldNames}
                    className="px-6 py-3 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors"
                  >
                    Copy Field Names
                  </button>
                </>
              )}
            </div>
            
            {isLoading && (
              <div className="mb-4 p-3 bg-blue-100 border border-blue-400 text-blue-700 rounded">
                🔍 Analyzing PDF fields... Check the browser console for detailed logs.
              </div>
            )}
            
            {error && (
              <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
                ❌ Error: {error}
              </div>
            )}
            
            {analysisComplete && !error && (
              <div className="mb-4 p-3 bg-green-100 border border-green-400 text-green-700 rounded">
                ✅ Analysis complete! Found {fieldInfo.length} fields. Check the browser console for detailed logs.
              </div>
            )}
          </div>
        </div>

        {analysisComplete && fieldInfo.length > 0 && (
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-2xl font-bold mb-4 text-gray-800">Field Analysis Results</h2>
            
            {/* Summary Statistics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">{fieldInfo.length}</div>
                <div className="text-sm text-blue-800">Total Fields</div>
              </div>
              <div className="bg-green-50 p-4 rounded-lg">
                <div className="text-2xl font-bold text-green-600">
                  {fieldInfo.filter(f => f.value !== undefined && f.value !== null && f.value !== '').length}
                </div>
                <div className="text-sm text-green-800">With Values</div>
              </div>
              <div className="bg-yellow-50 p-4 rounded-lg">
                <div className="text-2xl font-bold text-yellow-600">
                  {fieldInfo.filter(f => f.isReadOnly).length}
                </div>
                <div className="text-sm text-yellow-800">Read Only</div>
              </div>
              <div className="bg-red-50 p-4 rounded-lg">
                <div className="text-2xl font-bold text-red-600">
                  {fieldInfo.filter(f => f.isRequired).length}
                </div>
                <div className="text-sm text-red-800">Required</div>
              </div>
            </div>

            {/* Field Types Summary */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-3 text-gray-800">Field Types</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                {Object.entries(
                  fieldInfo.reduce((acc, field) => {
                    acc[field.type] = (acc[field.type] || 0) + 1;
                    return acc;
                  }, {} as Record<string, number>)
                ).map(([type, count]) => (
                  <div key={type} className="bg-gray-50 p-2 rounded text-sm">
                    <span className="font-medium">{type}:</span> {count}
                  </div>
                ))}
              </div>
            </div>

            {/* Font Size Analysis */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-3 text-gray-800">Font Size Analysis</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-red-50 p-4 rounded-lg">
                  <div className="text-lg font-bold text-red-600">
                    {fieldInfo.filter(f => f.fontSize && f.fontSize > 12).length}
                  </div>
                  <div className="text-sm text-red-800">Large Fonts (&gt;12pt)</div>
                  <div className="text-xs text-red-600 mt-1">
                    {fieldInfo.filter(f => f.fontSize && f.fontSize > 12).map(f => f.name).join(', ')}
                  </div>
                </div>
                <div className="bg-yellow-50 p-4 rounded-lg">
                  <div className="text-lg font-bold text-yellow-600">
                    {fieldInfo.filter(f => f.fontSize && f.fontSize < 8).length}
                  </div>
                  <div className="text-sm text-yellow-800">Small Fonts (&lt;8pt)</div>
                  <div className="text-xs text-yellow-600 mt-1">
                    {fieldInfo.filter(f => f.fontSize && f.fontSize < 8).map(f => f.name).join(', ')}
                  </div>
                </div>
                <div className="bg-green-50 p-4 rounded-lg">
                  <div className="text-lg font-bold text-green-600">
                    {fieldInfo.filter(f => f.fontSize && f.fontSize >= 8 && f.fontSize <= 12).length}
                  </div>
                  <div className="text-sm text-green-800">Normal Fonts (8-12pt)</div>
                </div>
              </div>
            </div>

            {/* Detailed Field List */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-3 text-gray-800">All Fields ({fieldInfo.length})</h3>
              <div className="max-h-96 overflow-y-auto border border-gray-200 rounded-lg">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="px-3 py-2 text-left font-medium text-gray-700">#</th>
                      <th className="px-3 py-2 text-left font-medium text-gray-700">Field Name</th>
                      <th className="px-3 py-2 text-left font-medium text-gray-700">Type</th>
                      <th className="px-3 py-2 text-left font-medium text-gray-700">Value</th>
                      <th className="px-3 py-2 text-left font-medium text-gray-700">Font</th>
                      <th className="px-3 py-2 text-left font-medium text-gray-700">Size</th>
                      <th className="px-3 py-2 text-left font-medium text-gray-700">Properties</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {fieldInfo.map((field, index) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="px-3 py-2 text-gray-600">{index + 1}</td>
                        <td className="px-3 py-2 font-mono text-gray-900">{field.name}</td>
                        <td className="px-3 py-2 text-gray-700">{field.type}</td>
                        <td className="px-3 py-2 text-gray-700 max-w-xs truncate">
                          {field.value !== undefined ? String(field.value) : '-'}
                        </td>
                        <td className="px-3 py-2 text-gray-700">
                          {field.fontName || '-'}
                        </td>
                        <td className="px-3 py-2 text-gray-700">
                          {field.fontSize ? (
                            <span className={`px-1 py-0.5 text-xs rounded ${
                              field.fontSize > 12 ? 'bg-red-100 text-red-800' :
                              field.fontSize < 8 ? 'bg-yellow-100 text-yellow-800' :
                              'bg-green-100 text-green-800'
                            }`}>
                              {field.fontSize}pt
                            </span>
                          ) : '-'}
                        </td>
                        <td className="px-3 py-2 text-gray-600">
                          <div className="flex flex-wrap gap-1">
                            {field.isReadOnly && <span className="px-1 py-0.5 bg-yellow-100 text-yellow-800 text-xs rounded">RO</span>}
                            {field.isRequired && <span className="px-1 py-0.5 bg-red-100 text-red-800 text-xs rounded">Req</span>}
                            {field.maxLength && <span className="px-1 py-0.5 bg-blue-100 text-blue-800 text-xs rounded">Max:{field.maxLength}</span>}
                            {field.options && <span className="px-1 py-0.5 bg-green-100 text-green-800 text-xs rounded">Opt:{field.options.length}</span>}
                            {field.fieldRect && <span className="px-1 py-0.5 bg-purple-100 text-purple-800 text-xs rounded">{Math.round(field.fieldRect.width)}x{Math.round(field.fieldRect.height)}</span>}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Instructions */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="text-lg font-semibold mb-2 text-gray-800">How to Use This Data</h3>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• <strong>Console Logs:</strong> Open browser developer tools (F12) to see detailed field analysis logs</li>
                <li>• <strong>Export Data:</strong> Click "Export Analysis Data" to download a JSON file with all field information</li>
                <li>• <strong>Copy Field Names:</strong> Click "Copy Field Names" to copy all field names to clipboard for use in your code</li>
                <li>• <strong>Field Mapping:</strong> Use the field names in your PDF filling code to target specific form fields</li>
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PDFDebugPage;
