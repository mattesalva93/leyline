import { useTranslation } from 'react-i18next';
import { LanguagePicker } from '../LanguagePicker.tsx';
import { LABEL, SECONDARY_BUTTON } from '../ui/board-styles.ts';
import { Icon } from '../ui/Icon.tsx';
import type { WorkspaceState } from './workspace-state.ts';

/**
 * The decklist as a whole, shown while no tile is selected: how many cards and pages it makes,
 * the way to its first line to fix, and the language of its cards.
 */
export function DecklistSummary({
  state: { generator, linesToFix, selectFirstLineToFix },
}: {
  readonly state: WorkspaceState;
}) {
  const { t } = useTranslation();
  const counts = [
    ['cards', generator.cardCount],
    ['pages', generator.pageCount],
  ] as const;
  return (
    <div className="flex flex-col gap-3">
      <dl className="grid grid-cols-2 gap-3">
        {counts.map(([name, count]) => (
          <div key={name} className="rounded-md border-2 border-border p-2">
            <dt className={LABEL}>{t(`summary.${name}`)}</dt>
            <dd className="font-mono text-2xl font-bold tabular-nums">{count}</dd>
          </div>
        ))}
      </dl>
      {linesToFix.length > 0 && (
        <button
          type="button"
          className={`${SECONDARY_BUTTON} flex items-center gap-2 text-left text-danger`}
          onClick={selectFirstLineToFix}
        >
          <Icon name="warning" />
          {t('summary.linesToFix', { count: linesToFix.length })}
        </button>
      )}
      <LanguagePicker
        label={t('app.defaultLang')}
        selectedLang={generator.defaultLang}
        onChange={generator.changeDefaultLanguage}
      />
      <p className="text-sm text-muted-foreground">{t('workspace.selectTileHint')}</p>
    </div>
  );
}
