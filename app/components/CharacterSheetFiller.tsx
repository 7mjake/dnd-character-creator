'use client';

import React, { useState, useRef, useEffect } from 'react';
import { InputModel, toPdfFields } from '../pdf-filler/field_map';
import { fillCharacterSheetPdf, validateCharacterData } from '../pdf-filler/pdfFiller';


const CharacterSheetFiller: React.FC = () => {
  const [jsonInput, setJsonInput] = useState('');
  const [characterData, setCharacterData] = useState<InputModel | null>(null);
  const [characterDataArray, setCharacterDataArray] = useState<InputModel[] | null>(null);
  const [isBatchMode, setIsBatchMode] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [pdfFields, setPdfFields] = useState<Record<string, any> | null>(null);
  const [pdfFieldsArray, setPdfFieldsArray] = useState<Record<string, any>[] | null>(null);
  const [sampleCharacters, setSampleCharacters] = useState<any>(null);
  const [selectedCharacter, setSelectedCharacter] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load sample characters on component mount
  useEffect(() => {
    const loadSampleCharacters = async () => {
      try {
        const response = await fetch('/sample-characters.json');
        const data = await response.json();
        setSampleCharacters(data.characters);
      } catch (error) {
        console.error('Failed to load sample characters:', error);
      }
    };
    
    loadSampleCharacters();
  }, []);

  const validateAndParseJson = (jsonString: string): InputModel | InputModel[] | null => {
    try {
      const parsed = JSON.parse(jsonString);
      
      if (isBatchMode) {
        // Handle array of characters
        if (!Array.isArray(parsed)) {
          setError('Batch mode requires an array of character objects');
          return null;
        }
        
        const validatedCharacters: InputModel[] = [];
        for (let i = 0; i < parsed.length; i++) {
          const validation = validateCharacterData(parsed[i]);
          if (!validation.valid) {
            setError(`Invalid character data at index ${i}: ${validation.error || 'Invalid character data'}`);
            return null;
          }
          validatedCharacters.push(parsed[i] as InputModel);
        }
        
        return validatedCharacters;
      } else {
        // Handle single character
        const validation = validateCharacterData(parsed);
        if (!validation.valid) {
          setError(validation.error || 'Invalid character data');
          return null;
        }
        return parsed as InputModel;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid JSON format');
      return null;
    }
  };

  const handleJsonInput = (value: string) => {
    setJsonInput(value);
    setError(null);
    setCharacterData(null);
    setCharacterDataArray(null);
    setPdfFields(null);
    setPdfFieldsArray(null);
  };

  const handleLoadSample = (characterKey: string) => {
    if (!sampleCharacters || !sampleCharacters[characterKey]) {
      setError('Sample character not found');
      return;
    }
    
    const sampleData = sampleCharacters[characterKey].data;
    setJsonInput(JSON.stringify(sampleData, null, 2));
    setCharacterData(sampleData);
    setSelectedCharacter(characterKey);
    setError(null);
    
    // Generate PDF fields for preview
    const fields = toPdfFields(sampleData);
    setPdfFields(fields);
  };

  const handleParseJson = () => {
    const parsed = validateAndParseJson(jsonInput);
    if (parsed) {
      setError(null);
      
      if (isBatchMode && Array.isArray(parsed)) {
        setCharacterDataArray(parsed);
        setCharacterData(null);
        
        // Generate PDF fields for preview
        const fieldsArray = parsed.map(char => toPdfFields(char));
        setPdfFieldsArray(fieldsArray);
        setPdfFields(null);
      } else if (!isBatchMode && !Array.isArray(parsed)) {
        setCharacterData(parsed);
        setCharacterDataArray(null);
        
        // Generate PDF fields for preview
        const fields = toPdfFields(parsed);
        setPdfFields(fields);
        setPdfFieldsArray(null);
      }
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        setJsonInput(content);
        const parsed = validateAndParseJson(content);
        if (parsed) {
          if (isBatchMode && Array.isArray(parsed)) {
            setCharacterDataArray(parsed);
            setCharacterData(null);
            const fieldsArray = parsed.map(char => toPdfFields(char));
            setPdfFieldsArray(fieldsArray);
            setPdfFields(null);
          } else if (!isBatchMode && !Array.isArray(parsed)) {
            setCharacterData(parsed);
            setCharacterDataArray(null);
            const fields = toPdfFields(parsed);
            setPdfFields(fields);
            setPdfFieldsArray(null);
          }
        }
      };
      reader.readAsText(file);
    }
  };


  // Function to create a zip file from multiple PDFs
  const createZipFile = async (pdfBlobs: Blob[], filenames: string[]): Promise<Blob> => {
    const JSZip = (await import('jszip')).default;
    const zip = new JSZip();
    
    pdfBlobs.forEach((blob, index) => {
      zip.file(filenames[index], blob);
    });
    
    return await zip.generateAsync({ type: 'blob' });
  };

  const fillPDFForm = async (action: 'download' | 'open' = 'download') => {
    if (isBatchMode) {
      if (!characterDataArray || characterDataArray.length === 0) {
        setError('No character data loaded for batch processing');
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const pdfBlobs: Blob[] = [];
        const filenames: string[] = [];

        // Generate PDFs for each character
        for (let i = 0; i < characterDataArray.length; i++) {
          const character = characterDataArray[i];
          const result = await fillCharacterSheetPdf(character, { action: 'download', returnBlob: true });
          
          if (result.success && result.blob) {
            pdfBlobs.push(result.blob);
            const safeName = character.identity.name?.replace(/[^a-zA-Z0-9]/g, '_') || 'unnamed_character';
            filenames.push(`${character.identity.class}_Level${character.identity.level}.pdf`);
          } else {
            setError(`Failed to generate PDF for ${character.identity.class}_Level${character.identity.level}: ${result.error || 'Unknown error'}`);
            return;
          }
        }

        if (action === 'download') {
          // Create zip file and download
          const zipBlob = await createZipFile(pdfBlobs, filenames);
          const url = URL.createObjectURL(zipBlob);
          const a = document.createElement('a');
          a.href = url;
          a.download = 'character_sheets.zip';
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        } else {
          // Open each PDF in a new tab
          pdfBlobs.forEach((blob, index) => {
            const url = URL.createObjectURL(blob);
            window.open(url, '_blank');
            // Clean up URL after a delay
            setTimeout(() => URL.revokeObjectURL(url), 1000);
          });
        }

        console.log(`Successfully generated ${pdfBlobs.length} character sheets`);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to generate batch PDFs');
      } finally {
        setIsLoading(false);
      }
    } else {
      // Single character mode
      if (!characterData) {
        setError('No character data loaded');
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const result = await fillCharacterSheetPdf(characterData, { action });
        
        if (result.success) {
          console.log(`Successfully filled ${result.fieldsFilled} fields out of ${result.totalFields} available fields`);
        } else {
          setError(result.error || 'Failed to generate PDF');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to generate PDF');
      } finally {
        setIsLoading(false);
      }
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 py-8">
      <div className="max-w-6xl mx-auto px-4">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-4 text-gray-800">
            D&D 5e Character Sheet PDF Generator
          </h1>
          <p className="text-lg text-gray-600 mb-4">
            Paste your character JSON data and generate a filled PDF character sheet
          </p>
          <div className="flex justify-center gap-4">
            <a 
              href="/pdf-debug"
              className="inline-block px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              🔍 PDF Field Debugger
            </a>
          </div>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Input Section */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-2xl font-bold mb-4 text-gray-800">Character Data Input</h2>
            
            {/* Batch Mode Toggle */}
            <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-yellow-800">Batch Mode</h3>
                  <p className="text-sm text-yellow-600">
                    {isBatchMode 
                      ? 'Process multiple characters at once (requires JSON array)'
                      : 'Process single character (requires JSON object)'
                    }
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isBatchMode}
                    onChange={(e) => {
                      setIsBatchMode(e.target.checked);
                      setCharacterData(null);
                      setCharacterDataArray(null);
                      setPdfFields(null);
                      setPdfFieldsArray(null);
                      setError(null);
                    }}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>
            </div>
            
            <div className="mb-4">
              <label htmlFor="json-input" className="block text-sm font-medium text-gray-700 mb-2">
                {isBatchMode 
                  ? 'Paste your array of character JSON data here:'
                  : 'Paste your character JSON data here:'
                }
              </label>
              <textarea
                id="json-input"
                value={jsonInput}
                onChange={(e) => handleJsonInput(e.target.value)}
                className="w-full h-64 p-3 border border-gray-300 rounded-md text-gray-950 font-mono text-sm"
                placeholder="Paste your character JSON data here..."
              />
            </div>

            <div className="flex flex-wrap gap-2 mb-4">
              <button
                onClick={handleParseJson}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors text-sm"
              >
                Parse JSON
              </button>

              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleFileUpload}
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors text-sm"
              >
                Upload JSON File
              </button>
            </div>

            {/* Sample Character Selection */}
            {sampleCharacters && (
              <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-md">
                <h3 className="font-semibold text-blue-800 mb-3">Sample Characters</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {Object.entries(sampleCharacters).map(([key, character]: [string, any]) => (
                    <button
                      key={key}
                      onClick={() => handleLoadSample(key)}
                      className={`p-3 text-left rounded-md border-2 transition-colors ${
                        selectedCharacter === key
                          ? 'border-blue-500 bg-blue-100'
                          : 'border-blue-200 bg-white hover:border-blue-300 hover:bg-blue-50'
                      }`}
                    >
                      <div className="font-semibold text-blue-800 capitalize">
                        {character.name}
                      </div>
                      <div className="text-sm text-blue-600 mt-1">
                        {character.description}
                      </div>
                      <div className="text-xs text-blue-500 mt-2">
                        Level {character.data.identity.level} {character.data.identity.class}
                      </div>
                    </button>
                  ))}
                </div>
                <p className="text-xs text-blue-600 mt-3">
                  Click on a character to load their data into the form.
                </p>
              </div>
            )}

            <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-md">
              <h3 className="font-semibold text-green-800 mb-2">Download Sample Data</h3>
              <div className="flex flex-wrap gap-2">
                <a
                  href="/sample-characters.json"
                  download
                  className="px-3 py-1 bg-green-100 text-green-700 rounded text-sm hover:bg-green-200 transition-colors"
                >
                  Download Individual Characters
                </a>
                <a
                  href="/sample-characters-array.json"
                  download
                  className="px-3 py-1 bg-green-100 text-green-700 rounded text-sm hover:bg-green-200 transition-colors"
                >
                  Download Array Format (Batch Mode)
                </a>
              </div>
              <p className="text-xs text-green-600 mt-2">
                <strong>Individual:</strong> For single character mode. <strong>Array:</strong> For batch processing multiple characters at once.
              </p>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
                {error}
              </div>
            )}

            {characterData && (
              <div className="mb-4 p-3 bg-green-100 border border-green-400 text-green-700 rounded">
                ✓ Character data loaded successfully: {characterData.identity.name || 'Unnamed Character'} (Level {characterData.identity.level} {characterData.identity.class})
              </div>
            )}

            {characterDataArray && (
              <div className="mb-4 p-3 bg-green-100 border border-green-400 text-green-700 rounded">
                ✓ {characterDataArray.length} characters loaded successfully for batch processing
              </div>
            )}

            <div className="mt-6 space-y-3">
              <button
                onClick={() => fillPDFForm('download')}
                disabled={(!characterData && !characterDataArray) || isLoading}
                className="w-full px-6 py-3 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed font-semibold"
              >
                {isLoading 
                  ? 'Generating PDF...' 
                  : isBatchMode 
                    ? '📦 Download ZIP' 
                    : '📥 Download PDF'
                }
              </button>
              
              <button
                onClick={() => fillPDFForm('open')}
                disabled={(!characterData && !characterDataArray) || isLoading}
                className="w-full px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed font-semibold"
              >
                {isLoading 
                  ? 'Generating PDF...' 
                  : isBatchMode 
                    ? '🔗 Open All PDFs in New Tabs' 
                    : '🔗 Open PDF in New Tab'
                }
              </button>
            </div>
          </div>

          {/* Preview Section */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-2xl font-bold mb-4 text-gray-800">
              {isBatchMode ? 'Characters Preview' : 'Character Preview'}
            </h2>
            
            {characterDataArray && isBatchMode ? (
              <div className="space-y-4">
                <div className="text-sm text-gray-600 mb-4">
                  Showing {characterDataArray.length} characters for batch processing
                </div>
                {characterDataArray.map((char, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-4">
                    <h3 className="font-semibold text-gray-800 mb-2">
                      {index + 1}. {char.identity.name || 'Unnamed Character'}
                    </h3>
                    <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
                      <div>
                        <p><strong>Class:</strong> {char.identity.class} (Level {char.identity.level})</p>
                        <p><strong>Race:</strong> {char.identity.race}</p>
                        <p><strong>Background:</strong> {char.identity.background}</p>
                      </div>
                      <div>
                        <p><strong>Alignment:</strong> {char.identity.alignment}</p>
                        <p><strong>AC:</strong> {char.combat.armor_base_ac ?? (10 + Math.floor((char.abilities.dex - 10) / 2))}</p>
                        <p><strong>Speed:</strong> {char.combat.speed_ft} ft</p>
                      </div>
                    </div>
                    {char.spellcasting && (
                      <div className="mt-2 text-sm text-gray-600">
                        <p><strong>Spellcasting:</strong> {char.spellcasting.class} ({char.spellcasting.ability ? char.spellcasting.ability.charAt(0).toUpperCase() + char.spellcasting.ability.slice(1) : ''})</p>
                      </div>
                    )}
                  </div>
                ))}
                
                {pdfFieldsArray && (
                  <div className="mt-4 p-3 bg-gray-50 rounded">
                    <h3 className="font-semibold text-gray-800 mb-2">PDF Fields Generated</h3>
                    <p className="text-sm text-gray-600">
                      {pdfFieldsArray.reduce((total, fields) => total + Object.keys(fields).length, 0)} total fields across {pdfFieldsArray.length} characters
                    </p>
                  </div>
                )}
              </div>
            ) : characterData ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h3 className="font-semibold text-gray-800">Basic Info</h3>
                    <div className="text-sm text-gray-600 space-y-1">
                      <p><strong>Name:</strong> {characterData.identity.name || 'Not specified'}</p>
                      <p><strong>Class:</strong> {characterData.identity.class} (Level {characterData.identity.level})</p>
                      <p><strong>Race:</strong> {characterData.identity.race}</p>
                      <p><strong>Background:</strong> {characterData.identity.background}</p>
                      <p><strong>Alignment:</strong> {characterData.identity.alignment}</p>
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="font-semibold text-gray-800">Ability Scores</h3>
                    <div className="text-sm text-gray-600 space-y-1">
                      {Object.entries(characterData.abilities).map(([ability, score]) => (
                        <p key={ability}>
                          <strong>{ability.toUpperCase()}:</strong> {score} ({Math.floor((score - 10) / 2) >= 0 ? '+' : ''}{Math.floor((score - 10) / 2)})
                        </p>
                      ))}
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold text-gray-800">Combat Stats</h3>
                  <div className="text-sm text-gray-600 space-y-1">
                    <p><strong>AC:</strong> {characterData.combat.armor_base_ac ?? (10 + Math.floor((characterData.abilities.dex - 10) / 2))}</p>
                    <p><strong>Speed:</strong> {characterData.combat.speed_ft} ft</p>
                    <p><strong>Initiative:</strong> {Math.floor((characterData.abilities.dex - 10) / 2) >= 0 ? '+' : ''}{Math.floor((characterData.abilities.dex - 10) / 2)}</p>
                  </div>
                </div>

                {characterData.combat.weapons.length > 0 && (
                  <div>
                    <h3 className="font-semibold text-gray-800">Weapons</h3>
                    <div className="text-sm text-gray-600 space-y-1">
                      {characterData.combat.weapons.map((weapon, index) => (
                        <p key={index}>
                          <strong>{weapon.name}:</strong> {weapon.damage}
                        </p>
                      ))}
                    </div>
                  </div>
                )}

                {characterData.spellcasting && (
                  <div>
                    <h3 className="font-semibold text-gray-800">Spellcasting</h3>
                    <div className="text-sm text-gray-600 space-y-1">
                      <p><strong>Class:</strong> {characterData.spellcasting.class}</p>
                      <p><strong>Spellcasting Ability:</strong> {characterData.spellcasting.ability ? characterData.spellcasting.ability.charAt(0).toUpperCase() + characterData.spellcasting.ability.slice(1) : ''}</p>
                      {characterData.spellcasting.cantrips && characterData.spellcasting.cantrips.length > 0 && (
                        <p><strong>Cantrips:</strong> {characterData.spellcasting.cantrips.join(', ')}</p>
                      )}
                      {characterData.spellcasting.spells_known && Object.keys(characterData.spellcasting.spells_known).length > 0 && (
                        <div>
                          <strong>Spells Known:</strong>
                          {Object.entries(characterData.spellcasting.spells_known).map(([level, spells]) => (
                            <p key={level} className="ml-4">
                              Level {level}: {Array.isArray(spells) ? spells.join(', ') : ''}
                            </p>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {pdfFields && (
                  <div className="mt-4 p-3 bg-gray-50 rounded">
                    <h3 className="font-semibold text-gray-800 mb-2">PDF Fields Generated</h3>
                    <p className="text-sm text-gray-600">
                      {Object.keys(pdfFields).length} fields ready for PDF filling
                    </p>
                    <details className="mt-2">
                      <summary className="text-sm text-blue-600 cursor-pointer">View field mapping</summary>
                      <div className="mt-2 max-h-32 overflow-y-auto text-xs font-mono bg-white p-2 rounded border">
                        {Object.entries(pdfFields).slice(0, 20).map(([key, value]) => (
                          <div key={key} className="flex justify-between">
                            <span className="text-gray-600">{key}:</span>
                            <span className="text-gray-800">{String(value)}</span>
                          </div>
                        ))}
                        {Object.keys(pdfFields).length > 20 && (
                          <div className="text-gray-500">... and {Object.keys(pdfFields).length - 20} more fields</div>
                        )}
                      </div>
                    </details>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-gray-500 text-center py-8">
                Load character data to see preview
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CharacterSheetFiller;
