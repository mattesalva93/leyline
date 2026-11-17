import type { SuggestedToken } from '@mtg-suite/core';
import { useTranslation } from 'react-i18next';
import { LABEL, SECONDARY_BUTTON } from '../ui/board-styles.ts';

/** A token as the list names it: its name, then the set and number its line is written with. */
function tokenLabel({ candidate: { card, defaultPrint } }: SuggestedToken): string {
  return `${card.name} (${defaultPrint.set.toUpperCase()} ${defaultPrint.collectorNumber})`;
}

/**
 * The tokens the decklist's cards create, each with a button that adds it to the decklist, and
 * one that adds them all. Nothing shows while there is none. Kept minimal until its design.
 */
export function SuggestedTokens({
  tokens,
  onAdd,
}: {
  readonly tokens: readonly SuggestedToken[];
  readonly onAdd: (tokens: readonly SuggestedToken[]) => void;
}) {
  const { t } = useTranslation();
  if (tokens.length === 0) return null;
  const title = t('suggestedTokens.title');
  return (
    <section aria-label={title} className="mb-4 flex flex-col gap-2">
      <h2 className={LABEL}>{title}</h2>
      <ul className="flex flex-wrap gap-2">
        {tokens.map((token) => (
          <li key={token.candidate.card.oracleId}>
            <button type="button" className={SECONDARY_BUTTON} onClick={() => onAdd([token])}>
              {t('suggestedTokens.add', { token: tokenLabel(token) })}
            </button>
          </li>
        ))}
      </ul>
      <button
        type="button"
        className={`${SECONDARY_BUTTON} self-start`}
        onClick={() => onAdd(tokens)}
      >
        {t('suggestedTokens.addAll')}
      </button>
    </section>
  );
}
