import type { Print } from '@leyline/core';
import { useTranslation } from 'react-i18next';

const TAG =
  'inline-block w-fit shrink-0 rounded-sm border border-muted-foreground px-1 font-sans text-[10px] leading-4 font-normal text-muted-foreground';

interface AlternateNameTagProps {
  readonly print: Print;
  /** The name of the card the print is, which the alternate name stands for. */
  readonly cardName: string;
  /** Whether the tag spells the alternate name out, where there is room for it. */
  readonly spellsName?: boolean;
}

/**
 * Tags a print that carries an alternate name: plain information, never a `PrintWarning`, so it
 * keeps the muted colour and stays out of the warnings' marks and notes. Nothing for a print
 * without one.
 */
export function AlternateNameTag({ print, cardName, spellsName = false }: AlternateNameTagProps) {
  const { t } = useTranslation();
  const alternateName = print.flavorName;
  if (alternateName === null) return null;
  return (
    <span className={TAG} title={t('alternateName.meaning', { alternateName, name: cardName })}>
      {spellsName ? t('alternateName.tagWithName', { alternateName }) : t('alternateName.tag')}
    </span>
  );
}
