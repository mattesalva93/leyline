import { useTranslation } from 'react-i18next';
import { LanguagePicker } from '../LanguagePicker.tsx';
import { BoardPanel } from '../ui/BoardPanel.tsx';
import { PRIMARY_BUTTON } from '../ui/board-styles.ts';
import type { Generator } from '../use-generator.ts';
import { DecklistEditor } from '../decklist-editor/DecklistEditor.tsx';
import { EXAMPLE_DECKLIST } from './example-decklist.ts';
import { GeneratorFeatures } from './GeneratorFeatures.tsx';
import { Tutorial } from './Tutorial.tsx';

/**
 * What the generator shows until a decklist is under way, in place of the workspace. Its start
 * comes first, kept short so that a phone shows it whole: the decklist text, the language of
 * the cards and a way to try the generator on an example. Under it, what the generator can do
 * and how.
 */
export function LandingPage({ generator }: { readonly generator: Generator }) {
  const { t } = useTranslation();
  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-12 px-5 py-5 md:py-10">
        <div className="flex flex-col gap-4 md:gap-5">
          <h1 className="text-3xl leading-none font-bold tracking-tight md:text-6xl">
            {t('landingPage.paste')}
            <br />
            {t('landingPage.pickPrints')}
            <br />
            <span className="bg-accent px-2 text-accent-foreground">{t('landingPage.print')}</span>
          </h1>
          <p className="max-w-xl text-sm text-muted-foreground">{t('landingPage.hint')}</p>
          <BoardPanel title={t('workspace.decklistPanel')} className="shrink-0">
            <DecklistEditor generator={generator} className="h-32 md:h-44" />
          </BoardPanel>
          <div className="flex flex-wrap items-end justify-between gap-x-5 gap-y-3">
            <LanguagePicker
              label={t('app.defaultLang')}
              selectedLang={generator.defaultLang}
              onChange={generator.changeDefaultLanguage}
            />
            <button
              type="button"
              className={PRIMARY_BUTTON}
              onClick={() =>
                generator.loadDecklistText(EXAMPLE_DECKLIST.text, EXAMPLE_DECKLIST.split)
              }
            >
              {t('landingPage.tryExample')}
              <span aria-hidden="true">{t('landingPage.tryExampleArrow')}</span>
            </button>
          </div>
        </div>
        <GeneratorFeatures />
        <Tutorial />
      </div>
    </div>
  );
}
