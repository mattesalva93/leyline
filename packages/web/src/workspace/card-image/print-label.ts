import type { Print } from '@leyline/core';
import type { TFunction } from 'i18next';

/** How the UI names a print: its set code and collector number, as printed on the card. */
export function setAndNumberOf(print: Print, t: TFunction): string {
  return t('printPicker.setAndNumber', {
    set: print.set.toUpperCase(),
    number: print.collectorNumber,
  });
}
