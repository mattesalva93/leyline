import { useEffect, useState } from 'react';
import { CARD_SEARCH_WAIT_MS } from './workspace/use-card-search.ts';

/** What the user types to narrow the print picker's prints, and what the pages are searched for. */
export interface PrintQuery {
  /** The text in the field, as typed. */
  readonly typed: string;
  readonly type: (text: string) => void;
  /** Empties the field: the picker shows every print again at once. */
  readonly clear: () => void;
  /**
   * The print query the prints are asked for: the typed text, trimmed, once the user stops
   * typing for `CARD_SEARCH_WAIT_MS`; empty, straight away, for a blank field.
   */
  readonly searched: string;
}

/**
 * The print query of a line panel. It starts empty, and empties again each time
 * `tileSelectionCount` grows: the user pressed a tile, the one already selected included.
 */
export function usePrintQuery(tileSelectionCount: number): PrintQuery {
  const [typed, setTyped] = useState('');
  const [settled, setSettled] = useState('');
  const [lastTileSelectionCount, setLastTileSelectionCount] = useState(tileSelectionCount);
  if (lastTileSelectionCount !== tileSelectionCount) {
    setLastTileSelectionCount(tileSelectionCount);
    setTyped('');
  }
  const trimmed = typed.trim();
  // A blank field forgets the last search, so the next one never shows its prints first.
  if (trimmed === '' && settled !== '') setSettled('');
  useEffect(() => {
    if (trimmed === '') return;
    const timer = setTimeout(() => setSettled(trimmed), CARD_SEARCH_WAIT_MS);
    return () => clearTimeout(timer);
  }, [trimmed]);
  return {
    typed,
    type: setTyped,
    clear: () => setTyped(''),
    searched: trimmed === '' ? '' : settled,
  };
}
