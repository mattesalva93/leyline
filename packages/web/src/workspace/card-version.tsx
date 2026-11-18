import type { Candidate, Lang } from '@mtg-suite/core';
import type { TFunction } from 'i18next';
import { useTranslation } from 'react-i18next';
import { powerToughnessAndKeywordsOf } from '../power-toughness-and-keywords.ts';
import { setAndNumberOf } from '../print-label.ts';

/**
 * What tells apart cards sharing a name, as a screen reader reads it: the set and number of the
 * default print, then the power, toughness and keywords in the card language.
 */
export function cardVersionText(candidate: Candidate, lang: Lang, t: TFunction): string {
  return [
    candidate.defaultPrint && setAndNumberOf(candidate.defaultPrint, t),
    powerToughnessAndKeywordsOf(candidate.card, lang),
  ]
    .filter(Boolean)
    .join(', ');
}

/**
 * `cardVersionText` as it shows: the set and number in bold, the power, toughness and keywords
 * beside them in a light weight, wrapping under them. None of it is ever cut, so it grows past
 * two lines when it must; up to two it keeps the height of two, so stepping through versions
 * moves nothing around it.
 */
export function CardVersionCaption({
  candidate,
  lang,
  isOverImage = false,
}: {
  readonly candidate: Candidate;
  readonly lang: Lang;
  /** Light text for a caption laid over a dark band on the card image. */
  readonly isOverImage?: boolean;
}) {
  const { t } = useTranslation();
  const print = candidate.defaultPrint;
  return (
    <span aria-hidden className="block min-h-[2lh] text-[11px] leading-tight">
      {print && <span className="font-semibold">{setAndNumberOf(print, t)} </span>}
      <span className={`font-light ${isOverImage ? 'text-white/80' : 'text-muted-foreground'}`}>
        {powerToughnessAndKeywordsOf(candidate.card, lang)}
      </span>
    </span>
  );
}
