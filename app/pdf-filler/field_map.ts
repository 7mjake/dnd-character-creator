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
    feats_and_traits?: string;
    features_and_traits?: string;
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

  // identity
  out.character_name = v.identity.name;
  out.class_and_level = `${v.identity.class} ${v.identity.level}`;
  out.race = v.identity.race;
  out.background = v.identity.background;
  out.alignment = v.identity.alignment;
  out.age = String(v.identity.age ?? "");
  out.height = v.identity.height ?? "";
  out.weight = v.identity.weight ?? "";
  out.eyes = v.identity.eyes ?? "";
  out.skin = v.identity.skin ?? "";
  out.hair = v.identity.hair ?? "";

  // abilities (scores + mods)
  const s = v.abilities.scores, m = v.abilities.mods;
  out.strength = s.str; out.strength_mod = m.str;
  out.dexterity = s.dex; out.dexterity_mod = m.dex;
  out.constitution = s.con; out.constitution_mod = m.con;
  out.intelligence = s.int; out.intelligence_mod = m.int;
  out.wisdom = s.wis; out.wisdom_mod = m.wis;
  out.charisma = s.cha; out.charisma_mod = m.cha;

  // saves (derived) + proficiency flags from input model
  out.save_strength = v.saves.str;
  out.save_dexterity = v.saves.dex;
  out.save_constitution = v.saves.con;
  out.save_intelligence = v.saves.int;
  out.save_wisdom = v.saves.wis;
  out.save_charisma = v.saves.cha;
  for (const a of ["str","dex","con","int","wis","cha"] as const) {
    out[`save_${a}_prof`] = model.proficiencies.saves.includes(a);
  }

  // skills (derived) + prof flags
  const ALL_SKILLS: Skill[] = [
    "acrobatics","animal_handling","arcana","athletics","deception","history","insight",
    "intimidation","investigation","medicine","nature","perception","performance","persuasion",
    "religion","sleight_of_hand","stealth","survival",
  ];
  for (const k of ALL_SKILLS) {
    out[`skill_${k}`] = v.skills[k];
    out[`${k}_prof`] = model.proficiencies.skills.includes(k);
  }

  // combat + misc
  out.proficiency_bonus = v.prof_bonus;
  out.passive_perception = v.passive_perception;
  out.armor_class = v.combat.armor_class;
  out.initiative = v.combat.initiative;
  out.speed = v.combat.speed_ft;

  // weapons (up to 3)
  const w = v.combat.weapons;
  if (w[0]) { out.weapon1_name = w[0].name; out.weapon1_attack_bonus = w[0].attack_bonus; out.weapon1_damage = w[0].damage; }
  if (w[1]) { out.weapon2_name = w[1].name; out.weapon2_attack_bonus = w[1].attack_bonus; out.weapon2_damage = w[1].damage; }
  if (w[2]) { out.weapon3_name = w[2].name; out.weapon3_attack_bonus = w[2].attack_bonus; out.weapon3_damage = w[2].damage; }

  // spellcasting (derived from ability + level)
  out.spellcasting_class = v.spellcasting?.class ?? "";
  out.spellcasting_ability = v.spellcasting?.ability ?? "";
  out.spell_save_dc = v.spellcasting?.save_dc ?? "";
  out.spell_attack_bonus = v.spellcasting?.attack_bonus ?? "";

  // cantrips (first 8)
  (v.spells.cantrips || []).slice(0,8).forEach((name, i) => {
    out[`cantrip_${i+1}`] = name ?? "";
  });

  // spell names grid + slots (first 13 names per level)
  for (let L=1; L<=9; L++) {
    const list = (v.spells.known[String(L)] || []).slice(0,13);
    list.forEach((name, j) => out[`spell_level${L}_slot${j+1}`] = name ?? "");
    out[`spell_slots_lvl${L}`] = v.spells.slots[String(L)] ?? 0;
  }

  // inventory + RP
  out.equipment = v.inventory.equipment_text ?? "";
  out.currency_cp = v.inventory.currency.cp ?? 0;
  out.currency_sp = v.inventory.currency.sp ?? 0;
  out.currency_ep = v.inventory.currency.ep ?? 0;
  out.currency_gp = v.inventory.currency.gp ?? 0;
  out.currency_pp = v.inventory.currency.pp ?? 0;

  const r = v.roleplay;
  out.personality_traits = r.personality_traits ?? "";
  out.ideals = r.ideals ?? "";
  out.bonds = r.bonds ?? "";
  out.flaws = r.flaws ?? "";
  out.feats_and_traits = r.feats_and_traits ?? "";
  out.features_and_traits = r.features_and_traits ?? "";
  out.proficiencies_and_languages = r.proficiencies_and_languages ?? "";
  out.allies = r.allies ?? "";
  out.faction_name = r.faction_name ?? "";
  out.faction_symbol_image = r.faction_symbol_image ?? null;
  out.backstory = r.backstory ?? "";
  out.treasure = r.treasure ?? "";
  out.character_image = r.character_image ?? null;

  return out;
}

/* ---------------- Example usage (delete or keep) ---------------
import { toPdfFields } from "./compute_and_flatten";
import fs from "fs";
const model: InputModel = { ... }; // your pasted JSON
const fields = toPdfFields(model);
fs.writeFileSync("fields.json", JSON.stringify(fields, null, 2));
----------------------------------------------------------------- */
