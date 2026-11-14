// Owned tab components on the Radix primitive (ADR 0010): Radix handles the tablist, tab and
// tabpanel roles and the arrow keys between the tabs; the look is ours.
import * as RadixTabs from '@radix-ui/react-tabs';
import type { ReactNode } from 'react';

export const Tabs = RadixTabs.Root;
export const TabList = RadixTabs.List;
export const TabPanel = RadixTabs.Content;

/** A tab labelled in words, the selected one inked in. */
export function Tab({ value, children }: { readonly value: string; readonly children: ReactNode }) {
  return (
    <RadixTabs.Trigger
      value={value}
      className="rounded-md border-2 border-border px-4 py-1.5 text-lg font-bold tracking-tight hover:bg-accent hover:text-accent-foreground data-[state=active]:bg-foreground data-[state=active]:text-panel"
    >
      {children}
    </RadixTabs.Trigger>
  );
}
