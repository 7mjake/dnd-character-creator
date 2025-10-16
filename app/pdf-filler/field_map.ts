// src/compute_and_flatten.ts
// Purpose: Define the minimal character model, compute all derived values,
// and flatten to the renamed PDF field names your form expects.

// ---------- Types ----------
export type Ability = "str" | "dex" | "con" | "int" | "wis" | "cha";
export type Skill =
  | "athletics" | "acrobatics" | "sleight_of_hand" | "stealth"
  | "arcana" | "history" | "investigation" | "nature" | "religion"
  | "animal_handling" | "insight" | "medicine" | "perception" | "survival"
  | "deception" | "intimidation" | "performance" | "persuasion";

export interface InputModel {
  identity: {
    name: string;
    class: string;
    level: number;
    race: string;
    background: string;
    alignment: string;
    age?: number | string;
    height?: string;
    weight?: string;
    eyes?: string;
    skin?: string;
    hair?: string;
  };
  abilities: Record<Ability, number>; // raw scores (e.g., STR 16)
  proficiencies: {
    saves: Ability[];  // which saves are proficient
    skills: Skill[];   // which skills are proficient
  };
  combat: {
    armor_base_ac?: number | null; // optional override (e.g., chain mail 16 + shield)
    speed_ft: number;
    hit_points_max?: number | null; // max HP (if not provided, will be calculated)
    hit_dice_total?: string | null; // e.g., "3d10" (if not provided, will be calculated)
    weapons: Array<{
      name: string;
      ability: Ability;     // which ability to use for the attack roll
      bonus_misc?: number;  // misc attack bonus (fighting style, magic)
      damage: string;       // e.g., "1d8+3 slashing"
    }>;
  };
  spellcasting?: {
    class?: string | null;         // e.g., "Cleric"
    ability?: Ability | null;      // "int" | "wis" | "cha"
    cantrips?: string[];           // list of cantrip names
    spells_known?: Record<string, string[]>; // key "1".."9" => array of names
    slots?: Record<string, number>;         // key "1".."9" => total slots
    slots_used?: Record<string, number>;    // key "1".."9" => used slots
  };
  inventory: {
    equipment_text?: string;
    currency: { cp: number; sp: number; ep: number; gp: number; pp: number };
  };
  roleplay: {
    personality_traits?: string;
    ideals?: string;
    bonds?: string;
    flaws?: string;
    features_and_traits?: string | string[];
    additional_features_traits?: string | string[];
    proficiencies_and_languages?: string;
    allies?: string;
    allies_organizations?: string;
    faction_name?: string;
    faction_symbol_image?: string | null;
    backstory?: string;
    character_appearance?: string;
    treasure?: string;
    character_image?: string | boolean | null;
  };
}

// ---------- Derivation helpers ----------
export const SKILL_MAP: Record<Skill, Ability> = {
  athletics: "str",
  acrobatics: "dex", sleight_of_hand: "dex", stealth: "dex",
  arcana: "int", history: "int", investigation: "int", nature: "int", religion: "int",
  animal_handling: "wis", insight: "wis", medicine: "wis", perception: "wis", survival: "wis",
  deception: "cha", intimidation: "cha", performance: "cha", persuasion: "cha",
};

export function abilityMod(score: number) {
  return Math.floor((score - 10) / 2);
}
export function profBonus(level: number) {
  // 1–4: +2, 5–8: +3, 9–12: +4, 13–16: +5, 17–20: +6
  return Math.floor((level - 1) / 4) + 2;
}

export function formatListWithDashes(input: string | string[]): string {
  if (!input) return "";
  
  let items: string[];
  
  if (Array.isArray(input)) {
    // If it's already an array, just clean up the items
    items = input.map(item => item.trim()).filter(item => item.length > 0);
  } else {
    // If it's a string, split by commas and clean up each item
    items = input.split(',').map(item => item.trim()).filter(item => item.length > 0);
  }
  
  if (items.length === 0) return "";
  if (items.length === 1) return items[0];
  
  // Join with line breaks and dashes
  return items.join('\n—\n');
}

