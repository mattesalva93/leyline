import type { SuggestedToken } from '@mtg-suite/core';
import { useId } from 'react';
import { useTranslation } from 'react-i18next';
import { SECONDARY_BUTTON } from '../ui/board-styles.ts';
import { SuggestedTokenTile } from './SuggestedTokenTile.tsx';
import { GRID_SECTION_TITLE_ROW_CLASS, TILE_GRID_CLASS, tileGridStyle } from './tile-grid.ts';

/**
 * The tokens the decklist's cards create, at the end of the card grid: a tile for each, and a
 * button that adds them all. Nothing shows while there is none.
 */
export function SuggestedTokens({
  tokens,
  creatorNamesOfSuggestedToken,
  tileWidthPx,
  onAdd,
}: {
  readonly tokens: readonly SuggestedToken[];
  readonly creatorNamesOfSuggestedToken: (token: SuggestedToken) => readonly string[];
  /** The narrowest a tile gets, in CSS px, as in the card grid. */
  readonly tileWidthPx: number;
  readonly onAdd: (tokens: readonly SuggestedToken[]) => void;
}) {
  const { t } = useTranslation();
  const titleId = useId();
  if (tokens.length === 0) return null;
  return (
    <section aria-labelledby={titleId}>
      <div
        className={`${GRID_SECTION_TITLE_ROW_CLASS} flex flex-wrap items-center gap-x-3 gap-y-1`}
      >
        <h2 id={titleId} className="font-semibold text-muted-foreground">
          {t('suggestedTokens.title')}
        </h2>
        <button
          type="button"
          className={`${SECONDARY_BUTTON} text-sm`}
          onClick={() => onAdd(tokens)}
        >
          {t('suggestedTokens.addAll')}
        </button>
      </div>
      <ul className={TILE_GRID_CLASS} style={tileGridStyle(tileWidthPx)}>
        {tokens.map((token) => (
          <li key={token.candidate.card.oracleId} aria-label={token.candidate.card.name}>
            <SuggestedTokenTile
              token={token}
              creatorNames={creatorNamesOfSuggestedToken(token)}
              onAdd={() => onAdd([token])}
            />
          </li>
        ))}
      </ul>
    </section>
  );
}
