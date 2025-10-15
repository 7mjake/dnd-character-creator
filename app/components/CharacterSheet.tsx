import React from 'react';
import sampleCharactersData from '../data/sampleCharacters.json';

interface CharacterData {
  // Basic Info
  name: string;
  class: string;
  level: number;
  background: string;
  player_name: string;
  race: string;
  
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


// Single Character Sheet Component
const SingleCharacterSheet: React.FC<{ character: CharacterData }> = ({ character }) => {
  const abilityScores = [
    { name: 'Strength', key: 'strength', short: 'STR' },
    { name: 'Dexterity', key: 'dexterity', short: 'DEX' },
    { name: 'Constitution', key: 'constitution', short: 'CON' },
    { name: 'Intelligence', key: 'intelligence', short: 'INT' },
    { name: 'Wisdom', key: 'wisdom', short: 'WIS' },
    { name: 'Charisma', key: 'charisma', short: 'CHA' },
  ];

  // Skill definitions with display names and ability mappings
  const skillDefinitions = [
    { key: 'acrobatics', name: 'Acrobatics', ability: 'dexterity' },
    { key: 'animal_handling', name: 'Animal Handling', ability: 'wisdom' },
    { key: 'arcana', name: 'Arcana', ability: 'intelligence' },
    { key: 'athletics', name: 'Athletics', ability: 'strength' },
    { key: 'deception', name: 'Deception', ability: 'charisma' },
    { key: 'history', name: 'History', ability: 'intelligence' },
    { key: 'insight', name: 'Insight', ability: 'wisdom' },
    { key: 'intimidation', name: 'Intimidation', ability: 'charisma' },
    { key: 'investigation', name: 'Investigation', ability: 'intelligence' },
    { key: 'medicine', name: 'Medicine', ability: 'wisdom' },
    { key: 'nature', name: 'Nature', ability: 'intelligence' },
    { key: 'perception', name: 'Perception', ability: 'wisdom' },
    { key: 'performance', name: 'Performance', ability: 'charisma' },
    { key: 'persuasion', name: 'Persuasion', ability: 'charisma' },
    { key: 'religion', name: 'Religion', ability: 'intelligence' },
    { key: 'sleight_of_hand', name: 'Sleight of Hand', ability: 'dexterity' },
    { key: 'stealth', name: 'Stealth', ability: 'dexterity' },
    { key: 'survival', name: 'Survival', ability: 'wisdom' },
  ];

  // Calculate ability modifier
  const getAbilityModifier = (score: number): number => {
    return Math.floor((score - 10) / 2);
  };

  // Calculate proficiency bonus based on level
  const getProficiencyBonus = (level: number): number => {
    return Math.ceil(level / 4) + 1;
  };

  // Calculate skill modifier
  const getSkillModifier = (skillKey: string): number => {
    const skillDef = skillDefinitions.find(s => s.key === skillKey);
    if (!skillDef) return 0;
    
    const abilityScore = character.ability_scores[skillDef.ability as keyof typeof character.ability_scores];
    const baseModifier = getAbilityModifier(abilityScore);
    const proficiencyBonus = character.proficient_skills.includes(skillKey) ? getProficiencyBonus(character.level) : 0;
    return baseModifier + proficiencyBonus;
  };

  // Calculate saving throw modifier
  const getSavingThrowModifier = (abilityName: string): number => {
    const abilityKey = abilityScores.find(a => a.name === abilityName)?.key;
    if (!abilityKey) return 0;
    
    const abilityScore = character.ability_scores[abilityKey as keyof typeof character.ability_scores];
    const baseModifier = getAbilityModifier(abilityScore);
    const proficiencyBonus = character.proficient_saving_throws.includes(abilityKey) ? getProficiencyBonus(character.level) : 0;
    return baseModifier + proficiencyBonus;
  };

  return (
    <div className="max-w-6xl mx-auto p-6 bg-white shadow-lg rounded-lg">
      <h2 className="text-2xl font-bold text-center mb-6 text-gray-800">
        {character.name} - Level {character.level} {character.class}
      </h2>
      
      {/* Basic Information */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6 p-4 border-2 border-gray-300 rounded">
        <div>
          <label className="block text-sm font-medium text-gray-700">Character Name</label>
          <div className="w-full p-2 bg-gray-50 border border-gray-300 text-gray-900 rounded">
            {character.name}
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Class & Level</label>
          <div className="flex gap-2">
            <div className="flex-1 p-2 bg-gray-50 border border-gray-300 text-gray-900 rounded">
              {character.class}
            </div>
            <div className="w-16 p-2 bg-gray-50 border border-gray-300 text-gray-900 rounded text-center">
              {character.level}
            </div>
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Background</label>
          <div className="w-full p-2 bg-gray-50 border border-gray-300 text-gray-900 rounded">
            {character.background}
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Player Name</label>
          <div className="w-full p-2 bg-gray-50 border border-gray-300 text-gray-900 rounded">
            {character.player_name}
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Race</label>
          <div className="w-full p-2 bg-gray-50 border border-gray-300 text-gray-900 rounded">
            {character.race}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Ability Scores */}
        <div className="space-y-6">
          {/* Ability Scores */}
          <div className="p-4 border-2 border-gray-300 text-gray-900 rounded">
            <h2 className="text-xl font-bold mb-4 text-gray-800">Ability Scores</h2>
            <div className="space-y-3">
              {abilityScores.map((ability) => {
                const score = character.ability_scores[ability.key as keyof typeof character.ability_scores];
                const modifier = getAbilityModifier(score);
                return (
                  <div key={ability.key} className="flex items-center gap-3">
                    <div className="w-20 text-sm font-medium text-gray-700">{ability.short}</div>
                    <div className="flex flex-col items-center">
                      <div className="w-12 p-1 text-center bg-gray-50 border border-gray-300 text-gray-900 rounded">
                        {score}
                      </div>
                      <div className="text-xs text-gray-600 mt-1">
                        {modifier >= 0 ? '+' : ''}{modifier}
                      </div>
                    </div>
                    <div className="flex-1 text-sm text-gray-700">{ability.name}</div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Saving Throws */}
          <div className="p-4 border-2 border-gray-300 text-gray-900 rounded">
            <h2 className="text-xl font-bold mb-4 text-gray-800">Saving Throws</h2>
            <div className="space-y-2">
              {abilityScores.map((ability) => {
                const isProficient = character.proficient_saving_throws.includes(ability.key);
                const modifier = getSavingThrowModifier(ability.name);
                return (
                  <div key={ability.name} className="flex items-center gap-2">
                    <div className="w-4 h-4 flex items-center justify-center">
                      {isProficient ? '✓' : '○'}
                    </div>
                    <div className="w-16 text-sm text-gray-700">
                      {modifier >= 0 ? '+' : ''}{modifier}
                    </div>
                    <div className="flex-1 text-sm text-gray-700">{ability.name}</div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Skills */}
          <div className="p-4 border-2 border-gray-300 text-gray-900 rounded">
            <h2 className="text-xl font-bold mb-4 text-gray-800">Skills</h2>
            <div className="space-y-1">
              {skillDefinitions.map((skillDef) => {
                const isProficient = character.proficient_skills.includes(skillDef.key);
                const modifier = getSkillModifier(skillDef.key);
                return (
                  <div key={skillDef.key} className="flex items-center gap-2">
                    <div className="w-4 h-4 flex items-center justify-center">
                      {isProficient ? '✓' : '○'}
                    </div>
                    <div className="w-16 text-sm text-gray-700">
                      {modifier >= 0 ? '+' : ''}{modifier}
                    </div>
                    <div className="flex-1 text-sm text-gray-700">{skillDef.name}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Middle Column - Combat Stats */}
        <div className="space-y-6">
          {/* Combat Stats */}
          <div className="p-4 border-2 border-gray-300 text-gray-900 rounded">
            <h2 className="text-xl font-bold mb-4 text-gray-800">Combat Statistics</h2>
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <label className="w-20 text-sm font-medium text-gray-700">AC</label>
                <div className="w-16 p-2 bg-gray-50 border border-gray-300 text-gray-900 rounded text-center">
                  {character.combat_stats.armor_class}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <label className="w-20 text-sm font-medium text-gray-700">Initiative</label>
                <div className="w-16 p-2 bg-gray-50 border border-gray-300 text-gray-900 rounded text-center">
                  {character.combat_stats.initiative}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <label className="w-20 text-sm font-medium text-gray-700">Speed</label>
                <div className="w-16 p-2 bg-gray-50 border border-gray-300 text-gray-900 rounded text-center">
                  {character.combat_stats.speed}
                </div>
              </div>
            </div>
          </div>

          {/* Hit Points */}
          <div className="p-4 border-2 border-gray-300 text-gray-900 rounded">
            <h2 className="text-xl font-bold mb-4 text-gray-800">Hit Points</h2>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <label className="w-20 text-sm font-medium text-gray-700">Current</label>
                <div className="w-16 p-2 bg-gray-50 border border-gray-300 text-gray-900 rounded text-center">
                  {character.hit_points.current}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <label className="w-20 text-sm font-medium text-gray-700">Maximum</label>
                <div className="w-16 p-2 bg-gray-50 border border-gray-300 text-gray-900 rounded text-center">
                  {character.hit_points.maximum}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <label className="w-20 text-sm font-medium text-gray-700">Temporary</label>
                <div className="w-16 p-2 bg-gray-50 border border-gray-300 text-gray-900 rounded text-center">
                  {character.hit_points.temporary}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <label className="w-20 text-sm font-medium text-gray-700">Hit Dice</label>
                <div className="w-20 p-2 bg-gray-50 border border-gray-300 text-gray-900 rounded text-center">
                  {character.hit_dice.remaining}/{character.hit_dice.total}{character.hit_dice.die}
                </div>
              </div>
            </div>
          </div>

          {/* Death Saves */}
          <div className="p-4 border-2 border-gray-300 text-gray-900 rounded">
            <h2 className="text-xl font-bold mb-4 text-gray-800">Death Saves</h2>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <label className="w-20 text-sm font-medium text-gray-700">Successes</label>
                <div className="flex gap-1">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="w-4 h-4 flex items-center justify-center">
                      {character.death_saves.successes >= i ? '✓' : '○'}
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <label className="w-20 text-sm font-medium text-gray-700">Failures</label>
                <div className="flex gap-1">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="w-4 h-4 flex items-center justify-center">
                      {character.death_saves.failures >= i ? '✗' : '○'}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column - Features, Traits, Equipment */}
        <div className="space-y-6">
          {/* Features & Traits */}
          <div className="p-4 border-2 border-gray-300 text-gray-900 rounded">
            <h2 className="text-xl font-bold mb-4 text-gray-800">Features & Traits</h2>
            <div className="space-y-4">
              <div>
                <h3 className="font-medium text-gray-700 mb-2">Features</h3>
                <div className="space-y-2">
                  {character.features.map((feature, index) => (
                    <div key={index} className="p-2 text-sm bg-gray-50 border border-gray-300 text-gray-900 rounded">
                      <div className="font-medium">{feature.name}</div>
                      <div className="text-gray-600">{feature.description}</div>
                      {feature.uses && (
                        <div className="text-xs text-gray-500 mt-1">
                          Uses: {feature.uses.remaining}/{feature.uses.max} (refreshes on {feature.uses.refresh.replace('_', ' ')})
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
              
              <div>
                <h3 className="font-medium text-gray-700 mb-2">Traits</h3>
                <div className="space-y-2">
                  {character.traits.map((trait, index) => (
                    <div key={index} className="p-2 text-sm bg-gray-50 border border-gray-300 text-gray-900 rounded">
                      {trait}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Equipment */}
          <div className="p-4 border-2 border-gray-300 text-gray-900 rounded">
            <h2 className="text-xl font-bold mb-4 text-gray-800">Equipment</h2>
            <div className="space-y-2">
              {character.equipment.map((item, index) => (
                <div key={index} className="p-2 text-sm bg-gray-50 border border-gray-300 text-gray-900 rounded">
                  {item}
                </div>
              ))}
            </div>
          </div>

          {/* Spell Slots (if applicable) */}
          {character.spellcasting && (
            <div className="p-4 border-2 border-gray-300 text-gray-900 rounded">
              <h2 className="text-xl font-bold mb-4 text-gray-800">Spell Slots</h2>
              <div className="space-y-2">
                {Object.entries(character.spellcasting.spell_slots).map(([level, slots]) => (
                  <div key={level} className="flex items-center gap-3">
                    <label className="w-12 text-sm font-medium text-gray-700">{level}</label>
                    <div className="w-12 p-1 text-center bg-gray-50 border border-gray-300 text-gray-900 rounded">
                      {slots.used}
                    </div>
                    <span className="text-sm text-gray-600">/ {slots.total}</span>
                  </div>
                ))}
              </div>
              
              {/* Spell Save DC and Attack Bonus */}
              {(character.spellcasting.spell_save_dc || character.spellcasting.spell_attack_bonus) && (
                <div className="mt-4 pt-4 border-t border-gray-300">
                  <div className="space-y-2">
                    {character.spellcasting.spell_save_dc && (
                      <div className="flex items-center gap-3">
                        <label className="w-20 text-sm font-medium text-gray-700">Spell Save DC</label>
                        <div className="w-12 p-1 text-center bg-gray-50 border border-gray-300 text-gray-900 rounded">
                          {character.spellcasting.spell_save_dc}
                        </div>
                      </div>
                    )}
                    {character.spellcasting.spell_attack_bonus && (
                      <div className="flex items-center gap-3">
                        <label className="w-20 text-sm font-medium text-gray-700">Spell Attack</label>
                        <div className="w-12 p-1 text-center bg-gray-50 border border-gray-300 text-gray-900 rounded">
                          {character.spellcasting.spell_attack_bonus >= 0 ? '+' : ''}{character.spellcasting.spell_attack_bonus}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
              
              {/* Known Spells */}
              {character.spellcasting.spells_known && character.spellcasting.spells_known.length > 0 && (
                <div className="mt-4 pt-4 border-t border-gray-300">
                  <h3 className="font-medium text-gray-700 mb-2">Known Spells</h3>
                  <div className="space-y-1">
                    {character.spellcasting.spells_known.map((spell, index) => (
                      <div key={index} className="flex items-center gap-2 text-sm">
                        <div className="w-4 h-4 flex items-center justify-center">
                          {spell.prepared ? '✓' : '○'}
                        </div>
                        <div className="flex-1">
                          <span className="font-medium">{spell.name}</span>
                          <span className="text-gray-600 ml-2">
                            ({spell.level === 0 ? 'Cantrip' : `Level ${spell.level}`} {spell.school})
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

// Main Component that renders all character sheets
const CharacterSheet: React.FC = () => {
  const characters = sampleCharactersData as CharacterData[];

  return (
    <div className="min-h-screen bg-gray-100 py-8">
      <div className="max-w-7xl mx-auto px-4">
        <h1 className="text-4xl font-bold text-center mb-12 text-gray-800">D&D 5e Character Sheets</h1>
        <div className="space-y-12">
          {characters.map((character, index) => (
            <SingleCharacterSheet key={index} character={character} />
          ))}
        </div>
      </div>
    </div>
  );
};

export default CharacterSheet;
