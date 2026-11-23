import type { SuggestedToken } from '@mtg-suite/core';
import { useTranslation } from 'react-i18next';
import { CARD_SHAPE } from '../card-image/card-shape.ts';
import { Icon } from '../../ui/Icon.tsx';
import { PileFreeTileFrame } from '../card-grid/PileFreeTileFrame.tsx';
import { SINKS_WITH_PRESSED_GROUP } from '../../ui/board-styles.ts';
import { FadingInImage } from '../card-image/FadingInImage.tsx';

/** A token as its add button names it: its name, then the set and number its line is written with. */
function tokenLabel({ candidate: { card, defaultPrint } }: SuggestedToken): string {
  return `${card.name} (${defaultPrint.set.toUpperCase()} ${defaultPrint.collectorNumber})`;
}

/**
 * A suggested token as a faded tile with a button over it that adds it to the decklist, and under
 * it the cards creating it.
 */
export function SuggestedTokenTile({
  token,
  creatorNames,
  onAdd,
}: {
  readonly token: SuggestedToken;
  readonly creatorNames: readonly string[];
  readonly onAdd: () => void;
}) {
  const { t } = useTranslation();
  const face = token.candidate.defaultPrint.faces[0];
  return (
    <>
      <PileFreeTileFrame>
        <div
          style={CARD_SHAPE}
          className="relative overflow-hidden border-2 border-dashed border-border"
        >
          {face && (
            <FadingInImage
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
            onClick={onAdd}
          >
            <span
              className={`flex items-center gap-1 rounded-full border-2 border-border bg-panel px-3 py-1 text-sm font-bold group-hover:bg-accent group-hover:text-accent-foreground ${SINKS_WITH_PRESSED_GROUP}`}
            >
              <Icon name="plus" />
              {t('suggestedTokens.addOnTile')}
            </span>
          </button>
        </div>
      </PileFreeTileFrame>
      <p className="text-xs leading-tight text-muted-foreground">
        {t('suggestedTokens.createdBy', { cards: creatorNames.join(', ') })}
      </p>
    </>
  );
}
