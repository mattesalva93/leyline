import { useTranslation } from 'react-i18next';
import { BOARD_PANEL, LABEL } from '../ui/board-styles.ts';
import type { Generator } from '../use-generator.ts';
import { AdSlot } from './AdSlot.tsx';

/** The decklist text, always the source of what the grid shows, with a banner's place at its foot. */
export function DecklistPanel({
  generator,
  className = '',
}: {
  readonly generator: Generator;
  readonly className?: string;
}) {
  const { t } = useTranslation();
  return (
    <section
      aria-labelledby="decklist-panel-title"
      className={`${BOARD_PANEL} flex min-h-0 flex-col overflow-hidden ${className}`}
    >
      <h2
        id="decklist-panel-title"
        className={`${LABEL} shrink-0 border-b-2 border-border bg-raised px-3 py-1`}
      >
        {t('workspace.decklistPanel')}
      </h2>
      <textarea
        id="decklist"
        aria-label={t('decklist.label')}
        spellCheck={false}
        className="min-h-48 flex-1 resize-none bg-transparent p-3 font-mono text-[13px] leading-5 outline-none"
        value={generator.decklistText}
        placeholder={t('decklist.placeholder')}
        onChange={(event) => generator.writeDecklistText(event.target.value)}
        onBlur={generator.resolveEveryLine}
      />
      <p className="shrink-0 px-3 text-xs text-muted-foreground empty:hidden" aria-live="polite">
        {generator.isResolving && t('decklist.resolving')}
      </p>
      {generator.lastResolveFailed && (
        <p role="alert" className="shrink-0 px-3 pb-2 text-xs text-danger">
          {t('decklist.error')}
        </p>
      )}
      <AdSlot className="shrink-0 border-t-2 border-border p-2" />
    </section>
  );
}
