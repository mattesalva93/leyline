import { aCard } from '@mtg-suite/core/test-fixtures';
import { describe, expect, it } from 'vitest';
import { characteristicsLineOf } from './card-characteristics.ts';

const soldierWithHaste = aCard({
  name: 'Soldier',
  powerToughnessByFace: [{ power: '1', toughness: '1' }],
  keywords: ['Haste'],
});

describe('the characteristics line of a card', () => {
  it('names a keyword as Scryfall does in English', () => {
    expect(characteristicsLineOf(soldierWithHaste, 'en')).toBe('1/1 Haste');
  });

  it('names a keyword in Italian as the Italian cards print it', () => {
    expect(characteristicsLineOf(soldierWithHaste, 'it')).toBe('1/1 Rapidità');
  });

  it('keeps in English a keyword without an Italian name, in Italian too', () => {
    const card = aCard({ keywords: ['Flying', 'Brand-new keyword'] });
    expect(characteristicsLineOf(card, 'it')).toBe('Volare, Brand-new keyword');
  });

  it("separates the powers and toughnesses of a double-faced card's faces with //", () => {
    const soldierGoblin = aCard({
      name: 'Soldier // Goblin',
      powerToughnessByFace: [
        { power: '1', toughness: '1' },
        { power: '2', toughness: '1' },
      ],
    });
    expect(characteristicsLineOf(soldierGoblin, 'en')).toBe('1/1 // 2/1');
  });

  it('shows only the keywords of a card without power and toughness', () => {
    const card = aCard({ powerToughnessByFace: [null], keywords: ['Equip'] });
    expect(characteristicsLineOf(card, 'it')).toBe('Equipaggiare');
  });

  it('gives an empty line for a card with no power, toughness or keyword, like a Treasure', () => {
    const treasure = aCard({ name: 'Treasure', powerToughnessByFace: [null], keywords: [] });
    expect(characteristicsLineOf(treasure, 'en')).toBe('');
  });
});

// The keywords of the catalog's tokens and emblems, as the import of 2026-11-18 holds them.
const CATALOG_TOKEN_KEYWORDS = [
  'Annihilator', 'Changeling', 'Crew', 'Deathtouch', 'Decayed', 'Defender', 'Devour',
  'Double strike', 'Enchant', 'Equip', 'Explore', 'Ferocious', 'Fight', 'Firebending',
  'First strike', 'Flanking', 'Flying', 'Food', 'Forage', 'Forestwalk', 'Goad', 'Haste',
  "Hero's Reward", 'Hexproof', 'Indestructible', 'Infect', 'Investigate', 'Islandwalk', 'Landfall',
  'Landwalk', 'Lifelink', 'Menace', 'Mill', 'Paradox', 'Protection', 'Prowess', 'Reach',
  'Regenerate', 'Scry', 'Shroud', 'Surveil', 'Toxic', 'Training', 'Trample', 'Transform',
  'Treasure', 'Umbra armor', 'Valiant', 'Vanishing', 'Vigilance', 'Ward',
]; // prettier-ignore

// No Italian print carries them, so they have no official Italian name yet.
const KEYWORDS_WITHOUT_ITALIAN_NAME = ["Hero's Reward", 'Paradox'];

function italianNameOf(keyword: string): string {
  return characteristicsLineOf(aCard({ keywords: [keyword] }), 'it');
}

describe('the Italian names of keywords', () => {
  it.each(CATALOG_TOKEN_KEYWORDS.filter((k) => !KEYWORDS_WITHOUT_ITALIAN_NAME.includes(k)))(
    'name %s, which a token of the catalog has, in Italian',
    (keyword) => {
      expect(italianNameOf(keyword)).not.toBe(keyword);
    },
  );

  it.each(KEYWORDS_WITHOUT_ITALIAN_NAME)('still lack an Italian name for %s', (keyword) => {
    expect(italianNameOf(keyword)).toBe(keyword);
  });
});
