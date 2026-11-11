import type { ResolvedLine } from '@mtg-suite/core';
import { useTranslation } from 'react-i18next';

interface PrintWarningNoteProps {
  readonly line: ResolvedLine;
  /** Switches the line to English: offered when an English print would look better. */
  readonly onSwitchLineToEnglish: () => void;
}

/** What is wrong with the prints a line's copies use, if anything, and the way out when there is one. */
export function PrintWarningNote({ line, onSwitchLineToEnglish }: PrintWarningNoteProps) {
  const { t } = useTranslation();
  const lineLanguageName = t(`lang.${line.lang}`).toLowerCase();

  if (!line.defaultPrint) {
    const message =
      line.lang === 'en'
        ? t('line.noEnglishPrint')
        : t('line.noPrintInLanguageOrEnglish', { lang: lineLanguageName });
    return <p className="line__note">{message}</p>;
  }
  switch (line.printWarning) {
    case 'languageFallback':
      return <p className="line__note">{t('line.languageFallback', { lang: lineLanguageName })}</p>;
    case 'lowResolutionWithoutEnglish':
      return <p className="line__note">{t('line.lowResolutionWithoutEnglish')}</p>;
    case 'lowResolution':
      return (
        <div className="line__note">
          <p>{t('line.lowResolution')}</p>
          <button type="button" className="button--secondary" onClick={onSwitchLineToEnglish}>
            {t('line.useEnglish')}
          </button>
        </div>
      );
    case null:
      return null;
  }
}
