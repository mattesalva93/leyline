import { useLayoutEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import type { Generator } from '../use-generator.ts';

/** Where the caret was in a decklist editor that went away while the user was in it. */
let caretOfEditorGoneWhileFocused: { readonly start: number; readonly end: number } | null = null;

/**
 * Hands the focus and the caret on from the editor that goes away to the one that takes its place,
 * as the workspace changes layout (the first recognised line, a resized screen), so the user can
 * keep typing.
 */
function useFocusKeptAcrossLayouts() {
  const ref = useRef<HTMLTextAreaElement>(null);
  useLayoutEffect(() => {
    const textarea = ref.current;
    if (textarea && caretOfEditorGoneWhileFocused) {
      textarea.focus();
      textarea.setSelectionRange(
        caretOfEditorGoneWhileFocused.start,
        caretOfEditorGoneWhileFocused.end,
      );
    }
    caretOfEditorGoneWhileFocused = null;
    return () => {
      // Runs while the textarea is still in the page, before React removes it.
      if (textarea && document.activeElement === textarea) {
        caretOfEditorGoneWhileFocused = {
          start: textarea.selectionStart,
          end: textarea.selectionEnd,
        };
      }
    };
  }, []);
  return ref;
}

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
