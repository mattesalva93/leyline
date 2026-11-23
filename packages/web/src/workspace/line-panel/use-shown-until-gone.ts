import { useState } from 'react';

/**
 * `shown` while `isOpen`; once closed, the last `shown` while open, so a panel sliding away keeps
 * what it showed rather than going blank before it leaves.
 */
export function useShownUntilGone<T extends Record<string, unknown>>(shown: T, isOpen: boolean): T {
  const [lastShownOpen, setLastShownOpen] = useState(shown);
  const hasChanged = Object.keys(shown).some((key) => shown[key] !== lastShownOpen[key]);
  if (isOpen && hasChanged) setLastShownOpen(shown);
  return isOpen ? shown : lastShownOpen;
}
