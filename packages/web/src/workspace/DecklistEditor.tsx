import { useTranslation } from 'react-i18next';
import type { Generator } from '../use-generator.ts';
import { useFocusKeptAcrossLayouts } from './use-focus-kept-across-layouts.ts';

/** The decklist text, always the source of what the grid shows, with how its recognition went. */
export function DecklistEditor({
  generator,
  className = '',
}: {
  readonly generator: Generator;
  readonly className?: string;
}) {
  const { t } = useTranslation();
  const ref = useFocusKeptAcrossLayouts();
  return (
    <>
      <textarea
        ref={ref}
        id="decklist"
        aria-label={t('decklist.label')}
        spellCheck={false}
        className={`resize-none bg-transparent p-3 font-mono text-[13px] leading-5 outline-none ${className}`}
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
    </>
  );
}
