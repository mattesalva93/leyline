import { frontFaceKey, frontFaceName, type Candidate, type Lang } from '@mtg-suite/core';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CARD_SHAPE } from '../card-shape.ts';
import { SECONDARY_BUTTON } from '../ui/board-styles.ts';
import { Icon } from '../ui/Icon.tsx';
import { CardVersionCaption, cardVersionText } from './card-version.tsx';

interface CandidateCarouselProps {
  readonly candidates: readonly Candidate[];
  /** The card language, which the keywords are named in. */
  readonly lang: Lang;
  /**
   * Fills the tile of the card grid it stands in, its controls laid over the image and left
   * out of Tab, which stops on the cell; otherwise it shows the card big, its controls below.
   */
  readonly isInGridCell?: boolean;
  readonly onPick: (oracleId: string) => void;
}

const ARROW =
  'absolute top-1/2 z-10 grid size-7 -translate-y-1/2 place-items-center rounded-full bg-black/60 text-white hover:bg-black/80';

/**
 * The cards an ambiguous line could mean, one at a time, best match first: the arrows step
 * through them and the pick button takes the one shown. Every image is loaded at once and only
 * the one shown is visible, so stepping never waits for an image nor moves the layout.
 */
export function CandidateCarousel({
  candidates,
  lang,
  isInGridCell = false,
  onPick,
}: CandidateCarouselProps) {
  const { t } = useTranslation();
  const [index, setIndex] = useState(0);
  const shownIndex = Math.min(index, candidates.length - 1);
  const shown = candidates[shownIndex];
  if (!shown) return null;
  const sharedName = sharedFrontFaceName(candidates);
  const question = sharedName ? t('line.whichNamed', { name: sharedName }) : t('line.ambiguous');
  const tabIndex = isInGridCell ? -1 : undefined;
  const step = (by: number) => setIndex((shownIndex + by + candidates.length) % candidates.length);
  const position = t('line.candidatePosition', {
    index: shownIndex + 1,
    count: candidates.length,
  });
  const version = cardVersionText(shown, lang, t);

  const images = candidates.map((candidate, candidateIndex) => {
    const image = candidate.defaultPrint?.faces[0]?.imageUris.normal;
    const visibility = candidateIndex === shownIndex ? 'visible' : 'invisible';
    return image ? (
      <img
        key={candidate.card.oracleId}
        src={image}
        // The announcement and the pick button name the card shown.
        alt=""
        className={`absolute inset-0 size-full ${isInGridCell ? 'object-cover object-top' : 'object-contain'} ${visibility}`}
      />
    ) : (
      <span
        key={candidate.card.oracleId}
        className={`absolute inset-0 border-2 border-dashed border-border ${visibility}`}
      />
    );
  });
  const arrows = (
    <>
      <button
        type="button"
        tabIndex={tabIndex}
        aria-label={t('line.previousCandidate')}
        className={`${ARROW} left-1`}
        onClick={() => step(-1)}
      >
        <Icon name="chevronLeft" className="size-4" />
      </button>
      <button
        type="button"
        tabIndex={tabIndex}
        aria-label={t('line.nextCandidate')}
        className={`${ARROW} right-1`}
        onClick={() => step(1)}
      >
        <Icon name="chevronRight" className="size-4" />
      </button>
    </>
  );
  const caption = (
    <span className="min-w-0 flex-1">
      {!sharedName && (
        <span className="block truncate text-[11px] font-semibold">{shown.card.name}</span>
      )}
      <CardVersionCaption candidate={shown} lang={lang} isOverImage={isInGridCell} />
    </span>
  );
  const pick = (
    <button
      type="button"
      tabIndex={tabIndex}
      aria-label={t('line.pickCandidateNamed', { name: shown.card.name, version })}
      className={`${SECONDARY_BUTTON} shrink-0 px-2 py-0.5 text-xs text-foreground`}
      onClick={() => onPick(shown.card.oracleId)}
    >
      {t('line.pickCandidate')}
    </button>
  );
  // Read out on each step, since the image alone does not tell same-named cards apart.
  const announcement = (
    <span aria-live="polite" className="sr-only">
      {t('line.candidateAnnouncement', { position, name: shown.card.name, version })}
    </span>
  );

  return (
    <div
      role="group"
      aria-roledescription={t('line.carousel')}
      aria-label={question}
      className={
        isInGridCell
          ? 'relative min-h-0 flex-1 overflow-hidden rounded-sm bg-black text-white'
          : 'flex w-60 max-w-full flex-col gap-1'
      }
      onKeyDown={(event) => {
        // In a grid cell the arrow keys move between cells.
        if (isInGridCell) return;
        if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
          event.preventDefault();
          step(event.key === 'ArrowLeft' ? -1 : 1);
        }
      }}
    >
      {announcement}
      {isInGridCell ? (
        <>
          {images}
          <p className="absolute inset-x-0 top-0 z-10 flex items-center justify-between gap-1 bg-linear-to-b from-black/80 to-transparent px-2 pt-1 pb-3 text-[11px] font-semibold">
            <span className="truncate">{question}</span>
            <span className="font-mono font-normal">{position}</span>
          </p>
          {arrows}
          <div className="absolute inset-x-0 bottom-0 z-10 flex items-end gap-1 bg-linear-to-t from-black/90 via-black/70 to-transparent px-2 pt-4 pb-1.5">
            {caption}
            {pick}
          </div>
        </>
      ) : (
        <>
          <p className="font-semibold">{question}</p>
          <div style={CARD_SHAPE} className="relative w-full overflow-hidden bg-background">
            {images}
            {arrows}
            <span className="absolute right-1 bottom-1 rounded-sm bg-black/60 px-1 font-mono text-[10px] text-white">
              {position}
            </span>
          </div>
          <div className="flex items-start gap-1">
            {caption}
            {pick}
          </div>
        </>
      )}
    </div>
  );
}

/** The front-face name every candidate shares, or `null` when they are named differently. */
function sharedFrontFaceName(candidates: readonly Candidate[]): string | null {
  const [first, ...others] = candidates;
  if (!first) return null;
  const key = frontFaceKey(first.card.name);
  return others.every(({ card }) => frontFaceKey(card.name) === key)
    ? frontFaceName(first.card.name)
    : null;
}
