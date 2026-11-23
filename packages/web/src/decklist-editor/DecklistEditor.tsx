import { useTranslation } from 'react-i18next';
import {
  GuidedStepAnchor,
  type GuidedStepPlacement,
} from '../workspace/guide/GuidedStepAnchor.tsx';
import type { Guide } from '../workspace/guide/use-guide.ts';
import { LoadingSpinner } from '../ui/LoadingSpinner.tsx';
import type { Generator } from '../generator/use-generator.ts';
import { NewDecklistButton } from './NewDecklistButton.tsx';
import { textAfterPasteAtEnd } from './paste-at-end.ts';
import { useFocusKeptAcrossLayouts } from './use-focus-kept-across-layouts.ts';

/**
 * The decklist text, always the source of what the grid shows, with how its recognition went
 * and, once there is something to empty, the way to a new decklist. The guided step that starts
 * the decklist stands at `guidedStepPlacement` by the text.
 */
export function DecklistEditor({
  generator,
  guide,
  guidedStepPlacement,
  className = '',
}: {
  readonly generator: Generator;
  readonly guide: Guide;
  readonly guidedStepPlacement: GuidedStepPlacement;
  readonly className?: string;
}) {
  const { t } = useTranslation();
  const ref = useFocusKeptAcrossLayouts();
  return (
    <>
      <GuidedStepAnchor guide={guide} step="startDecklist" placement={guidedStepPlacement}>
        <textarea
          ref={ref}
          id="decklist"
          aria-label={t('decklist.label')}
          spellCheck={false}
          className={`resize-none bg-transparent p-3 font-mono text-[13px] leading-5 outline-none ${className}`}
          value={generator.decklistText}
          placeholder={t('decklist.placeholder')}
          onChange={(event) =>
            generator.writeDecklistText(event.target.value, event.target.selectionEnd)
          }
          onPaste={(event) => {
            const decklistTextarea = event.currentTarget;
            const nextText = textAfterPasteAtEnd(
              decklistTextarea.value,
              {
                pasteStart: decklistTextarea.selectionStart,
                pasteEnd: decklistTextarea.selectionEnd,
              },
              event.clipboardData.getData('text/plain'),
            );
            if (nextText === null) return;
            event.preventDefault();
            // Setting a textarea's value puts the caret at its end: on the new empty line.
            generator.writeDecklistText(nextText, nextText.length);
          }}
          onBlur={generator.resolveEveryLine}
        />
      </GuidedStepAnchor>
      <p className="shrink-0 px-3 text-xs text-muted-foreground empty:hidden" aria-live="polite">
        {generator.isResolving && <LoadingSpinner label={t('decklist.resolving')} />}
      </p>
      {generator.lastResolveFailed && (
        <p role="alert" className="shrink-0 px-3 pb-2 text-xs text-danger">
          {t('decklist.error')}
        </p>
      )}
      {generator.decklistText !== '' && (
        <NewDecklistButton
          onConfirm={generator.startNewDecklist}
          className="mx-3 mb-3 self-start"
        />
      )}
    </>
  );
}