// Hit dice by class (D&D 5e standard)
const HIT_DICE_BY_CLASS: Record<string, number> = {
  "barbarian": 12,
  "fighter": 10,
  "paladin": 10,
  "ranger": 10,
  "artificer": 8,
  "bard": 8,
  "cleric": 8,
  "druid": 8,
  "monk": 8,
  "rogue": 8,
  "warlock": 8,
  "sorcerer": 6,
  "wizard": 6,
};

export function calculateHitPoints(className: string, level: number, conMod: number, override?: number | null): number {
  if (override !== null && override !== undefined) {
    return override;
  }
  
  const hitDie = HIT_DICE_BY_CLASS[className.toLowerCase()] || 8; // default to d8
  // Level 1: full hit die + con mod, subsequent levels: average of hit die + con mod
  const level1HP = hitDie + conMod;
  const subsequentLevels = (level - 1) * (Math.floor(hitDie / 2) + 1 + conMod);
  return level1HP + subsequentLevels;
}

export function calculateHitDice(className: string, level: number, override?: string | null): string {
  if (override) {
    return override;
  }
  
  const hitDie = HIT_DICE_BY_CLASS[className.toLowerCase()] || 8; // default to d8
  return `${level}d${hitDie}`;
}

// ---------- Compute: derive all values from minimal inputs ----------
export function computeDerived(model: InputModel) {
  const pb = profBonus(model.identity.level);

  const mods = {
    str: abilityMod(model.abilities.str),
    dex: abilityMod(model.abilities.dex),
    con: abilityMod(model.abilities.con),
    int: abilityMod(model.abilities.int),
    wis: abilityMod(model.abilities.wis),
    cha: abilityMod(model.abilities.cha),
  } as Record<Ability, number>;

  const saves = {} as Record<Ability, number>;
  (Object.keys(model.abilities) as Ability[]).forEach(a => {
    saves[a] = mods[a] + (model.proficiencies.saves.includes(a) ? pb : 0);
  });

  const skills = {} as Record<Skill, number>;
  (Object.keys(SKILL_MAP) as Skill[]).forEach(skill => {
    const ab = SKILL_MAP[skill];
    const isProf = model.proficiencies.skills.includes(skill);
    skills[skill] = mods[ab] + (isProf ? pb : 0);
  });

  const passivePerception = 10 + skills.perception;
  const initiative = mods.dex;
  // Simple fallback AC: 10 + Dex mod (you can replace with richer armor logic)
  const armorClass = model.combat.armor_base_ac ?? (10 + mods.dex);
  
  // Calculate hit points and hit dice
  const hitPointsMax = calculateHitPoints(
    model.identity.class, 
    model.identity.level, 
    mods.con, 
    model.combat.hit_points_max
  );
  const hitDiceTotal = calculateHitDice(
    model.identity.class, 
    model.identity.level, 
    model.combat.hit_dice_total
  );

  const weapons = (model.combat.weapons || []).map(w => ({
    ...w,
    attack_bonus: mods[w.ability] + pb + (w.bonus_misc ?? 0),
  }));

  let spell: null | {
    save_dc: number;
    attack_bonus: number;
    ability: Ability | null;
    class: string | null;
  } = null;
  if (model.spellcasting?.ability) {
    const ab = model.spellcasting.ability!;
    spell = {
      save_dc: 8 + pb + mods[ab],
      attack_bonus: pb + mods[ab],
      ability: ab,
      class: model.spellcasting?.class ?? null,
    };
  }

  return {
    identity: model.identity,
    abilities: { scores: model.abilities, mods },
    prof_bonus: pb,
    saves,
    skills,
    passive_perception: passivePerception,
    combat: {
      armor_class: armorClass,
      initiative,
      speed_ft: model.combat.speed_ft,
      hit_points_max: hitPointsMax,
      hit_dice_total: hitDiceTotal,
      weapons,
    },
    spellcasting: spell,
    spells: {
      cantrips: model.spellcasting?.cantrips ?? [],
      known: model.spellcasting?.spells_known ?? {},
      slots: model.spellcasting?.slots ?? {},
      slots_used: model.spellcasting?.slots_used ?? {},
    },
    inventory: model.inventory,
    roleplay: model.roleplay,
  };
}

