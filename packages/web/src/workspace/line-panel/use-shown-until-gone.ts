import { useState } from 'react';

/**
 * `content` while `isOpen`; once closed, the last `content` it had open, so a panel sliding away
 * keeps what it showed rather than going blank before it leaves.
 */
export function useShownUntilGone<T extends Record<string, unknown>>(
  content: T,
  isOpen: boolean,
): T {
  const [lastOpenContent, setLastOpenContent] = useState(content);
  const hasChanged = Object.keys(content).some((key) => content[key] !== lastOpenContent[key]);
  if (isOpen && hasChanged) setLastOpenContent(content);
  return isOpen ? content : lastOpenContent;
}
