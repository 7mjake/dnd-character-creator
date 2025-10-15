# D&D 5e Character Sheet PDF Generator

A React web application that automatically fills D&D 5e character sheet PDFs from JSON character data.

## Features

- **JSON Input**: Paste or upload character data in a structured JSON format
- **Field Mapping**: Automatically maps JSON fields to PDF form fields using a comprehensive mapping system
- **Derived Values**: Calculates ability modifiers, proficiency bonuses, saving throws, and skill bonuses
- **PDF Generation**: Fills the official D&D 5e character sheet PDF and downloads the result
- **Sample Data**: Includes sample character files for both martial and spellcasting characters

## How to Use

1. **Start the application**:
   ```bash
   npm run dev
   ```

2. **Input Character Data**:
   - Paste JSON data directly into the text area
   - Upload a JSON file using the "Upload JSON File" button
   - Use the "Load Sample Fighter" button to try with sample data
   - Download sample files to use as templates

3. **Generate PDF**:
   - Click "Parse JSON" to validate your data
   - Click "Generate & Download PDF" to create and download the filled character sheet

## JSON Data Structure

The application expects character data in the following structure:

```json
{
  "identity": {
    "name": "Character Name",
    "class": "Class Name",
    "level": 1,
    "race": "Race Name",
    "background": "Background Name",
    "alignment": "Alignment",
    "age": 25,
    "height": "5'8\"",
    "weight": "150 lbs",
    "eyes": "Brown",
    "skin": "Tan",
    "hair": "Black"
  },
  "abilities": {
    "str": 15,
    "dex": 14,
    "con": 13,
    "int": 12,
    "wis": 10,
    "cha": 8
  },
  "proficiencies": {
    "saves": ["str", "con"],
    "skills": ["athletics", "intimidation"]
  },
  "combat": {
    "armor_base_ac": 16,
    "initiative_misc": 0,
    "speed_ft": 30,
    "weapons": [
      {
        "name": "Longsword",
        "ability": "str",
        "bonus_misc": 0,
        "damage": "1d8+2 slashing"
      }
    ]
  },
  "spellcasting": {
    "class": "Wizard",
    "ability": "int",
    "cantrips": ["Fire Bolt", "Mage Hand"],
    "spells_known": {
      "1": ["Magic Missile", "Shield"],
      "2": ["Misty Step", "Scorching Ray"]
    },
    "slots": {
      "1": 3,
      "2": 2
    }
  },
  "inventory": {
    "equipment_text": "Equipment list",
    "currency": {
      "cp": 0,
      "sp": 0,
      "ep": 0,
      "gp": 10,
      "pp": 0
    }
  },
  "roleplay": {
    "personality_traits": "Character traits",
    "ideals": "Character ideals",
    "bonds": "Character bonds",
    "flaws": "Character flaws",
    "feats_and_traits": "Feats and racial traits",
    "features_and_traits": "Class features",
    "proficiencies_and_languages": "Languages and tool proficiencies",
    "allies": "Allies and organizations",
    "faction_name": "Faction name",
    "faction_symbol_image": null,
    "backstory": "Character backstory",
    "treasure": "Special items",
    "character_image": null
  }
}
```

## Field Mapping

The application uses a sophisticated field mapping system that:

- **Computes derived values**: Ability modifiers, proficiency bonuses, saving throws, skill bonuses
- **Maps to PDF fields**: Converts the structured data to flat field names expected by the PDF form
- **Handles spellcasting**: Maps spell slots, known spells, and cantrips to the appropriate PDF fields
- **Supports weapons**: Maps weapon data including attack bonuses and damage

## Sample Files

Two sample character files are included:

- `sample-character.json`: A 3rd-level Dwarf Fighter
- `sample-wizard.json`: A 5th-level Elf Wizard with full spellcasting

## Technical Details

- **Frontend**: React with TypeScript
- **PDF Library**: pdf-lib for client-side PDF manipulation
- **Styling**: Tailwind CSS
- **Field Mapping**: Custom TypeScript system for data transformation

## Development

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build
```

## Requirements

- Node.js 18+
- Modern web browser with JavaScript enabled
- The `charSheet.pdf` file in the `public` directory

## License

This project is for personal use and educational purposes. The D&D 5e character sheet PDF is property of Wizards of the Coast.