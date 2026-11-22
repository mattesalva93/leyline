import type { Candidate, Lang } from '@mtg-suite/core';
import { useTranslation } from 'react-i18next';
import { CARD_SHAPE } from '../card-image/card-shape.ts';
import { SECONDARY_BUTTON } from '../../ui/board-styles.ts';
import { CardVersionCaption, cardVersionText } from '../card-grid/card-version.tsx';
import { useCardsNamed } from './use-cards-named.ts';

/**
 * Every card sharing `name`, by image, each with what tells it apart: the user picks the one
 * they mean by looking at it. Back leaves for the cards the search found.
 */
export function SameNameVersionGrid({
  name,
  lang,
  onBack,
  onPick,
}: {
  readonly name: string;
  readonly lang: Lang;
  readonly onBack: () => void;
  readonly onPick: (candidate: Candidate) => void;
}) {
  const { t } = useTranslation();
  const versions = useCardsNamed(name, lang);
  return (
    <div className="flex flex-col gap-2">
      <button type="button" className={`${SECONDARY_BUTTON} self-start text-xs`} onClick={onBack}>
        {t('workspace.addCard.backToResults')}
      </button>
      <p aria-live="polite" className="font-semibold">
        {versions.status === 'loading' && t('workspace.addCard.loadingVersions', { name })}
        {versions.status === 'failed' && t('workspace.addCard.versionsFailed', { name })}
        {versions.status === 'found' &&
          t('workspace.addCard.versions', { name, count: versions.cards.length })}
      </p>
      {versions.status === 'found' && (
        <ul
          aria-label={t('workspace.addCard.versionsOf', { name })}
          className="grid max-h-[60dvh] grid-cols-3 gap-2 overflow-y-auto sm:grid-cols-4 md:grid-cols-5"
        >
          {versions.cards.map((candidate, index) => {
            const image = candidate.defaultPrint?.faces[0]?.imageUris.normal;
            return (
              <li key={candidate.card.oracleId}>
                <button
                  type="button"
                  // The grid replaces the row that opened it, so the focus moves into it.
                  autoFocus={index === 0}
                  aria-label={t('workspace.addCard.version', {
                    name: candidate.card.name,
                    version: cardVersionText(candidate, lang, t),
                  })}
                  className="flex w-full flex-col gap-1 rounded-md border-2 border-transparent p-1 text-left hover:border-accent"
                  onClick={() => onPick(candidate)}
                >
                  <span
                    style={CARD_SHAPE}
                    className="relative block w-full overflow-hidden bg-background"
                  >
                    {image && (
                      <img src={image} alt="" className="absolute inset-0 size-full object-cover" />
                    )}
                  </span>
                  <CardVersionCaption candidate={candidate} lang={lang} />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
