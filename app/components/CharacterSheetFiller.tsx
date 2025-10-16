'use client';

import React, { useState, useRef } from 'react';
import { PDFDocument, StandardFonts, PDFName, PDFString } from 'pdf-lib';
import { InputModel, toPdfFields } from '../pdf-filler/field_map';

// Field styling configuration with default text sizes
const FIELD_STYLES: Record<string, { size: number; align: number }> = {
  // Character identity - larger text for important info
  'character_name': { size: 14, align: 0 }, // left-aligned, 14pt
  'class_and_level': { size: 12, align: 0 }, // left-aligned, 12pt
  'race': { size: 12, align: 0 }, // left-aligned, 12pt
  'background': { size: 12, align: 0 }, // left-aligned, 12pt
  'alignment': { size: 12, align: 0 }, // left-aligned, 12pt
  
  // Physical characteristics - smaller text
  'age': { size: 10, align: 0 }, // left-aligned, 10pt
  'height': { size: 10, align: 0 }, // left-aligned, 10pt
  'weight': { size: 10, align: 0 }, // left-aligned, 10pt
  'eyes': { size: 10, align: 0 }, // left-aligned, 10pt
  'skin': { size: 10, align: 0 }, // left-aligned, 10pt
  'hair': { size: 10, align: 0 }, // left-aligned, 10pt
  
  // Ability scores - center-aligned, standard size
  'strength': { size: 12, align: 1 }, // center-aligned, 12pt
  'dexterity': { size: 12, align: 1 }, // center-aligned, 12pt
  'constitution': { size: 12, align: 1 }, // center-aligned, 12pt
  'intelligence': { size: 12, align: 1 }, // center-aligned, 12pt
  'wisdom': { size: 12, align: 1 }, // center-aligned, 12pt
  'charisma': { size: 12, align: 1 }, // center-aligned, 12pt
  
  // Ability modifiers - center-aligned, standard size
  'strength_mod': { size: 12, align: 1 }, // center-aligned, 12pt
  'dexterity_mod': { size: 12, align: 1 }, // center-aligned, 12pt
  'constitution_mod': { size: 12, align: 1 }, // center-aligned, 12pt
  'intelligence_mod': { size: 12, align: 1 }, // center-aligned, 12pt
  'wisdom_mod': { size: 12, align: 1 }, // center-aligned, 12pt
  'charisma_mod': { size: 12, align: 1 }, // center-aligned, 12pt
  
  // Saving throws - center-aligned, standard size
  'save_strength': { size: 12, align: 1 }, // center-aligned, 12pt
  'save_dexterity': { size: 12, align: 1 }, // center-aligned, 12pt
  'save_constitution': { size: 12, align: 1 }, // center-aligned, 12pt
  'save_intelligence': { size: 12, align: 1 }, // center-aligned, 12pt
  'save_wisdom': { size: 12, align: 1 }, // center-aligned, 12pt
  'save_charisma': { size: 12, align: 1 }, // center-aligned, 12pt
  
  // Skills - smaller text for compact display
  'skill_acrobatics': { size: 10, align: 1 }, // center-aligned, 10pt
  'skill_animal_handling': { size: 10, align: 1 }, // center-aligned, 10pt
  'skill_arcana': { size: 10, align: 1 }, // center-aligned, 10pt
  'skill_athletics': { size: 10, align: 1 }, // center-aligned, 10pt
  'skill_deception': { size: 10, align: 1 }, // center-aligned, 10pt
  'skill_history': { size: 10, align: 1 }, // center-aligned, 10pt
  'skill_insight': { size: 10, align: 1 }, // center-aligned, 10pt
  'skill_intimidation': { size: 10, align: 1 }, // center-aligned, 10pt
  'skill_investigation': { size: 10, align: 1 }, // center-aligned, 10pt
  'skill_medicine': { size: 10, align: 1 }, // center-aligned, 10pt
  'skill_nature': { size: 10, align: 1 }, // center-aligned, 10pt
  'skill_perception': { size: 10, align: 1 }, // center-aligned, 10pt
  'skill_performance': { size: 10, align: 1 }, // center-aligned, 10pt
  'skill_persuasion': { size: 10, align: 1 }, // center-aligned, 10pt
  'skill_religion': { size: 10, align: 1 }, // center-aligned, 10pt
  'skill_sleight_of_hand': { size: 10, align: 1 }, // center-aligned, 10pt
  'skill_stealth': { size: 10, align: 1 }, // center-aligned, 10pt
  'skill_survival': { size: 10, align: 1 }, // center-aligned, 10pt
  
  // Combat stats - center-aligned, standard size
  'proficiency_bonus': { size: 12, align: 1 }, // center-aligned, 12pt
  'passive_perception': { size: 12, align: 1 }, // center-aligned, 12pt
  'armor_class': { size: 12, align: 1 }, // center-aligned, 12pt
  'initiative': { size: 12, align: 1 }, // center-aligned, 12pt
  'speed': { size: 12, align: 1 }, // center-aligned, 12pt
  'hit_points_max': { size: 12, align: 1 }, // center-aligned, 12pt
  'hit_dice_total': { size: 12, align: 1 }, // center-aligned, 12pt
  
  // Weapons - smaller text for compact display
  'weapon1_name': { size: 10, align: 0 }, // left-aligned, 10pt
  'weapon1_attack_bonus': { size: 10, align: 1 }, // center-aligned, 10pt
  'weapon1_damage': { size: 10, align: 0 }, // left-aligned, 10pt
  'weapon2_name': { size: 10, align: 0 }, // left-aligned, 10pt
  'weapon2_attack_bonus': { size: 10, align: 1 }, // center-aligned, 10pt
  'weapon2_damage': { size: 10, align: 0 }, // left-aligned, 10pt
  'weapon3_name': { size: 10, align: 0 }, // left-aligned, 10pt
  'weapon3_attack_bonus': { size: 10, align: 1 }, // center-aligned, 10pt
  'weapon3_damage': { size: 10, align: 0 }, // left-aligned, 10pt
  
  // Spellcasting - smaller text for compact display
  'spellcasting_class': { size: 10, align: 0 }, // left-aligned, 10pt
  'spellcasting_ability': { size: 10, align: 0 }, // left-aligned, 10pt
  'spell_save_dc': { size: 10, align: 1 }, // center-aligned, 10pt
  'spell_attack_bonus': { size: 10, align: 1 }, // center-aligned, 10pt
  
  // Cantrips and spells - smaller text
  'cantrip_1': { size: 9, align: 0 }, // left-aligned, 9pt
  'cantrip_2': { size: 9, align: 0 }, // left-aligned, 9pt
  'cantrip_3': { size: 9, align: 0 }, // left-aligned, 9pt
  'cantrip_4': { size: 9, align: 0 }, // left-aligned, 9pt
  'cantrip_5': { size: 9, align: 0 }, // left-aligned, 9pt
  'cantrip_6': { size: 9, align: 0 }, // left-aligned, 9pt
  'cantrip_7': { size: 9, align: 0 }, // left-aligned, 9pt
  'cantrip_8': { size: 9, align: 0 }, // left-aligned, 9pt
  
  // Equipment and inventory - smaller text for long content
  'equipment': { size: 9, align: 0 }, // left-aligned, 9pt
  
  // Currency - center-aligned, small text
  'currency_cp': { size: 10, align: 1 }, // center-aligned, 10pt
  'currency_sp': { size: 10, align: 1 }, // center-aligned, 10pt
  'currency_ep': { size: 10, align: 1 }, // center-aligned, 10pt
  'currency_gp': { size: 10, align: 1 }, // center-aligned, 10pt
  'currency_pp': { size: 10, align: 1 }, // center-aligned, 10pt
  
  // Roleplay fields - smaller text for long content
  'personality_traits': { size: 9, align: 0 }, // left-aligned, 9pt
  'ideals': { size: 9, align: 0 }, // left-aligned, 9pt
  'bonds': { size: 9, align: 0 }, // left-aligned, 9pt
  'flaws': { size: 9, align: 0 }, // left-aligned, 9pt
  'feats_and_traits': { size: 9, align: 0 }, // left-aligned, 9pt
  'features_and_traits': { size: 9, align: 0 }, // left-aligned, 9pt
  'proficiencies_and_languages': { size: 9, align: 0 }, // left-aligned, 9pt
  'allies': { size: 9, align: 0 }, // left-aligned, 9pt
  'faction_name': { size: 10, align: 0 }, // left-aligned, 10pt
  'backstory': { size: 9, align: 0 }, // left-aligned, 9pt
  'treasure': { size: 9, align: 0 }, // left-aligned, 9pt
};

