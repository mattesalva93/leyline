import type { Lang } from '@leyline/core';
import { useEffect, useState } from 'react';
import { recordProductEvent } from '../product-events/record-product-event.ts';
import type { WrittenCardLine } from './use-generator.ts';

/**
 * Records `decklist_resolved` once for a decklist pasted or loaded, as soon as every line of it
 * is resolved; never for the lines written by hand one by one. A line whose request failed holds
 * the event back until it is resolved.
 */
export function useDecklistResolvedEvent({
  cardLines,
  isResolving,
  lang,
}: {
  readonly cardLines: readonly WrittenCardLine[];
  readonly isResolving: boolean;
  readonly lang: Lang;
}) {
  const [isAwaitingResolution, setIsAwaitingResolution] = useState(false);
  const isEveryLineResolved = !isResolving && cardLines.every(({ line }) => line !== undefined);

  useEffect(() => {
    if (!isAwaitingResolution || !isEveryLineResolved) return;
    setIsAwaitingResolution(false);
    recordProductEvent({
      name: 'decklist_resolved',
      lineCount: cardLines.length,
      unrecognisedLineCount: cardLines.filter(({ line }) => line?.status === 'notFound').length,
      lang,
    });
  });

  return {
    /** The decklist was just pasted or loaded: it is recorded once resolved. */
    awaitResolution: () => setIsAwaitingResolution(true),
    /** The decklist is gone, so nothing is recorded for it. */
    forget: () => setIsAwaitingResolution(false),
  };
}
