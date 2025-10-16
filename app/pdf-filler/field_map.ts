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
    initiative_misc?: number | null; // misc init bonus (e.g. Alert feat)
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
    proficiencies_and_languages?: string;
    allies?: string;
    faction_name?: string;
    faction_symbol_image?: string | null;
    backstory?: string;
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
  const initiative = mods.dex + (model.combat.initiative_misc ?? 0);
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

  // Ability modifiers
  out.strMod = m.str;
  out.dexMod = m.dex;
  out.conMod = m.con;
  out.intMod = m.int;
  out.wisMod = m.wis;
  out.charMod = m.cha;

  // Saving throws
  out.strSave = v.saves.str;
  out.dexSave = v.saves.dex;
  out.conSave = v.saves.con;
  out.intSave = v.saves.int;
  out.wisSave = v.saves.wis;
  out.charSave = v.saves.cha;

  // Skills
  out.acrobatics = v.skills.acrobatics;
  out.animalHandling = v.skills.animal_handling;
  out.arcana = v.skills.arcana;
  out.athletics = v.skills.athletics;
  out.deception = v.skills.deception;
  out.history = v.skills.history;
  out.insight = v.skills.insight;
  out.intimidation = v.skills.intimidation;
  out.investigation = v.skills.investigation;
  out.medicine = v.skills.medicine;
  out.nature = v.skills.nature;
  out.perception = v.skills.perception;
  out.performance = v.skills.performance;
  out.persuasion = v.skills.persuasion;
  out.religion = v.skills.religion;
  out.sleightOfHand = v.skills.sleight_of_hand;
  out.stealth = v.skills.stealth;
  out.survival = v.skills.survival;

  // Combat stats
  out.profBonus = v.prof_bonus;
  out.armorClass = v.combat.armor_class;
  out.initiative = v.combat.initiative;
  out.speed = v.combat.speed_ft;
  out.hpMax = v.combat.hit_points_max;
  out.hitDice = v.combat.hit_dice_total;
  out.passPerception = v.passive_perception;

  // Attacks (up to 3)
  const w = v.combat.weapons;
  if (w[0]) { 
    out.attackNameOne = w[0].name; 
    out.attackBonusOne = w[0].attack_bonus; 
    out.attackDamageOne = w[0].damage; 
  }
  if (w[1]) { 
    out.attackNameTwo = w[1].name; 
    out.attackBonusTwo = w[1].attack_bonus; 
    out.attackDamageTwo = w[1].damage; 
  }
  if (w[2]) { 
    out.attackNameThree = w[2].name; 
    out.attackBonusThree = w[2].attack_bonus; 
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
