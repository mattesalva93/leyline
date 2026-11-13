import type { PrintCountsByLang } from '@mtg-suite/core';
import { useEffect, useState } from 'react';
import { fetchPrintCounts } from './api.ts';

/**
 * How many prints the card `oracleId` can print with in each language; `null` until the server
 * answers, and for good if it fails: the counts are a help, nothing waits for them.
 */
export function usePrintCounts(oracleId: string): PrintCountsByLang | null {
  const [counts, setCounts] = useState<{
    readonly oracleId: string;
    readonly byLang: PrintCountsByLang;
  } | null>(null);
  useEffect(() => {
    let isCurrent = true;
    fetchPrintCounts(oracleId).then(
      (byLang) => isCurrent && setCounts({ oracleId, byLang }),
      () => {},
    );
    return () => {
      isCurrent = false;
    };
  }, [oracleId]);
  // Another card's counts never show, even before its own arrive.
  return counts?.oracleId === oracleId ? counts.byLang : null;
}
