import { useId } from 'react';

/**
 * What is loading, in words, after a turning ring: the ring is an indeterminate progress bar
 * named by the words, so a screen reader finds what it waits for.
 */
export function LoadingSpinner({ label }: { readonly label: string }) {
  const labelId = useId();
  return (
    <span className="inline-flex items-center gap-2">
      <span
        role="progressbar"
        aria-labelledby={labelId}
        className="size-3.5 shrink-0 animate-loading-turn rounded-full border-2 border-current border-t-transparent"
      />
      <span id={labelId}>{label}</span>
    </span>
  );
}
