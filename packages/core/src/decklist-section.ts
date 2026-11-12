import { nameKey } from './name-match.ts';
import type { DecklistSectionName } from './types.ts';

/** MTGO and some deckbuilders mark sideboard cards with an "SB:" prefix. */
export const SIDEBOARD_PREFIX = /^SB:\s*/i;

/**
 * Section names deckbuilders write on a line of their own; no card has one as its name. Each
 * one opens the section it maps to.
 */
const SECTIONS = new Map<string, DecklistSectionName>([
  ['about', 'mainDeck'],
  ['artifacts', 'mainDeck'],
  ['battles', 'mainDeck'],
  ['commander', 'commander'],
  ['commanders', 'commander'],
  ['companion', 'mainDeck'],
  ['considering', 'mainDeck'],
  ['creatures', 'mainDeck'],
  ['deck', 'mainDeck'],
  ['enchantments', 'mainDeck'],
  ['instants', 'mainDeck'],
  ['lands', 'lands'],
  ['main', 'mainDeck'],
  ['main deck', 'mainDeck'],
  ['mainboard', 'mainDeck'],
  ['maybeboard', 'mainDeck'],
  ['other', 'mainDeck'],
  ['planeswalkers', 'mainDeck'],
  ['sideboard', 'sideboard'],
  ['sorceries', 'mainDeck'],
  ['spells', 'mainDeck'],
  ['tokens', 'tokens'],
]);
/** A section header: a section name, maybe followed by a card count and a colon. */
const SECTION_HEADER = /^(.+?)\s*(\(\d+\))?\s*:?$/;

/** The section a header line opens, or `null` when the line is no header. */
export function sectionOpenedBy(writtenLine: string): DecklistSectionName | null {
  const name = SECTION_HEADER.exec(writtenLine.trim())?.[1];
  return name === undefined ? null : (SECTIONS.get(nameKey(name)) ?? null);
}

/**
 * The section each written line belongs to, in the order of the text: the one the last header
 * above it opened (a header belongs to the section it opens), the main deck before any header.
 * A line with the sideboard prefix is in the sideboard wherever it is written.
 */
export function sectionOfEachWrittenLine(writtenLines: readonly string[]): DecklistSectionName[] {
  let current: DecklistSectionName = 'mainDeck';
  return writtenLines.map((writtenLine) => {
    current = sectionOpenedBy(writtenLine) ?? current;
    return SIDEBOARD_PREFIX.test(writtenLine.trim()) ? 'sideboard' : current;
  });
}
