'use client';

import React, { useState, useRef, useEffect } from 'react';
import { InputModel, toPdfFields } from '../pdf-filler/field_map';
import { fillCharacterSheetPdf, validateCharacterData } from '../pdf-filler/pdfFiller';


const CharacterSheetFiller: React.FC = () => {
  const [jsonInput, setJsonInput] = useState('');
  const [characterData, setCharacterData] = useState<InputModel | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [pdfFields, setPdfFields] = useState<Record<string, any> | null>(null);
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

  const validateAndParseJson = (jsonString: string): InputModel | null => {
    try {
      const parsed = JSON.parse(jsonString);
      const validation = validateCharacterData(parsed);
      
      if (!validation.valid) {
        setError(validation.error || 'Invalid character data');
        return null;
      }
      
      return parsed as InputModel;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid JSON format');
      return null;
    }
  };

  const handleJsonInput = (value: string) => {
    setJsonInput(value);
    setError(null);
    setCharacterData(null);
    setPdfFields(null);
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
      setCharacterData(parsed);
      setError(null);
      
      // Generate PDF fields for preview
      const fields = toPdfFields(parsed);
      setPdfFields(fields);
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
          setCharacterData(parsed);
          const fields = toPdfFields(parsed);
          setPdfFields(fields);
        }
      };
      reader.readAsText(file);
    }
  };


  const fillPDFForm = async (action: 'download' | 'open' = 'download') => {
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
            
            <div className="mb-4">
              <label htmlFor="json-input" className="block text-sm font-medium text-gray-700 mb-2">
                Paste your character JSON data here:
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
                  Download All Sample Characters
                </a>
              </div>
              <p className="text-xs text-green-600 mt-2">
                Download the complete sample data file with all 3 characters as a template.
              </p>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
                {error}
              </div>
            )}

            {characterData && (
              <div className="mb-4 p-3 bg-green-100 border border-green-400 text-green-700 rounded">
                ✓ Character data loaded successfully: {characterData.identity.name} (Level {characterData.identity.level} {characterData.identity.class})
              </div>
            )}

            <div className="mt-6 space-y-3">
              <button
                onClick={() => fillPDFForm('download')}
                disabled={!characterData || isLoading}
                className="w-full px-6 py-3 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed font-semibold"
              >
                {isLoading ? 'Generating PDF...' : '📥 Download PDF'}
              </button>
              
              <button
                onClick={() => fillPDFForm('open')}
                disabled={!characterData || isLoading}
                className="w-full px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed font-semibold"
              >
                {isLoading ? 'Generating PDF...' : '🔗 Open PDF in New Tab'}
              </button>
            </div>
          </div>

          {/* Preview Section */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-2xl font-bold mb-4 text-gray-800">Character Preview</h2>
            
            {characterData ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h3 className="font-semibold text-gray-800">Basic Info</h3>
                    <div className="text-sm text-gray-600 space-y-1">
                      <p><strong>Name:</strong> {characterData.identity.name}</p>
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
                    <p><strong>Initiative:</strong> {Math.floor((characterData.abilities.dex - 10) / 2) + (characterData.combat.initiative_misc ?? 0)}</p>
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
