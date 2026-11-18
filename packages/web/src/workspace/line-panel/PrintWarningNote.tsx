import type { PrintWarning, ResolvedLine } from '@mtg-suite/core';
import { useTranslation } from 'react-i18next';
import { SECONDARY_BUTTON } from '../../ui/board-styles.ts';

const NOTE = 'flex flex-col items-start gap-2 text-sm text-warning';

interface PrintWarningNoteProps {
  readonly line: ResolvedLine;
  /** The warning to explain: the one of the tile the user is looking at. */
  readonly warning: PrintWarning | null;
  /** Shows the English prints in the print picker: offered when one would look better. */
  readonly onShowEnglishPrints: () => void;
}

/** What is wrong with a print of the line, if anything, and the way out when there is one. */
export function PrintWarningNote({ line, warning, onShowEnglishPrints }: PrintWarningNoteProps) {
  const { t } = useTranslation();
  const lineLanguageName = t(`lang.${line.lang}`).toLowerCase();

  if (!line.defaultPrint) {
    const message =
      line.lang === 'en'
        ? t('line.noEnglishPrint')
        : t('line.noPrintInLanguageOrEnglish', { lang: lineLanguageName });
    return <p className={NOTE}>{message}</p>;
  }
  switch (warning) {
    case 'languageFallback':
      return <p className={NOTE}>{t('line.languageFallback', { lang: lineLanguageName })}</p>;
    case 'lowResolutionWithoutEnglish':
      return <p className={NOTE}>{t('line.lowResolutionWithoutEnglish')}</p>;
    case 'lowResolution':
      return (
        <div className={NOTE}>
          <p>{t('line.lowResolution')}</p>
          <button type="button" className={SECONDARY_BUTTON} onClick={onShowEnglishPrints}>
            {t('line.showEnglishPrints')}
          </button>
        </div>
      );
    case null:
      return null;
  }
}
