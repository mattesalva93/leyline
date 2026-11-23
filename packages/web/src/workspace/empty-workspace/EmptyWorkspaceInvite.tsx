import { useTranslation } from 'react-i18next';
import type { Generator } from '../../generator/use-generator.ts';
import { LanguagePicker } from '../../language/LanguagePicker.tsx';
import { PRIMARY_BUTTON } from '../../ui/board-styles.ts';
import { EXAMPLE_DECKLIST } from './example-decklist.ts';
import { GUIDE_SPOTLIT } from '../guide/GuideSpotlight.tsx';

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
    // Lit by the guide's spotlight: the first guided step points to its example button too.
    <div {...GUIDE_SPOTLIT} className={`flex flex-col items-start gap-4 ${className}`}>
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
