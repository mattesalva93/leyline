import { useLayoutEffect, useRef } from 'react';

/** Where the caret was in a decklist editor that went away while the user was in it. */
let caretOfEditorGoneWhileFocused: { readonly start: number; readonly end: number } | null = null;

/**
 * Hands the focus and the caret on from the decklist editor that goes away to the one that takes
 * its place, as the generator changes layout (the landing page giving way to the workspace, a
 * resized screen), so the user can keep typing.
 */
export function useFocusKeptAcrossLayouts() {
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
