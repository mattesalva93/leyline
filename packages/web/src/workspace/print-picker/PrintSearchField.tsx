import { MAX_PRINT_QUERY_LENGTH } from '@mtg-suite/core';
import { useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { ESCAPE_EMPTIES_FIELD } from '../../ui/Dialog.tsx';
import { FIELD, SYMBOL_BUTTON } from '../../ui/board-styles.ts';
import type { PrintQuery } from './use-print-query.ts';

/** The field the user narrows the prints of the print picker with, and the ✕ that empties it. */
export function PrintSearchField({
  printQuery,
  className = '',
}: {
  readonly printQuery: PrintQuery;
  readonly className?: string;
}) {
  const { t } = useTranslation();
  const searchFieldRef = useRef<HTMLInputElement>(null);
  return (
    <div className={`flex items-center gap-1 ${className}`}>
      <input
        ref={searchFieldRef}
        type="search"
        aria-label={t('printPicker.search')}
        placeholder={t('printPicker.search')}
        autoComplete="off"
        // Longer than the server takes would answer an error, not prints.
        maxLength={MAX_PRINT_QUERY_LENGTH}
        // The ✕ beside the field empties it: no second one from the browser.
        className={`${FIELD} min-w-0 flex-1 [&::-webkit-search-cancel-button]:appearance-none`}
        value={printQuery.typed}
        onChange={(event) => printQuery.type(event.target.value)}
        onKeyDown={(event) => {
          if (event.key !== 'Escape' || printQuery.typed === '') return;
          // Handled here: the panel around the picker leaves the tile be.
          event.preventDefault();
          printQuery.clear();
        }}
        {...(printQuery.typed === '' ? {} : { [ESCAPE_EMPTIES_FIELD]: '' })}
      />
      {printQuery.typed !== '' && (
        <button
          type="button"
          className={SYMBOL_BUTTON}
          aria-label={t('printPicker.clearSearch')}
          onClick={() => {
            printQuery.clear();
            searchFieldRef.current?.focus();
          }}
        >
          {t('printPicker.clearSymbol')}
        </button>
      )}
    </div>
  );
}