// ---------- Flatten: map derived view to PDF field names ----------
export type PdfFields = Record<string, string | number | boolean | null>;

export function toPdfFields(model: InputModel): PdfFields {
  const v = computeDerived(model);
  const out: PdfFields = {};

  // Character identity
  out.classAndLevel = `${v.identity.class} ${v.identity.level}`;
  out.background = v.identity.background;
  out.race = v.identity.race;
  out.alignment = v.identity.alignment;

  // Ability scores
  const s = v.abilities.scores, m = v.abilities.mods;
  out.str = s.str;
  out.dex = s.dex;
  out.con = s.con;
  out.int = s.int;
  out.wis = s.wis;
  out.char = s.cha;

  // Ability modifiers (with + or - prefix)
  out.strMod = m.str >= 0 ? `+${m.str}` : `${m.str}`;
  out.dexMod = m.dex >= 0 ? `+${m.dex}` : `${m.dex}`;
  out.conMod = m.con >= 0 ? `+${m.con}` : `${m.con}`;
  out.intMod = m.int >= 0 ? `+${m.int}` : `${m.int}`;
  out.wisMod = m.wis >= 0 ? `+${m.wis}` : `${m.wis}`;
  out.charMod = m.cha >= 0 ? `+${m.cha}` : `${m.cha}`;

  // Saving throws (with + or - prefix)
  out.strSave = v.saves.str >= 0 ? `+${v.saves.str}` : `${v.saves.str}`;
  out.dexSave = v.saves.dex >= 0 ? `+${v.saves.dex}` : `${v.saves.dex}`;
  out.conSave = v.saves.con >= 0 ? `+${v.saves.con}` : `${v.saves.con}`;
  out.intSave = v.saves.int >= 0 ? `+${v.saves.int}` : `${v.saves.int}`;
  out.wisSave = v.saves.wis >= 0 ? `+${v.saves.wis}` : `${v.saves.wis}`;
  out.charSave = v.saves.cha >= 0 ? `+${v.saves.cha}` : `${v.saves.cha}`;

  // Skills (with + or - prefix)
  out.acrobatics = v.skills.acrobatics >= 0 ? `+${v.skills.acrobatics}` : `${v.skills.acrobatics}`;
  out.animalHandling = v.skills.animal_handling >= 0 ? `+${v.skills.animal_handling}` : `${v.skills.animal_handling}`;
  out.arcana = v.skills.arcana >= 0 ? `+${v.skills.arcana}` : `${v.skills.arcana}`;
  out.athletics = v.skills.athletics >= 0 ? `+${v.skills.athletics}` : `${v.skills.athletics}`;
  out.deception = v.skills.deception >= 0 ? `+${v.skills.deception}` : `${v.skills.deception}`;
  out.history = v.skills.history >= 0 ? `+${v.skills.history}` : `${v.skills.history}`;
  out.insight = v.skills.insight >= 0 ? `+${v.skills.insight}` : `${v.skills.insight}`;
  out.intimidation = v.skills.intimidation >= 0 ? `+${v.skills.intimidation}` : `${v.skills.intimidation}`;
  out.investigation = v.skills.investigation >= 0 ? `+${v.skills.investigation}` : `${v.skills.investigation}`;
  out.medicine = v.skills.medicine >= 0 ? `+${v.skills.medicine}` : `${v.skills.medicine}`;
  out.nature = v.skills.nature >= 0 ? `+${v.skills.nature}` : `${v.skills.nature}`;
  out.perception = v.skills.perception >= 0 ? `+${v.skills.perception}` : `${v.skills.perception}`;
  out.performance = v.skills.performance >= 0 ? `+${v.skills.performance}` : `${v.skills.performance}`;
  out.persuasion = v.skills.persuasion >= 0 ? `+${v.skills.persuasion}` : `${v.skills.persuasion}`;
  out.religion = v.skills.religion >= 0 ? `+${v.skills.religion}` : `${v.skills.religion}`;
  out.sleightOfHand = v.skills.sleight_of_hand >= 0 ? `+${v.skills.sleight_of_hand}` : `${v.skills.sleight_of_hand}`;
  out.stealth = v.skills.stealth >= 0 ? `+${v.skills.stealth}` : `${v.skills.stealth}`;
  out.survival = v.skills.survival >= 0 ? `+${v.skills.survival}` : `${v.skills.survival}`;

  // Combat stats
  out.profBonus = v.prof_bonus >= 0 ? `+${v.prof_bonus}` : `${v.prof_bonus}`;
  out.armorClass = v.combat.armor_class;
  out.initiative = v.combat.initiative >= 0 ? `+${v.combat.initiative}` : `${v.combat.initiative}`;
  out.speed = v.combat.speed_ft;
  out.hpMax = v.combat.hit_points_max;
  out.hitDice = v.combat.hit_dice_total;
  out.passPerception = v.passive_perception;

  // Attacks (up to 3)
  const w = v.combat.weapons;
  if (w[0]) { 
    out.attackNameOne = w[0].name; 
    out.attackBonusOne = w[0].attack_bonus >= 0 ? `+${w[0].attack_bonus}` : `${w[0].attack_bonus}`; 
    out.attackDamageOne = w[0].damage; 
  }
  if (w[1]) { 
    out.attackNameTwo = w[1].name; 
    out.attackBonusTwo = w[1].attack_bonus >= 0 ? `+${w[1].attack_bonus}` : `${w[1].attack_bonus}`; 
    out.attackDamageTwo = w[1].damage; 
  }
  if (w[2]) { 
    out.attackNameThree = w[2].name; 
    out.attackBonusThree = w[2].attack_bonus >= 0 ? `+${w[2].attack_bonus}` : `${w[2].attack_bonus}`; 
    out.attackDamageThree = w[2].damage; 
  }

  // Roleplay fields
  const r = v.roleplay;
  out.personalityTraits = r.personality_traits ?? "";
  out.ideals = r.ideals ?? "";
  out.bonds = r.bonds ?? "";
  out.flaws = r.flaws ?? "";
  out.featuresTraits = formatListWithDashes(r.features_and_traits ?? []);
  out.equipment = v.inventory.equipment_text ?? "";
  out.proficienciesLanguages = r.proficiencies_and_languages ?? "";

  // Character appearance and details
  out.age = v.identity.age ?? "";
  out.eyes = v.identity.eyes ?? "";
  out.skin = v.identity.skin ?? "";
  out.weight = v.identity.weight ?? "";
  out.height = v.identity.height ?? "";
  out.hair = v.identity.hair ?? "";
  out.alliesOrganizations = r.allies_organizations ?? r.allies ?? "";
  out.characterAppearance = r.character_appearance ?? "";
  out.characterBackstory = r.backstory ?? "";
  out.additionalFeaturesTraits = formatListWithDashes(r.additional_features_traits ?? []);
  out.treasure = r.treasure ?? "";

  // Spellcasting fields
  if (v.spellcasting) {
    out.spellcastingClass = v.spellcasting.class ?? "";
    out.spellcastingAbility = v.spellcasting.ability ?? "";
    out.spellSaveDC = v.spellcasting.save_dc;
    out.spellAttackBonus = v.spellcasting.attack_bonus >= 0 ? `+${v.spellcasting.attack_bonus}` : `${v.spellcasting.attack_bonus}`;
  } else {
    out.spellcastingClass = "";
    out.spellcastingAbility = "";
    out.spellSaveDC = "";
    out.spellAttackBonus = "";
  }

  // Cantrips (up to 7)
  const cantrips = v.spells.cantrips;
  out.cantrip1 = cantrips[0] ?? "";
  out.cantrip2 = cantrips[1] ?? "";
  out.cantrip3 = cantrips[2] ?? "";
  out.cantrip4 = cantrips[3] ?? "";
  out.cantrip5 = cantrips[4] ?? "";
  out.cantrip6 = cantrips[5] ?? "";
  out.cantrip7 = cantrips[6] ?? "";

  // Level 1 spells (up to 12)
  const lvl1Spells = v.spells.known["1"] ?? [];
  out.lvl1Spell1 = lvl1Spells[0] ?? "";
  out.lvl1Spell2 = lvl1Spells[1] ?? "";
  out.lvl1Spell3 = lvl1Spells[2] ?? "";
  out.lvl1Spell4 = lvl1Spells[3] ?? "";
  out.lvl1Spell5 = lvl1Spells[4] ?? "";
  out.lvl1Spell6 = lvl1Spells[5] ?? "";
  out.lvl1Spell7 = lvl1Spells[6] ?? "";
  out.lvl1Spell8 = lvl1Spells[7] ?? "";
  out.lvl1Spell9 = lvl1Spells[8] ?? "";
  out.lvl1Spell10 = lvl1Spells[9] ?? "";
  out.lvl1Spell11 = lvl1Spells[10] ?? "";
  out.lvl1Spell12 = lvl1Spells[11] ?? "";

  // Level 2 spells (up to 13)
  const lvl2Spells = v.spells.known["2"] ?? [];
  out.lvl2Spell1 = lvl2Spells[0] ?? "";
  out.lvl2Spell2 = lvl2Spells[1] ?? "";
  out.lvl2Spell3 = lvl2Spells[2] ?? "";
  out.lvl2Spell4 = lvl2Spells[3] ?? "";
  out.lvl2Spell5 = lvl2Spells[4] ?? "";
  out.lvl2Spell6 = lvl2Spells[5] ?? "";
  out.lvl2Spell7 = lvl2Spells[6] ?? "";
  out.lvl2Spell8 = lvl2Spells[7] ?? "";
  out.lvl2Spell9 = lvl2Spells[8] ?? "";
  out.lvl2Spell10 = lvl2Spells[9] ?? "";
  out.lvl2Spell11 = lvl2Spells[10] ?? "";
  out.lvl2Spell12 = lvl2Spells[11] ?? "";
  out.lvl2Spell13 = lvl2Spells[12] ?? "";

  // Level 3 spells (up to 13)
  const lvl3Spells = v.spells.known["3"] ?? [];
  out.lvl3Spell1 = lvl3Spells[0] ?? "";
  out.lvl3Spell2 = lvl3Spells[1] ?? "";
  out.lvl3Spell3 = lvl3Spells[2] ?? "";
  out.lvl3Spell4 = lvl3Spells[3] ?? "";
  out.lvl3Spell5 = lvl3Spells[4] ?? "";
  out.lvl3Spell6 = lvl3Spells[5] ?? "";
  out.lvl3Spell7 = lvl3Spells[6] ?? "";
  out.lvl3Spell8 = lvl3Spells[7] ?? "";
  out.lvl3Spell9 = lvl3Spells[8] ?? "";
  out.lvl3Spell10 = lvl3Spells[9] ?? "";
  out.lvl3Spell11 = lvl3Spells[10] ?? "";
  out.lvl3Spell12 = lvl3Spells[11] ?? "";
  out.lvl3Spell13 = lvl3Spells[12] ?? "";

  // Level 4 spells (up to 13)
  const lvl4Spells = v.spells.known["4"] ?? [];
  out.lvl4Spell1 = lvl4Spells[0] ?? "";
  out.lvl4Spell2 = lvl4Spells[1] ?? "";
  out.lvl4Spell3 = lvl4Spells[2] ?? "";
  out.lvl4Spell4 = lvl4Spells[3] ?? "";
  out.lvl4Spell5 = lvl4Spells[4] ?? "";
  out.lvl4Spell6 = lvl4Spells[5] ?? "";
  out.lvl4Spell7 = lvl4Spells[6] ?? "";
  out.lvl4Spell8 = lvl4Spells[7] ?? "";
  out.lvl4Spell9 = lvl4Spells[8] ?? "";
  out.lvl4Spell10 = lvl4Spells[9] ?? "";
  out.lvl4Spell11 = lvl4Spells[10] ?? "";
  out.lvl4Spell12 = lvl4Spells[11] ?? "";
  out.lvl4Spell13 = lvl4Spells[12] ?? "";

  // Level 5 spells (up to 9)
  const lvl5Spells = v.spells.known["5"] ?? [];
  out.lvl5Spell1 = lvl5Spells[0] ?? "";
  out.lvl5Spell2 = lvl5Spells[1] ?? "";
  out.lvl5Spell3 = lvl5Spells[2] ?? "";
  out.lvl5Spell4 = lvl5Spells[3] ?? "";
  out.lvl5Spell5 = lvl5Spells[4] ?? "";
  out.lvl5Spell6 = lvl5Spells[5] ?? "";
  out.lvl5Spell7 = lvl5Spells[6] ?? "";
  out.lvl5Spell8 = lvl5Spells[7] ?? "";
  out.lvl5Spell9 = lvl5Spells[8] ?? "";

  // Level 6 spells (up to 9)
  const lvl6Spells = v.spells.known["6"] ?? [];
  out.lvl6Spell1 = lvl6Spells[0] ?? "";
  out.lvl6Spell2 = lvl6Spells[1] ?? "";
  out.lvl6Spell3 = lvl6Spells[2] ?? "";
  out.lvl6Spell4 = lvl6Spells[3] ?? "";
  out.lvl6Spell5 = lvl6Spells[4] ?? "";
  out.lvl6Spell6 = lvl6Spells[5] ?? "";
  out.lvl6Spell7 = lvl6Spells[6] ?? "";
  out.lvl6Spell8 = lvl6Spells[7] ?? "";
  out.lvl6Spell9 = lvl6Spells[8] ?? "";

  // Level 7 spells (up to 9)
  const lvl7Spells = v.spells.known["7"] ?? [];
  out.lvl7Spell1 = lvl7Spells[0] ?? "";
  out.lvl7Spell2 = lvl7Spells[1] ?? "";
  out.lvl7Spell3 = lvl7Spells[2] ?? "";
  out.lvl7Spell4 = lvl7Spells[3] ?? "";
  out.lvl7Spell5 = lvl7Spells[4] ?? "";
  out.lvl7Spell6 = lvl7Spells[5] ?? "";
  out.lvl7Spell7 = lvl7Spells[6] ?? "";
  out.lvl7Spell8 = lvl7Spells[7] ?? "";
  out.lvl7Spell9 = lvl7Spells[8] ?? "";

  // Level 8 spells (up to 7)
  const lvl8Spells = v.spells.known["8"] ?? [];
  out.lvl8Spell1 = lvl8Spells[0] ?? "";
  out.lvl8Spell2 = lvl8Spells[1] ?? "";
  out.lvl8Spell3 = lvl8Spells[2] ?? "";
  out.lvl8Spell4 = lvl8Spells[3] ?? "";
  out.lvl8Spell5 = lvl8Spells[4] ?? "";
  out.lvl8Spell6 = lvl8Spells[5] ?? "";
  out.lvl8Spell7 = lvl8Spells[6] ?? "";

  // Level 9 spells (up to 7)
  const lvl9Spells = v.spells.known["9"] ?? [];
  out.lvl9Spell1 = lvl9Spells[0] ?? "";
  out.lvl9Spell2 = lvl9Spells[1] ?? "";
  out.lvl9Spell3 = lvl9Spells[2] ?? "";
  out.lvl9Spell4 = lvl9Spells[3] ?? "";
  out.lvl9Spell5 = lvl9Spells[4] ?? "";
  out.lvl9Spell6 = lvl9Spells[5] ?? "";
  out.lvl9Spell7 = lvl9Spells[6] ?? "";

  // Spell slots
  out.level1Slots = v.spells.slots["1"] ?? 0;
  out.level2Slots = v.spells.slots["2"] ?? 0;
  out.level3Slots = v.spells.slots["3"] ?? 0;
  out.level4Slots = v.spells.slots["4"] ?? 0;
  out.level5Slots = v.spells.slots["5"] ?? 0;
  out.level6Slots = v.spells.slots["6"] ?? 0;
  out.level7Slots = v.spells.slots["7"] ?? 0;
  out.level8Slots = v.spells.slots["8"] ?? 0;
  out.level9Slots = v.spells.slots["9"] ?? 0;

  // Spell slots used (populated with "O" characters for players to mark)
  const generateSlotMarkers = (totalSlots: number) => {
    if (totalSlots <= 0) return "";
    return Array(totalSlots).fill("O").join(" ");
  };
  
  out.level1SlotsUsed = generateSlotMarkers(v.spells.slots["1"] ?? 0);
  out.level2SlotsUsed = generateSlotMarkers(v.spells.slots["2"] ?? 0);
  out.level3SlotsUsed = generateSlotMarkers(v.spells.slots["3"] ?? 0);
  out.level4SlotsUsed = generateSlotMarkers(v.spells.slots["4"] ?? 0);
  out.level5SlotsUsed = generateSlotMarkers(v.spells.slots["5"] ?? 0);
  out.level6SlotsUsed = generateSlotMarkers(v.spells.slots["6"] ?? 0);
  out.level7SlotsUsed = generateSlotMarkers(v.spells.slots["7"] ?? 0);
  out.level8SlotsUsed = generateSlotMarkers(v.spells.slots["8"] ?? 0);
  out.level9SlotsUsed = generateSlotMarkers(v.spells.slots["9"] ?? 0);

  // Proficiency flags for saving throws
  out.strSaveProf = model.proficiencies.saves.includes("str");
  out.dexSaveProf = model.proficiencies.saves.includes("dex");
  out.conSaveProf = model.proficiencies.saves.includes("con");
  out.intSaveProf = model.proficiencies.saves.includes("int");
  out.wisSaveProf = model.proficiencies.saves.includes("wis");
  out.charSaveProf = model.proficiencies.saves.includes("cha");

  // Proficiency flags for skills
  out.acrobaticsProf = model.proficiencies.skills.includes("acrobatics");
  out.animalHandlingProf = model.proficiencies.skills.includes("animal_handling");
  out.arcanaProf = model.proficiencies.skills.includes("arcana");
  out.athleticsProf = model.proficiencies.skills.includes("athletics");
  out.deceptionProf = model.proficiencies.skills.includes("deception");
  out.historyProf = model.proficiencies.skills.includes("history");
  out.insightProf = model.proficiencies.skills.includes("insight");
  out.intimidationProf = model.proficiencies.skills.includes("intimidation");
  out.investigationProf = model.proficiencies.skills.includes("investigation");
  out.medicineProf = model.proficiencies.skills.includes("medicine");
  out.natureProf = model.proficiencies.skills.includes("nature");
  out.perceptionProf = model.proficiencies.skills.includes("perception");
  out.performanceProf = model.proficiencies.skills.includes("performance");
  out.persuasionProf = model.proficiencies.skills.includes("persuasion");
  out.religionProf = model.proficiencies.skills.includes("religion");
  out.sleightOfHandProf = model.proficiencies.skills.includes("sleight_of_hand");
  out.stealthProf = model.proficiencies.skills.includes("stealth");
  out.survivalProf = model.proficiencies.skills.includes("survival");

  return out;
}

/* ---------------- Example usage (delete or keep) ---------------
import { toPdfFields } from "./compute_and_flatten";
import fs from "fs";
const model: InputModel = { ... }; // your pasted JSON
const fields = toPdfFields(model);
fs.writeFileSync("fields.json", JSON.stringify(fields, null, 2));
----------------------------------------------------------------- */