const CharacterSheetFiller: React.FC = () => {
  const [jsonInput, setJsonInput] = useState('');
  const [characterData, setCharacterData] = useState<InputModel | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [pdfFields, setPdfFields] = useState<Record<string, any> | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateAndParseJson = (jsonString: string): InputModel | null => {
    try {
      const parsed = JSON.parse(jsonString);
      
      // Basic validation for required fields
      if (!parsed.identity?.name || !parsed.identity?.class || !parsed.abilities) {
        throw new Error('Invalid character data: missing required fields (identity.name, identity.class, abilities)');
      }
      
      // Validate abilities object
      const requiredAbilities = ['str', 'dex', 'con', 'int', 'wis', 'cha'];
      for (const ability of requiredAbilities) {
        if (typeof parsed.abilities[ability] !== 'number') {
          throw new Error(`Invalid character data: missing or invalid ability score for ${ability}`);
        }
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

  const handleLoadSample = () => {
    const sampleData: InputModel = {
      identity: {
        name: "Thorin Ironbeard",
        class: "Fighter",
        level: 3,
        race: "Dwarf",
        background: "Soldier",
        alignment: "Lawful Good",
        age: 45,
        height: "4'8\"",
        weight: "180 lbs",
        eyes: "Brown",
        skin: "Pale",
        hair: "Black"
      },
      abilities: {
        str: 16,
        dex: 12,
        con: 15,
        int: 10,
        wis: 13,
        cha: 11
      },
      proficiencies: {
        saves: ["str", "con"],
        skills: ["athletics", "intimidation", "survival"]
      },
      combat: {
        armor_base_ac: 18,
        initiative_misc: 1,
        speed_ft: 25,
        weapons: [
          {
            name: "Longsword",
            ability: "str",
            bonus_misc: 0,
            damage: "1d8+3 slashing"
          },
          {
            name: "Handaxe",
            ability: "str",
            bonus_misc: 0,
            damage: "1d6+3 slashing"
          }
        ]
      },
      spellcasting: undefined, // Fighter doesn't have spellcasting
      inventory: {
        equipment_text: "Chain Mail, Shield, Longsword, Handaxe (2), Dungeoneer's Pack, Insignia of Rank, Set of Bone Dice, Common Clothes",
        currency: { cp: 0, sp: 0, ep: 0, gp: 10, pp: 0 }
      },
      roleplay: {
        personality_traits: "I can stare down a hell hound without flinching. I enjoy being strong and like breaking things.",
        ideals: "I face problems head-on. A simple, direct solution is the best path to success.",
        bonds: "I would still lay down my life for the people I served with.",
        flaws: "I have little respect for anyone who is not a proven warrior.",
        feats_and_traits: "Dwarven Resilience, Stonecunning, Fighting Style: Defense, Second Wind",
        features_and_traits: "Dwarven Resilience: Advantage on saves vs poison. Stonecunning: Double proficiency on History checks related to stonework.",
        proficiencies_and_languages: "Common, Dwarvish, Smith's Tools, Mason's Tools",
        allies: "The Ironbeard Clan, The Stoneguard Regiment",
        faction_name: "The Stoneguard",
        faction_symbol_image: null,
        backstory: "A veteran soldier who served in the Stoneguard Regiment, defending the mountain passes from orc raids.",
        treasure: "A family heirloom warhammer passed down through generations.",
        character_image: null
      }
    };
    
    setJsonInput(JSON.stringify(sampleData, null, 2));
    setCharacterData(sampleData);
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

  // Function to apply field styling
  const applyFieldStyling = async (pdfDoc: PDFDocument, form: any) => {
    try {
      // Embed Helvetica font for styling
      const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
      
      let styledFields = 0;
      
      // Apply styling to each field that has a style configuration
      for (const [fieldName, style] of Object.entries(FIELD_STYLES)) {
        try {
          const field = form.getTextField(fieldName);
          if (field) {
            // Set text alignment (Q = quadding/justification)
            // 0 = left, 1 = center, 2 = right
            field.acroField.dict.set(PDFName.of('Q'), pdfDoc.context.obj(style.align));
            
            // Set default appearance with custom font size
            // Format: /FontName Size Tf Color
            // /Helv = Helvetica, Size = font size, Tf = text font, 0 g = black color
            field.acroField.dict.set(PDFName.of('DA'), PDFString.of(`/Helv ${style.size} Tf 0 g`));
            
            // Rebuild the field's appearance with our embedded font
            field.updateAppearances(helveticaFont);
            
            styledFields++;
          }
        } catch (e) {
          // Field doesn't exist or can't be styled, continue
          console.log(`Could not style field ${fieldName}:`, e);
        }
      }
      
      console.log(`Successfully styled ${styledFields} fields out of ${Object.keys(FIELD_STYLES).length} configured styles`);
      
    } catch (err) {
      console.error('Error applying field styling:', err);
    }
  };

  const fillPDFForm = async () => {
    if (!characterData || !pdfFields) {
      setError('No character data loaded');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Load the existing D&D 5E Character Sheet PDF
      const response = await fetch('/charSheet.pdf');
      if (!response.ok) {
        throw new Error('Failed to load PDF template');
      }
      const existingPdfBytes = await response.arrayBuffer();
      
      // Load the PDF document
      const pdfDoc = await PDFDocument.load(existingPdfBytes);
      const form = pdfDoc.getForm();
      
      // Get all form fields to see what's available
      const fieldNames = form.getFields().map(field => field.getName());
      console.log('Available PDF fields:', fieldNames);
      
      // Fill form fields using the mapped field names
      let fieldsFilled = 0;
      for (const [fieldName, value] of Object.entries(pdfFields)) {
        try {
          const field = form.getField(fieldName);
          if (field) {
            // Handle different field types
            if ('setText' in field) {
              (field as any).setText(String(value));
              fieldsFilled++;
            } else if ('setValue' in field) {
              (field as any).setValue(value);
              fieldsFilled++;
            } else if ('check' in field && typeof value === 'boolean') {
              if (value) {
                (field as any).check();
              } else {
                (field as any).uncheck();
              }
              fieldsFilled++;
            }
          }
        } catch (e) {
          // Field doesn't exist or can't be set, continue
          console.log(`Could not set field ${fieldName}:`, e);
        }
      }
      
      console.log(`Successfully filled ${fieldsFilled} fields out of ${Object.keys(pdfFields).length} available fields`);

      // Apply field styling after filling the fields
      await applyFieldStyling(pdfDoc, form);

      // Generate PDF bytes
      const pdfBytes = await pdfDoc.save();

      // Create download link
      const blob = new Blob([new Uint8Array(pdfBytes)], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${characterData.identity.name.replace(/\s+/g, '_')}_Character_Sheet.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

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
                onClick={handleLoadSample}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm"
              >
                Load Sample Fighter
              </button>
              
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

            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
              <h3 className="font-semibold text-blue-800 mb-2">Sample Character Files</h3>
              <div className="flex flex-wrap gap-2">
                <a
                  href="/sample-character.json"
                  download
                  className="px-3 py-1 bg-blue-100 text-blue-700 rounded text-sm hover:bg-blue-200 transition-colors"
                >
                  Download Fighter Sample
                </a>
                <a
                  href="/sample-wizard.json"
                  download
                  className="px-3 py-1 bg-blue-100 text-blue-700 rounded text-sm hover:bg-blue-200 transition-colors"
                >
                  Download Wizard Sample
                </a>
              </div>
              <p className="text-xs text-blue-600 mt-2">
                Use these sample files as templates for your character data structure.
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

            <div className="mt-6">
              <button
                onClick={fillPDFForm}
                disabled={!characterData || isLoading}
                className="w-full px-6 py-3 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed font-semibold"
              >
                {isLoading ? 'Generating PDF...' : 'Generate & Download PDF'}
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
