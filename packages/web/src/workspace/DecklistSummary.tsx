import { useTranslation } from 'react-i18next';
import { LanguagePicker } from '../LanguagePicker.tsx';
import type { Generator } from '../use-generator.ts';

/** The settings of the whole decklist, shown while no tile is selected. */
export function DecklistSummary({ generator }: { readonly generator: Generator }) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col gap-3">
      <LanguagePicker
        label={t('app.defaultLang')}
        selectedLang={generator.defaultLang}
        onChange={generator.changeDefaultLanguage}
      />
      <p className="text-sm text-muted-foreground">{t('workspace.selectTileHint')}</p>
    </div>
  );
}
