import type { Lang } from '@mtg-suite/core';
import { useTranslation } from 'react-i18next';
import { LanguagePicker } from '../LanguagePicker.tsx';

/** The settings of the whole decklist, shown while no tile is selected. */
export function DecklistSummary({
  defaultLang,
  onDefaultLangChange,
}: {
  readonly defaultLang: Lang;
  readonly onDefaultLangChange: (lang: Lang) => void;
}) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col gap-3">
      <LanguagePicker
        label={t('app.defaultLang')}
        selectedLang={defaultLang}
        onChange={onDefaultLangChange}
      />
      <p className="text-sm text-muted-foreground">{t('workspace.selectTileHint')}</p>
    </div>
  );
}
