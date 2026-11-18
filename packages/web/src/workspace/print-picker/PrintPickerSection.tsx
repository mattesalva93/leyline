import type { ResolvedLine } from '@mtg-suite/core';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { PRINT_PICKER } from './print-picker-marks.ts';

/** The region holding the print picker of `line`, whatever its parts and their layout. */
export function PrintPickerSection({
  line,
  className = '',
  children,
}: {
  readonly line: ResolvedLine;
  readonly className?: string;
  readonly children: ReactNode;
}) {
  const { t } = useTranslation();
  return (
    <section
      {...{ [PRINT_PICKER]: '' }}
      aria-label={t('printPicker.title', { name: line.card.name })}
      className={className}
    >
      {children}
    </section>
  );
}
