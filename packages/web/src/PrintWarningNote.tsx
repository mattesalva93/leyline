import type { ResolvedLine } from '@mtg-suite/core';
import { useTranslation } from 'react-i18next';

interface PrintWarningNoteProps {
  readonly line: ResolvedLine;
  /** Switches the line to English: offered when its print is low-resolution. */
  readonly onUseEnglish: () => void;
}

/** What is wrong with a line's default print, if anything, and the way out. */
export function PrintWarningNote({ line, onUseEnglish }: PrintWarningNoteProps) {
  const { t } = useTranslation();
  const lang = t(`lang.${line.lang}`).toLowerCase();
  if (line.printWarning === 'languageFallback') {
    return <p className="line__note">{t('line.languageFallback', { lang })}</p>;
  }
  if (line.printWarning === 'lowResolution') {
    return (
      <div className="line__note">
        <p>{t('line.lowResolution')}</p>
        <button type="button" className="button--secondary" onClick={onUseEnglish}>
          {t('line.useEnglish')}
        </button>
      </div>
    );
  }
  if (!line.defaultPrint) return <p className="line__note">{t('line.noPrint')}</p>;
  return null;
}
