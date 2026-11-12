import { useTranslation } from 'react-i18next';
import { BoardPanel } from '../ui/BoardPanel.tsx';
import { PRIMARY_BUTTON } from '../ui/board-styles.ts';
import type { Generator } from '../use-generator.ts';
import { DecklistEditor } from './DecklistEditor.tsx';

/**
 * The workspace while no line of the decklist is recognised: what to do, the decklist text and a
 * way to try the generator on an example, at the centre in place of every other zone.
 */
export function EmptyWorkspace({ generator }: { readonly generator: Generator }) {
  const { t } = useTranslation();
  return (
    <div className="m-auto flex w-full max-w-3xl flex-col gap-5 p-5">
      <h1 className="text-4xl leading-none font-bold tracking-tight md:text-6xl">
        {t('workspace.emptyState.paste')}
        <br />
        {t('workspace.emptyState.pickPrints')}
        <br />
        <span className="bg-accent px-2 text-accent-foreground">
          {t('workspace.emptyState.print')}
        </span>
      </h1>
      <p className="max-w-xl text-sm text-muted-foreground">{t('workspace.emptyState.hint')}</p>
      <BoardPanel title={t('workspace.decklistPanel')} className="shrink-0">
        <DecklistEditor generator={generator} className="h-44" />
      </BoardPanel>
      <div>
        <button type="button" className={PRIMARY_BUTTON}>
          {t('workspace.emptyState.tryExample')}
        </button>
      </div>
    </div>
  );
}
