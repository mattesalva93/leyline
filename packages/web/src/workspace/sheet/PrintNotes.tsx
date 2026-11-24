import { CARD_MM } from '@leyline/core';
import { useTranslation } from 'react-i18next';

/** What to know before printing: print at actual size, what the printed proxies are for, and how many lines will be left out. */
export function PrintNotes({ unprintedCount }: { readonly unprintedCount: number }) {
  const { t } = useTranslation();
  return (
    <>
      <p className="font-semibold" role="note">
        {t('pdf.printAtActualSize', { width: CARD_MM.width, height: CARD_MM.height })}
      </p>
      <p role="note">{t('proxyUse')}</p>
      {unprintedCount > 0 && (
        <p className="text-warning" role="status">
          {t('pdf.unprinted', { count: unprintedCount })}
        </p>
      )}
    </>
  );
}
