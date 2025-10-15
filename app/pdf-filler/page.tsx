'use client';

import React, { useState, useRef } from 'react';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

interface CharacterData {
  // Basic Info
  name: string;
  class: string;
  level: number;
  background: string;
  player_name: string;
  race: string;
  alignment?: string;
  
  // Ability Scores
  ability_scores: {
    strength: number;
    dexterity: number;
    constitution: number;
    intelligence: number;
    wisdom: number;
    charisma: number;
  };
  
  // Combat Stats
  combat_stats: {
    armor_class: number;
    initiative: number;
    speed: number;
  };
  
  // Hit Points
  hit_points: {
    current: number;
    maximum: number;
    temporary: number;
  };
  
  // Hit Dice
  hit_dice: {
    die: string;
    total: number;
    remaining: number;
  };
  
  // Death Saves
  death_saves: {
    successes: number;
    failures: number;
  };
  
  // Proficiency Arrays
  proficient_skills: string[];
  proficient_saving_throws: string[];
  
  // Equipment
  equipment: string[];
  
  // Features & Traits
  features: Array<{
    name: string;
    description: string;
    uses?: {
      max: number;
      remaining: number;
      refresh: "short_rest" | "long_rest";
    };
  }>;
  traits: string[];
  
  // Optional spellcasting data
  spellcasting?: {
    spell_slots: {
      [level: string]: {
        total: number;
        used: number;
      };
    };
    spells_known?: Array<{
      name: string;
      level: number;
      school: string;
      prepared?: boolean;
    }>;
    spell_save_dc?: number;
    spell_attack_bonus?: number;
  };
}

