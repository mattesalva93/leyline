import { useTranslation } from 'react-i18next';

const ALTERNATE_NAME_TAG_CLASSES =
  'inline-block w-fit shrink-0 rounded-sm border border-muted-foreground px-1 font-sans text-[10px] leading-4 font-normal text-muted-foreground';

interface AlternateNameTagProps {
  /** The alternate name a print carries; `null` for a print without one. */
  readonly alternateName: string | null;
  /** The name of the card the print is, which the alternate name stands for. */
  readonly cardName: string;
  /** Whether the tag shows the alternate name itself, where there is room for it. */
  readonly showsAlternateName?: boolean;
}

/**
 * Tags a print that carries an alternate name: plain information, never a `PrintWarning`, so it
 * keeps the muted colour and stays out of the warnings' marks and notes.
 */
export function AlternateNameTag({
  alternateName,
  cardName,
  showsAlternateName = false,
}: AlternateNameTagProps) {
  const { t } = useTranslation();
  if (alternateName === null) return null;
  return (
    <span
      className={ALTERNATE_NAME_TAG_CLASSES}
      title={t('alternateName.meaning', { alternateName, name: cardName })}
    >
      {showsAlternateName
        ? t('alternateName.tagWithName', { alternateName })
        : t('alternateName.tag')}
    </span>
  );
}
