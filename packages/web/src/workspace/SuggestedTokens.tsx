import type { Card, SuggestedToken } from '@mtg-suite/core';
import { useId } from 'react';
import { useTranslation } from 'react-i18next';
import { CARD_SHAPE } from '../card-shape.ts';
import { SECONDARY_BUTTON } from '../ui/board-styles.ts';
import { Icon } from '../ui/Icon.tsx';
import { pileFreeTileFrame } from './CopyPile.tsx';
import { TILE_GRID_CLASS, tileGridStyle } from './tile-grid.ts';
import { TILE_TAB_HEIGHT_CSS } from './tile-tab-geometry.ts';

/** A token as its add button names it: its name, then the set and number its line is written with. */
function tokenLabel({ candidate: { card, defaultPrint } }: SuggestedToken): string {
  return `${card.name} (${defaultPrint.set.toUpperCase()} ${defaultPrint.collectorNumber})`;
}

/**
 * The tokens the decklist's cards create, after the card grid: each a faded tile, under it the
 * cards creating it, with a button that adds it to the decklist, and one that adds them all.
 * Nothing shows while there is none.
 */
export function SuggestedTokens({
  tokens,
  creatorsOf,
  tileWidthPx,
  onAdd,
}: {
  readonly tokens: readonly SuggestedToken[];
  readonly creatorsOf: (token: SuggestedToken) => readonly Card[];
  /** The narrowest a tile gets, in CSS px, as in the card grid. */
  readonly tileWidthPx: number;
  readonly onAdd: (tokens: readonly SuggestedToken[]) => void;
}) {
  const { t } = useTranslation();
  const titleId = useId();
  if (tokens.length === 0) return null;
  return (
    <section aria-labelledby={titleId}>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 px-6 pt-3 pb-2">
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
        {tokens.map((token) => {
          const { card, defaultPrint } = token.candidate;
          const face = defaultPrint.faces[0];
          return (
            <li key={card.oracleId} aria-label={card.name}>
              <div style={pileFreeTileFrame(TILE_TAB_HEIGHT_CSS)}>
                <div
                  style={CARD_SHAPE}
                  className="relative overflow-hidden border-2 border-dashed border-border"
                >
                  {face && (
                    <img
                      src={face.imageUris.normal}
                      alt={t('line.imageAlt', { name: face.name })}
                      loading="lazy"
                      className="size-full object-cover opacity-45"
                    />
                  )}
                  <button
                    type="button"
                    aria-label={t('suggestedTokens.add', { token: tokenLabel(token) })}
                    className="group absolute inset-0 grid place-items-center"
                    onClick={() => onAdd([token])}
                  >
                    <span className="flex items-center gap-1 rounded-full border-2 border-border bg-panel px-3 py-1 text-sm font-bold group-hover:bg-accent group-hover:text-accent-foreground">
                      <Icon name="plus" />
                      {t('suggestedTokens.addOne')}
                    </span>
                  </button>
                </div>
              </div>
              <p className="text-xs leading-tight text-muted-foreground">
                {t('suggestedTokens.createdBy', {
                  cards: creatorsOf(token)
                    .map(({ name }) => name)
                    .join(', '),
                })}
              </p>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
