import type { SheetOptions } from '@leyline/core';
import { useEffect, useState } from 'react';
import type { LineChoices } from './line-choices.ts';
import { forgetSavedDecklist, saveDecklist } from './saved-decklist/saved-decklist.ts';

/** The work on the decklist as the generator holds it. */
interface DecklistInGenerator {
  readonly decklistText: string;
  /** Keyed by `choicesKeysOf`. */
  readonly choicesByLine: ReadonlyMap<string, LineChoices>;
  readonly sheetOptions: SheetOptions;
}

/**
 * Whether a decklist is under way, the device keeping it while it is. It is from entering when
 * the device kept one, or else from the first recognised line, until `startOver`; until then
 * the device keeps no decklist.
 */
export function useDecklistUnderWay({
  wasKeptOnEntering,
  hasRecognisedLine,
  decklist: { decklistText, choicesByLine, sheetOptions },
}: {
  readonly wasKeptOnEntering: boolean;
  readonly hasRecognisedLine: boolean;
  readonly decklist: DecklistInGenerator;
}) {
  const [isDecklistUnderWay, setIsDecklistUnderWay] = useState(wasKeptOnEntering);
  if (!isDecklistUnderWay && hasRecognisedLine) setIsDecklistUnderWay(true);
  useEffect(() => {
    if (isDecklistUnderWay) {
      saveDecklist({ decklistText, choicesByLine: [...choicesByLine], sheetOptions });
    } else {
      forgetSavedDecklist();
    }
  }, [isDecklistUnderWay, decklistText, choicesByLine, sheetOptions]);
  return { isDecklistUnderWay, startOver: () => setIsDecklistUnderWay(false) };
}
