import { useTranslation } from 'react-i18next';
import type { Generator } from '../../generator/use-generator.ts';
import { LanguagePicker } from '../../language/LanguagePicker.tsx';
import { PRIMARY_BUTTON } from '../../ui/board-styles.ts';
import { EXAMPLE_DECKLIST } from './example-decklist.ts';

/**
 * What the workspace shows while no decklist is under way, in place of the grid: an invite to
 * paste or write the decklist, the language of its cards and a way to try the generator on an
 * example.
 */
export function EmptyWorkspaceInvite({
  generator,
  className = '',
}: {
  readonly generator: Generator;
  readonly className?: string;
}) {
  const { t } = useTranslation();
  return (
    <div className={`flex flex-col items-start gap-4 ${className}`}>
      <p className="max-w-xl text-sm text-muted-foreground">{t('emptyWorkspace.invite')}</p>
      <LanguagePicker
        label={t('app.defaultLang')}
        selectedLang={generator.defaultLang}
        onChange={generator.changeDefaultLanguage}
      />
      <button
        type="button"
        className={PRIMARY_BUTTON}
        onClick={() => generator.loadDecklistText(EXAMPLE_DECKLIST.text, EXAMPLE_DECKLIST.split)}
      >
        {t('emptyWorkspace.tryExample')}
        <span aria-hidden="true">{t('emptyWorkspace.tryExampleArrow')}</span>
      </button>
    </div>
  );
}