const PDFFillerPage: React.FC = () => {
  const [jsonInput, setJsonInput] = useState('');
  const [characterData, setCharacterData] = useState<CharacterData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const transformNestedToFlat = (nestedData: any): CharacterData => {
    // Handle nested structure (like the sample data)
    if (nestedData.identity && nestedData.abilities) {
      return {
        name: nestedData.identity.name,
        class: nestedData.identity.class,
        level: nestedData.identity.level,
        background: nestedData.identity.background,
        player_name: nestedData.identity.player_name || 'Unknown',
        race: nestedData.identity.race,
        alignment: nestedData.identity.alignment,
        ability_scores: {
          strength: nestedData.abilities.str,
          dexterity: nestedData.abilities.dex,
          constitution: nestedData.abilities.con,
          intelligence: nestedData.abilities.int,
          wisdom: nestedData.abilities.wis,
          charisma: nestedData.abilities.cha,
        },
        combat_stats: {
          armor_class: nestedData.combat?.armor_base_ac || 10,
          initiative: nestedData.combat?.initiative_misc || 0,
          speed: nestedData.combat?.speed_ft || 30,
        },
        hit_points: {
          current: 20, // Default values - these would need to be calculated or provided
          maximum: 20,
          temporary: 0,
        },
        hit_dice: {
          die: 'd8', // Default - would need to be calculated based on class
          total: nestedData.identity.level,
          remaining: nestedData.identity.level,
        },
        death_saves: {
          successes: 0,
          failures: 0,
        },
        proficient_skills: nestedData.proficiencies?.skills || [],
        proficient_saving_throws: nestedData.proficiencies?.saves || [],
        equipment: nestedData.inventory?.equipment_text?.split(', ') || [],
        features: [],
        traits: [],
      };
    }
    // Return as-is if already flat structure
    return nestedData as CharacterData;
  };

  const validateAndParseJson = (jsonString: string): CharacterData | null => {
    try {
      const parsed = JSON.parse(jsonString);
      
      // Transform nested structure to flat if needed
      const flatData = transformNestedToFlat(parsed);
      
      // Basic validation
      if (!flatData.name || !flatData.class || !flatData.ability_scores) {
        throw new Error('Invalid character data: missing required fields');
      }
      
      return flatData;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid JSON format');
      return null;
    }
  };

  const handleJsonInput = (value: string) => {
    setJsonInput(value);
    setError(null);
    setCharacterData(null);
  };

  const handleLoadSample = () => {
    const sampleData = {
      "name": "Thorin Ironbeard",
      "class": "Fighter",
      "level": 3,
      "background": "Soldier",
      "player_name": "Alex",
      "race": "Dwarf",
      "alignment": "Lawful Good",
      "ability_scores": {
        "strength": 16,
        "dexterity": 12,
        "constitution": 15,
        "intelligence": 10,
        "wisdom": 13,
        "charisma": 11
      },
      "combat_stats": {
        "armor_class": 18,
        "initiative": 1,
        "speed": 25
      },
      "hit_points": {
        "current": 28,
        "maximum": 32,
        "temporary": 0
      },
      "hit_dice": {
        "die": "d10",
        "total": 3,
        "remaining": 3
      },
      "death_saves": {
        "successes": 0,
        "failures": 0
      },
      "proficient_skills": [
        "athletics",
        "intimidation",
        "survival"
      ],
      "proficient_saving_throws": [
        "strength",
        "constitution"
      ],
      "equipment": [
        "Chain Mail",
        "Shield",
        "Longsword",
        "Handaxe (2)",
        "Dungeoneer's Pack",
        "Insignia of Rank",
        "Set of Bone Dice",
        "Common Clothes",
        "10 gp"
      ],
      "features": [
        {
          "name": "Fighting Style: Defense",
          "description": "+1 AC when wearing armor"
        },
        {
          "name": "Second Wind",
          "description": "Bonus action to regain 1d10+3 HP",
          "uses": {
            "max": 1,
            "remaining": 1,
            "refresh": "short_rest"
          }
        }
      ],
      "traits": [
        "I can stare down a hell hound without flinching.",
        "I enjoy being strong and like breaking things.",
        "I face problems head-on. A simple, direct solution is the best path to success."
      ]
    };
    
    setJsonInput(JSON.stringify(sampleData, null, 2));
    setCharacterData(sampleData as CharacterData);
    setError(null);
  };

  const handleParseJson = () => {
    const parsed = validateAndParseJson(jsonInput);
    if (parsed) {
      setCharacterData(parsed);
      setError(null);
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
        }
      };
      reader.readAsText(file);
    }
  };

  const calculateAbilityModifier = (score: number): number => {
    return Math.floor((score - 10) / 2);
  };

  const calculateProficiencyBonus = (level: number): number => {
    return Math.ceil(level / 4) + 1;
  };

  const fillPDFForm = async () => {
    if (!characterData) {
      setError('No character data loaded');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Load the existing D&D 5E Character Sheet PDF
      const response = await fetch('/charSheet.pdf');
      const existingPdfBytes = await response.arrayBuffer();
      
      // Load the PDF document
      const pdfDoc = await PDFDocument.load(existingPdfBytes);
      const form = pdfDoc.getForm();
      
      // Debug: Log all available form field names
      const fieldNames = form.getFields().map(field => field.getName());
      console.log('Available PDF form fields:', fieldNames);
      
      // Get the first page for text positioning (in case we need to add text)
      const pages = pdfDoc.getPages();
      const firstPage = pages[0];
      const { width, height } = firstPage.getSize();
      
      // Try to fill form fields if they exist
      try {
        // Define field mappings based on actual PDF field names
        const fieldMappings = {
          // Ability Scores (these exist in the PDF)
          strength: ['strength'],
          dexterity: ['dexterity'],
          constitution: ['constitution'],
          intelligence: ['intelligence'],
          wisdom: ['wisdom'],
          charisma: ['charisma'],
          
          // Ability Score Modifiers (these exist in the PDF)
          strengthMod: ['strength_mod'],
          dexterityMod: ['dexterity_mod'],
          constitutionMod: ['constitution_mod'],
          intelligenceMod: ['intelligence_mod'],
          wisdomMod: ['wisdom_mod'],
          charismaMod: ['charisma_mod'],
          
          // Combat Stats (these exist in the PDF)
          armorClass: ['armor_class'],
          initiative: ['initiative'],
          speed: ['speed'],
          proficiencyBonus: ['proficiency_bonus'],
          passivePerception: ['passive_perception'],
          
          // Hit Points (partial - only max exists)
          maxHP: ['hit_points_max'],
          
          // Hit Dice (partial - only total exists)
          hitDiceTotal: ['hit_dice_total'],
          
          // Equipment and Currency (these exist in the PDF)
          equipment: ['equipment'],
          currencyCP: ['currency_cp'],
          currencySP: ['currency_sp'],
          currencyEP: ['currency_ep'],
          currencyGP: ['currency_gp'],
          currencyPP: ['currency_pp'],
          
          // Roleplay fields (these exist in the PDF)
          personalityTraits: ['personality_traits'],
          ideals: ['ideals'],
          bonds: ['bonds'],
          flaws: ['flaws'],
          featsAndTraits: ['feats_and_traits'],
          allies: ['allies'],
          factionName: ['faction_name'],
          backstory: ['backstory'],
          treasure: ['treasure'],
          
          // Physical characteristics (these exist in the PDF)
          age: ['age'],
          height: ['height'],
          weight: ['weight'],
          eyes: ['eyes'],
          skin: ['skin'],
          hair: ['hair'],
        };
        
        // Function to try multiple field names
        const setFieldValue = (fieldNames: string[], value: string, debugName: string) => {
          for (const fieldName of fieldNames) {
            try {
              const field = form.getField(fieldName);
              if (field && 'setText' in field) {
                (field as any).setText(value);
                console.log(`✓ Successfully filled field "${fieldName}" for ${debugName} with value: ${value}`);
                return true;
              }
            } catch (e) {
              // Field doesn't exist, try next name
              continue;
            }
          }
          console.log(`✗ Failed to fill ${debugName} - tried field names: ${fieldNames.join(', ')}`);
          return false;
        };
        
        // Fill ability scores (these exist in the PDF)
        setFieldValue(fieldMappings.strength, characterData.ability_scores.strength.toString(), 'strength');
        setFieldValue(fieldMappings.dexterity, characterData.ability_scores.dexterity.toString(), 'dexterity');
        setFieldValue(fieldMappings.constitution, characterData.ability_scores.constitution.toString(), 'constitution');
        setFieldValue(fieldMappings.intelligence, characterData.ability_scores.intelligence.toString(), 'intelligence');
        setFieldValue(fieldMappings.wisdom, characterData.ability_scores.wisdom.toString(), 'wisdom');
        setFieldValue(fieldMappings.charisma, characterData.ability_scores.charisma.toString(), 'charisma');
        
        // Fill ability score modifiers
        const strMod = calculateAbilityModifier(characterData.ability_scores.strength);
        const dexMod = calculateAbilityModifier(characterData.ability_scores.dexterity);
        const conMod = calculateAbilityModifier(characterData.ability_scores.constitution);
        const intMod = calculateAbilityModifier(characterData.ability_scores.intelligence);
        const wisMod = calculateAbilityModifier(characterData.ability_scores.wisdom);
        const chaMod = calculateAbilityModifier(characterData.ability_scores.charisma);
        
        setFieldValue(fieldMappings.strengthMod, strMod.toString(), 'strength modifier');
        setFieldValue(fieldMappings.dexterityMod, dexMod.toString(), 'dexterity modifier');
        setFieldValue(fieldMappings.constitutionMod, conMod.toString(), 'constitution modifier');
        setFieldValue(fieldMappings.intelligenceMod, intMod.toString(), 'intelligence modifier');
        setFieldValue(fieldMappings.wisdomMod, wisMod.toString(), 'wisdom modifier');
        setFieldValue(fieldMappings.charismaMod, chaMod.toString(), 'charisma modifier');
        
        // Fill combat stats
        setFieldValue(fieldMappings.armorClass, characterData.combat_stats.armor_class.toString(), 'armor class');
        setFieldValue(fieldMappings.initiative, characterData.combat_stats.initiative.toString(), 'initiative');
        setFieldValue(fieldMappings.speed, characterData.combat_stats.speed.toString(), 'speed');
        
        // Fill proficiency bonus
        const profBonus = calculateProficiencyBonus(characterData.level);
        setFieldValue(fieldMappings.proficiencyBonus, profBonus.toString(), 'proficiency bonus');
        
        // Fill hit points (only max exists in PDF)
        setFieldValue(fieldMappings.maxHP, characterData.hit_points.maximum.toString(), 'max HP');
        
        // Fill hit dice (only total exists in PDF)
        setFieldValue(fieldMappings.hitDiceTotal, characterData.hit_dice.total.toString(), 'hit dice total');
        
        // Fill equipment
        if (characterData.equipment && characterData.equipment.length > 0) {
          setFieldValue(fieldMappings.equipment, characterData.equipment.join(', '), 'equipment');
        }
        
        // Add basic character information as text (since these fields don't exist in the PDF form)
        const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
        const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
        
        // Define positions for basic character info (these fields don't exist in the PDF form)
        const basicInfoPositions = {
          characterName: { x: 120, y: height - 80 },
          classLevel: { x: 120, y: height - 100 },
          background: { x: 120, y: height - 120 },
          playerName: { x: 120, y: height - 140 },
          race: { x: 120, y: height - 160 },
          alignment: { x: 120, y: height - 180 },
        };
        
        // Add basic character information as text
        firstPage.drawText(characterData.name, {
          x: basicInfoPositions.characterName.x,
          y: basicInfoPositions.characterName.y,
          size: 12,
          font: font,
          color: rgb(0, 0, 0),
        });
        
        firstPage.drawText(`${characterData.class} ${characterData.level}`, {
          x: basicInfoPositions.classLevel.x,
          y: basicInfoPositions.classLevel.y,
          size: 12,
          font: font,
          color: rgb(0, 0, 0),
        });
        
        firstPage.drawText(characterData.background, {
          x: basicInfoPositions.background.x,
          y: basicInfoPositions.background.y,
          size: 12,
          font: font,
          color: rgb(0, 0, 0),
        });
        
        firstPage.drawText(characterData.player_name, {
          x: basicInfoPositions.playerName.x,
          y: basicInfoPositions.playerName.y,
          size: 12,
          font: font,
          color: rgb(0, 0, 0),
        });
        
        firstPage.drawText(characterData.race, {
          x: basicInfoPositions.race.x,
          y: basicInfoPositions.race.y,
          size: 12,
          font: font,
          color: rgb(0, 0, 0),
        });
        
        if (characterData.alignment) {
          firstPage.drawText(characterData.alignment, {
            x: basicInfoPositions.alignment.x,
            y: basicInfoPositions.alignment.y,
            size: 12,
            font: font,
            color: rgb(0, 0, 0),
          });
        }
        
      } catch (formError) {
        console.log('Form fields not found, will add text directly to PDF');
        
        // If form fields don't exist, add text directly to the PDF
        const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
        const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
        
        // Define positions for common D&D 5E character sheet fields
        // These are approximate positions that work for most standard D&D 5E sheets
        const fieldPositions = {
          // Basic Info (top section of sheet) - these fields don't exist in the PDF form, so we'll add them as text
          characterName: { x: 120, y: height - 80 },
          classLevel: { x: 120, y: height - 100 },
          background: { x: 120, y: height - 120 },
          playerName: { x: 120, y: height - 140 },
          race: { x: 120, y: height - 160 },
          alignment: { x: 120, y: height - 180 },
          
          // Ability Scores (left side of sheet, typically in boxes)
          str: { x: 70, y: height - 280 },
          dex: { x: 70, y: height - 320 },
          con: { x: 70, y: height - 360 },
          int: { x: 70, y: height - 400 },
          wis: { x: 70, y: height - 440 },
          cha: { x: 70, y: height - 480 },
          
          // Combat Stats (right side of sheet)
          ac: { x: 350, y: height - 280 },
          initiative: { x: 350, y: height - 320 },
          speed: { x: 350, y: height - 360 },
          
          // Hit Points (right side, below combat stats)
          currentHP: { x: 350, y: height - 420 },
          maxHP: { x: 350, y: height - 460 },
          tempHP: { x: 350, y: height - 500 },
          
          // Hit Dice (right side, below HP)
          hitDice: { x: 350, y: height - 540 },
        };
        
        // Add basic information
        firstPage.drawText(characterData.name, {
          x: fieldPositions.characterName.x,
          y: fieldPositions.characterName.y,
          size: 12,
          font: font,
          color: rgb(0, 0, 0),
        });
        
        firstPage.drawText(`${characterData.class} ${characterData.level}`, {
          x: fieldPositions.classLevel.x,
          y: fieldPositions.classLevel.y,
          size: 12,
          font: font,
          color: rgb(0, 0, 0),
        });
        
        firstPage.drawText(characterData.background, {
          x: fieldPositions.background.x,
          y: fieldPositions.background.y,
          size: 12,
          font: font,
          color: rgb(0, 0, 0),
        });
        
        firstPage.drawText(characterData.player_name, {
          x: fieldPositions.playerName.x,
          y: fieldPositions.playerName.y,
          size: 12,
          font: font,
          color: rgb(0, 0, 0),
        });
        
        firstPage.drawText(characterData.race, {
          x: fieldPositions.race.x,
          y: fieldPositions.race.y,
          size: 12,
          font: font,
          color: rgb(0, 0, 0),
        });
        
        if (characterData.alignment) {
          firstPage.drawText(characterData.alignment, {
            x: fieldPositions.alignment.x,
            y: fieldPositions.alignment.y,
            size: 12,
            font: font,
            color: rgb(0, 0, 0),
          });
        }
        
        // Add ability scores
        firstPage.drawText(characterData.ability_scores.strength.toString(), {
          x: fieldPositions.str.x,
          y: fieldPositions.str.y,
          size: 12,
          font: font,
          color: rgb(0, 0, 0),
        });
        
        firstPage.drawText(characterData.ability_scores.dexterity.toString(), {
          x: fieldPositions.dex.x,
          y: fieldPositions.dex.y,
          size: 12,
          font: font,
          color: rgb(0, 0, 0),
        });
        
        firstPage.drawText(characterData.ability_scores.constitution.toString(), {
          x: fieldPositions.con.x,
          y: fieldPositions.con.y,
          size: 12,
          font: font,
          color: rgb(0, 0, 0),
        });
        
        firstPage.drawText(characterData.ability_scores.intelligence.toString(), {
          x: fieldPositions.int.x,
          y: fieldPositions.int.y,
          size: 12,
          font: font,
          color: rgb(0, 0, 0),
        });
        
        firstPage.drawText(characterData.ability_scores.wisdom.toString(), {
          x: fieldPositions.wis.x,
          y: fieldPositions.wis.y,
          size: 12,
          font: font,
          color: rgb(0, 0, 0),
        });
        
        firstPage.drawText(characterData.ability_scores.charisma.toString(), {
          x: fieldPositions.cha.x,
          y: fieldPositions.cha.y,
          size: 12,
          font: font,
          color: rgb(0, 0, 0),
        });
        
        // Add combat stats
        firstPage.drawText(characterData.combat_stats.armor_class.toString(), {
          x: fieldPositions.ac.x,
          y: fieldPositions.ac.y,
          size: 12,
          font: font,
          color: rgb(0, 0, 0),
        });
        
        firstPage.drawText(characterData.combat_stats.initiative.toString(), {
          x: fieldPositions.initiative.x,
          y: fieldPositions.initiative.y,
          size: 12,
          font: font,
          color: rgb(0, 0, 0),
        });
        
        firstPage.drawText(characterData.combat_stats.speed.toString(), {
          x: fieldPositions.speed.x,
          y: fieldPositions.speed.y,
          size: 12,
          font: font,
          color: rgb(0, 0, 0),
        });
        
        // Add hit points
        firstPage.drawText(characterData.hit_points.current.toString(), {
          x: fieldPositions.currentHP.x,
          y: fieldPositions.currentHP.y,
          size: 12,
          font: font,
          color: rgb(0, 0, 0),
        });
        
        firstPage.drawText(characterData.hit_points.maximum.toString(), {
          x: fieldPositions.maxHP.x,
          y: fieldPositions.maxHP.y,
          size: 12,
          font: font,
          color: rgb(0, 0, 0),
        });
        
        firstPage.drawText(characterData.hit_points.temporary.toString(), {
          x: fieldPositions.tempHP.x,
          y: fieldPositions.tempHP.y,
          size: 12,
          font: font,
          color: rgb(0, 0, 0),
        });
        
        // Add hit dice
        firstPage.drawText(`${characterData.hit_dice.remaining}/${characterData.hit_dice.total}${characterData.hit_dice.die}`, {
          x: fieldPositions.hitDice.x,
          y: fieldPositions.hitDice.y,
          size: 12,
          font: font,
          color: rgb(0, 0, 0),
        });
      }

      // Generate PDF bytes
      const pdfBytes = await pdfDoc.save();

      // Create download link
      const blob = new Blob([new Uint8Array(pdfBytes)], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${characterData.name.replace(/\s+/g, '_')}_Character_Sheet.pdf`;
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
      <div className="max-w-4xl mx-auto px-4">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-4 text-gray-800">
            D&D 5e PDF Character Sheet Generator
          </h1>
          <a 
            href="/"
            className="inline-block px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            ← Back to Character Sheets
          </a>
        </div>
        
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h2 className="text-2xl font-bold mb-4 text-gray-800">Character Data Input</h2>
          
          <div className="mb-4">
            <label htmlFor="json-input" className="block text-sm font-medium text-gray-700 mb-2">
              Paste your character JSON data here:
            </label>
            <textarea
              id="json-input"
              value={jsonInput}
              onChange={(e) => handleJsonInput(e.target.value)}
              className="w-full h-64 p-3 border border-gray-300 rounded-md font-mono text-sm"
              placeholder="Paste your character JSON data here..."
            />
          </div>

          <div className="flex gap-4 mb-4">
            <button
              onClick={handleLoadSample}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              Load Sample Data
            </button>
            
            <button
              onClick={handleParseJson}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
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
              className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors"
            >
              Upload JSON File
            </button>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
              {error}
            </div>
          )}

          {characterData && (
            <div className="mb-4 p-3 bg-green-100 border border-green-400 text-green-700 rounded">
              ✓ Character data loaded successfully: {characterData.name} (Level {characterData.level} {characterData.class})
            </div>
          )}
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-2xl font-bold mb-4 text-gray-800">PDF Generation</h2>
          
          <div className="mb-4">
            <p className="text-gray-600 mb-4">
              Once you have loaded your character data, click the button below to generate and download a PDF character sheet.
            </p>
            
            <button
              onClick={fillPDFForm}
              disabled={!characterData || isLoading}
              className="px-6 py-3 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Generating PDF...' : 'Generate & Download PDF'}
            </button>
          </div>

          {characterData && (
            <div className="mt-6 p-4 bg-gray-50 rounded-md">
              <h3 className="font-bold text-gray-800 mb-2">Character Preview:</h3>
              <div className="text-sm text-gray-600">
                <p><strong>Name:</strong> {characterData.name}</p>
                <p><strong>Class:</strong> {characterData.class} (Level {characterData.level})</p>
                <p><strong>Race:</strong> {characterData.race}</p>
                <p><strong>Background:</strong> {characterData.background}</p>
                <p><strong>Player:</strong> {characterData.player_name}</p>
                <p><strong>AC:</strong> {characterData.combat_stats.armor_class}</p>
                <p><strong>HP:</strong> {characterData.hit_points.current}/{characterData.hit_points.maximum}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PDFFillerPage;
