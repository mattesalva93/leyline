import { writtenLinesOf } from '@mtg-suite/core';
import type { LineSplitOverPrints } from '../line-split.ts';

/**
 * The decklist "Prova con un esempio" loads. It shows the generator at work: a line split over
 * several prints (Lightning Bolt), a double-faced card (Delver of Secrets) and a sideboard.
 */
const TEXT = `1 Sol Ring
4 Delver of Secrets
4 Brainstorm
4 Ponder
4 Counterspell
4 Lightning Bolt
8 Island
4 Mountain

Sideboard
2 Pyroblast`;

const SPLIT_LINE = '4 Lightning Bolt';

export const EXAMPLE_DECKLIST: { readonly text: string; readonly split: LineSplitOverPrints } = {
  text: TEXT,
  split: { writtenIndex: writtenLinesOf(TEXT).indexOf(SPLIT_LINE), printCount: 3 },
};
