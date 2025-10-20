'use client';

import React, { useState, useEffect } from 'react';
import { InputModel } from '../pdf-filler/field_map';

interface SpellUsage {
  spell: string;
  count: number;
  characters: string[];
  spellLevel: string;
}

interface SpellStatisticsProps {
  characters: InputModel[];
}

const SpellStatistics: React.FC<SpellStatisticsProps> = ({ characters }) => {
  const [spellUsage, setSpellUsage] = useState<SpellUsage[]>([]);
  const [totalSpellcasters, setTotalSpellcasters] = useState(0);
  const [totalSpells, setTotalSpells] = useState(0);
  const [sortBy, setSortBy] = useState<'count' | 'name' | 'level'>('count');
  const [filterLevel, setFilterLevel] = useState<string>('all');

  useEffect(() => {
    const analyzeSpells = () => {
      const spellMap = new Map<string, { count: number; characters: string[]; spellLevel: string }>();
      let spellcasterCount = 0;
      let totalSpellCount = 0;

      characters.forEach(character => {
        if (character.spellcasting) {
          spellcasterCount++;
          
          // Process cantrips
          if (character.spellcasting.cantrips && character.spellcasting.cantrips.length > 0) {
            character.spellcasting.cantrips.forEach(cantrip => {
              const key = cantrip.toLowerCase();
              if (spellMap.has(key)) {
                const existing = spellMap.get(key)!;
                existing.count++;
                existing.characters.push(`${character.identity.name || 'Unnamed'} (${character.identity.class})`);
              } else {
                spellMap.set(key, {
                  count: 1,
                  characters: [`${character.identity.name || 'Unnamed'} (${character.identity.class})`],
                  spellLevel: 'Cantrip'
                });
                totalSpellCount++;
              }
            });
          }

          // Process spells by level
          if (character.spellcasting.spells_known) {
            Object.entries(character.spellcasting.spells_known).forEach(([level, spells]) => {
              if (Array.isArray(spells)) {
                spells.forEach(spell => {
                  const key = spell.toLowerCase();
                  if (spellMap.has(key)) {
                    const existing = spellMap.get(key)!;
                    existing.count++;
                    existing.characters.push(`${character.identity.name || 'Unnamed'} (${character.identity.class})`);
                  } else {
                    spellMap.set(key, {
                      count: 1,
                      characters: [`${character.identity.name || 'Unnamed'} (${character.identity.class})`],
                      spellLevel: `Level ${level}`
                    });
                    totalSpellCount++;
                  }
                });
              }
            });
          }
        }
      });

      const spellUsageArray: SpellUsage[] = Array.from(spellMap.entries()).map(([spell, data]) => ({
        spell: spell.charAt(0).toUpperCase() + spell.slice(1), // Capitalize first letter
        count: data.count,
        characters: data.characters,
        spellLevel: data.spellLevel
      }));

      setSpellUsage(spellUsageArray);
      setTotalSpellcasters(spellcasterCount);
      setTotalSpells(totalSpellCount);
    };

    analyzeSpells();
  }, [characters]);

  const sortedSpells = [...spellUsage].sort((a, b) => {
    switch (sortBy) {
      case 'count':
        return b.count - a.count;
      case 'name':
        return a.spell.localeCompare(b.spell);
      case 'level':
        // Sort by level, with cantrips first
        if (a.spellLevel === 'Cantrip' && b.spellLevel !== 'Cantrip') return -1;
        if (b.spellLevel === 'Cantrip' && a.spellLevel !== 'Cantrip') return 1;
        if (a.spellLevel === 'Cantrip' && b.spellLevel === 'Cantrip') return a.spell.localeCompare(b.spell);
        
        const aLevel = parseInt(a.spellLevel.replace('Level ', ''));
        const bLevel = parseInt(b.spellLevel.replace('Level ', ''));
        if (aLevel !== bLevel) return aLevel - bLevel;
        return a.spell.localeCompare(b.spell);
      default:
        return 0;
    }
  });

  const filteredSpells = filterLevel === 'all' 
    ? sortedSpells 
    : sortedSpells.filter(spell => spell.spellLevel === filterLevel);

  const spellLevels = ['all', 'Cantrip', 'Level 1', 'Level 2', 'Level 3', 'Level 4', 'Level 5', 'Level 6', 'Level 7', 'Level 8', 'Level 9'];

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <h2 className="text-2xl font-bold mb-4 text-gray-800">Spell Usage Statistics</h2>
      
      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-2 mb-3">
        <div className="bg-blue-50 p-2 rounded border border-blue-200">
          <div className="text-lg font-bold text-blue-600">{totalSpellcasters}</div>
          <div className="text-xs text-blue-800">Spellcasters</div>
        </div>
        <div className="bg-green-50 p-2 rounded border border-green-200">
          <div className="text-lg font-bold text-green-600">{totalSpells}</div>
          <div className="text-xs text-green-800">Unique Spells</div>
        </div>
        <div className="bg-purple-50 p-2 rounded border border-purple-200">
          <div className="text-lg font-bold text-purple-600">{spellUsage.reduce((sum, spell) => sum + spell.count, 0)}</div>
          <div className="text-xs text-purple-800">Total Instances</div>
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap gap-3 mb-3">
        <div className="flex items-center gap-2">
          <label className="text-xs font-medium text-gray-700">Sort:</label>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as 'count' | 'name' | 'level')}
            className="px-2 py-1 border border-gray-300 rounded text-xs"
          >
            <option value="count">Usage</option>
            <option value="name">Name</option>
            <option value="level">Level</option>
          </select>
        </div>
        
        <div className="flex items-center gap-2">
          <label className="text-xs font-medium text-gray-700">Level:</label>
          <select
            value={filterLevel}
            onChange={(e) => setFilterLevel(e.target.value)}
            className="px-2 py-1 border border-gray-300 rounded text-xs"
          >
            {spellLevels.map(level => (
              <option key={level} value={level}>
                {level === 'all' ? 'All' : level}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Spell List */}
      <div className="space-y-1">
        {filteredSpells.length === 0 ? (
          <div className="text-center py-4 text-gray-500 text-sm">
            No spells found for the selected filter.
          </div>
        ) : (
          filteredSpells.map((spell, index) => (
            <div key={index} className="border border-gray-200 rounded p-2 hover:bg-gray-50 transition-colors">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <h3 className="font-medium text-gray-800 text-sm truncate">{spell.spell}</h3>
                  <span className={`px-1.5 py-0.5 rounded text-xs font-medium flex-shrink-0 ${
                    spell.spellLevel === 'Cantrip' 
                      ? 'bg-yellow-100 text-yellow-800' 
                      : 'bg-blue-100 text-blue-800'
                  }`}>
                    {spell.spellLevel}
                  </span>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <div className="text-right">
                    <div className="text-lg font-bold text-gray-600">{spell.count}</div>
                    <div className="text-xs text-gray-500">
                      {spell.count === 1 ? 'char' : 'chars'}
                    </div>
                  </div>
                  <div className="w-16 bg-gray-200 rounded-full h-1.5">
                    <div 
                      className="bg-blue-600 h-1.5 rounded-full transition-all duration-300"
                      style={{ width: `${(spell.count / totalSpellcasters) * 100}%` }}
                    ></div>
                  </div>
                  <div className="text-xs text-gray-500 w-12 text-right">
                    {((spell.count / totalSpellcasters) * 100).toFixed(0)}%
                  </div>
                </div>
              </div>
              
              <div className="mt-1">
                <div className="text-xs text-gray-600 truncate">
                  {spell.characters.join(', ')}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Legend */}
      <div className="mt-4 p-2 bg-gray-50 rounded">
        <h4 className="font-medium text-gray-800 mb-1 text-sm">Legend</h4>
        <div className="flex flex-wrap gap-3 text-xs">
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 bg-yellow-100 border border-yellow-300 rounded-full"></div>
            <span className="text-gray-600">Cantrip</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 bg-blue-100 border border-blue-300 rounded-full"></div>
            <span className="text-gray-600">Leveled spell</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
            <span className="text-gray-600">Usage bar</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SpellStatistics;
