import type { Candidate } from '@mtg-suite/core';
import { SECONDARY_BUTTON } from '../ui/board-styles.ts';

/** One button per card an ambiguous line could mean, best match first. */
export function CandidateButtons({
  candidates,
  onPick,
}: {
  readonly candidates: readonly Candidate[];
  readonly onPick: (oracleId: string) => void;
}) {
  return (
    <div className="flex min-h-0 flex-col gap-1 overflow-y-auto">
      {candidates.map(({ card }) => (
        <button
          key={card.oracleId}
          type="button"
          className={`${SECONDARY_BUTTON} px-2 py-1 text-left text-xs`}
          onClick={() => onPick(card.oracleId)}
        >
          {card.name}
        </button>
      ))}
    </div>
  );
}
