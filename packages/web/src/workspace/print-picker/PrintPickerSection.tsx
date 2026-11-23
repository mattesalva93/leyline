import type { ResolvedLine } from '@mtg-suite/core';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { GuidedStepBubble, type GuidedStepPlacement } from '../guide/GuidedStepBubble.tsx';
import { PRINT_PICKER } from './print-picker-marks.ts';

/**
 * The region holding the print picker of `line`, whatever its parts and their layout, with the
 * bubble of the guided step that changes a print standing at `guidedStepPlacement`.
 */
export function PrintPickerSection({
  line,
  guidedStepPlacement,
  className = '',
  children,
}: {
  readonly line: ResolvedLine;
  readonly guidedStepPlacement: GuidedStepPlacement;
  readonly className?: string;
  readonly children: ReactNode;
}) {
  const { t } = useTranslation();
  return (
    <GuidedStepBubble guidedStep="changePrint" placement={guidedStepPlacement}>
      <section
        {...{ [PRINT_PICKER]: '' }}
        aria-label={t('printPicker.title', { name: line.card.name })}
        className={className}
      >
        {children}
      </section>
    </GuidedStepBubble>
  );
}
