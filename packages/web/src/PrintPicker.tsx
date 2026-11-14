import {
  allocateEveryCopy,
  copiesByPrint,
  MAX_PRINT_QUERY_LENGTH,
  releaseYearOf,
  type AllocationChoice,
  type Print,
  type PrintCountsByLang,
  type ResolvedLine,
} from '@mtg-suite/core';
import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { setAndNumberOf } from './print-label.ts';
import { PRINT_TILE_GAP, PRINT_TILE_MIN_WIDTH } from './print-picker-geometry.ts';
import { SMALL_IMAGE } from './scryfall-image-sizes.ts';
import { ESCAPE_EMPTIES_FIELD } from './ui/Dialog.tsx';
import { FIELD, SECONDARY_BUTTON, SYMBOL_BUTTON } from './ui/board-styles.ts';
import type { PrintPages } from './use-print-pages.ts';
import type { PrintPickerView } from './use-print-picker-view.ts';
import type { PrintQuery } from './use-print-query.ts';
import { PRINT_PICKER_ZOOM_WAIT_MS, useZoomedCard } from './use-zoomed-card.tsx';
import { CARD_SHAPE } from './card-shape.ts';
import { LanguagePicker } from './LanguagePicker.tsx';

/** Marks the element that scrolls the print picker: more prints load as its end comes near. */
export const PRINT_PICKER_SCROLL_ROOT = 'data-print-picker-scroll-root';

/** Marks the whole print picker, which a zoomed print stands beside. */
const PRINT_PICKER = 'data-print-picker';

/** Spread on the element that scrolls the print picker, to mark it. */
export const PRINT_PICKER_SCROLL_ROOT_PROPS = { [PRINT_PICKER_SCROLL_ROOT]: '' };

const COUNTER_BUTTON =
  'grid size-7 place-items-center rounded-sm border-2 border-border bg-panel font-mono font-bold leading-none disabled:opacity-40';

interface PrintPickerProps {
  /** The line whose copies the picker allocates: the prints its copies use are marked. */
  readonly line: ResolvedLine;
  /** The language of the prints shown, and the print to bring into view. */
  readonly pickerView: PrintPickerView;
  /** How many prints the card has in each language; `null` while not known. */
  readonly printCounts: PrintCountsByLang | null;
  /** What the user typed to narrow the prints, which `printPages` are already narrowed by. */
  readonly printQuery: PrintQuery;
  /** The prints of the card in the picker view's language: copies can go to prints of either one. */
  readonly printPages: PrintPages;
  /** Called with the allocations a tap on a print sets: every copy on it. */
  readonly onAllocationChoice: (allocations: AllocationChoice) => void;
  /** Called by a print's +/− counter with the copies it now prints, the line's changing as many. */
  readonly onPrintQuantityChange: (print: Print, quantity: number) => void;
}

interface ReleaseYear {
  readonly year: string;
  readonly prints: readonly Print[];
}

/** Prints already newest first, cut where the release year changes. */
function byReleaseYear(prints: readonly Print[]): ReleaseYear[] {
  const years: { year: string; prints: Print[] }[] = [];
  for (const print of prints) {
    const year = releaseYearOf(print);
    const last = years.at(-1);
    if (last?.year === year) last.prints.push(print);
    else years.push({ year, prints: [print] });
  }
  return years;
}

/**
 * The grid of the prints a line can use, grouped by release year, newest first; a print query
 * typed above it narrows them. Tapping a print
 * puts every copy on it; its +/− counter adds or takes off one copy of the line on that print.
 * More prints load as the user scrolls near the end of the grid, or until the print to show is
 * among them. A print the pointer rests on shows enlarged beside the picker.
 */
export function PrintPicker({
  line,
  pickerView: { printsLang, changePrintsLang, printToShow, onPrintShown },
  printCounts,
  printQuery,
  printPages,
  onAllocationChoice,
  onPrintQuantityChange,
}: PrintPickerProps) {
  const { t } = useTranslation();
  const endOfGridRef = useRef<HTMLDivElement>(null);
  const printButtons = useRef(new Map<string, HTMLButtonElement>());
  const { zoomOn, zoomedCard } = useZoomedCard(PRINT_PICKER_ZOOM_WAIT_MS);
  const { prints, total, hasMore, isLoading, lastRequestFailed, loadMore } = printPages;
  const searchFieldRef = useRef<HTMLInputElement>(null);
  const isSearching = printQuery.searched !== '';

  useEffect(() => {
    const endOfGrid = endOfGridRef.current;
    if (!endOfGrid || !hasMore || lastRequestFailed) return;
    // The panel scrolls, not the page: watch the end of the grid inside it, a little early.
    const observer = new IntersectionObserver(
      (entries) => entries.some((entry) => entry.isIntersecting) && loadMore(),
      { root: endOfGrid.closest(`[${PRINT_PICKER_SCROLL_ROOT}]`), rootMargin: '0px 0px 50% 0px' },
    );
    observer.observe(endOfGrid);
    return () => observer.disconnect();
    // A new observer per page: it reports at once if the end is still in sight.
  }, [prints.length, hasMore, lastRequestFailed, loadMore]);

  // Loads page after page until the print to show is among them, then brings it into view.
  useEffect(() => {
    if (printToShow === null) return;
    const button = printButtons.current.get(printToShow);
    if (button) {
      button.scrollIntoView({ block: 'nearest' });
      button.focus({ preventScroll: true });
      onPrintShown();
    } else if (!hasMore) onPrintShown();
    else if (!isLoading && !lastRequestFailed) loadMore();
  }, [printToShow, prints, hasMore, isLoading, lastRequestFailed, loadMore, onPrintShown]);

  const copiesOfEachPrint = new Map(
    copiesByPrint(line).map(({ print, quantity }) => [print.id, quantity]),
  );

  return (
    <section
      {...{ [PRINT_PICKER]: '' }}
      aria-label={t('printPicker.title', { name: line.card.name })}
    >
      <h3 className="flex items-baseline justify-between font-semibold">
        {t('panel.prints')}
        {total !== null && (
          <span className="font-mono text-xs text-muted-foreground">
            {t(isSearching ? 'printPicker.foundCount' : 'panel.printCount', { count: total })}
          </span>
        )}
      </h3>
      <LanguagePicker
        label={t('printPicker.lang')}
        selectedLang={printsLang}
        onChange={changePrintsLang}
        printCounts={printCounts}
      />
      <div className="mt-2 flex items-center gap-1">
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
      {isSearching && total === 0 && (
        <p className="mt-3 text-muted-foreground">
          {t('printPicker.noMatch', { query: printQuery.searched })}
        </p>
      )}
      {byReleaseYear(prints).map(({ year, prints: printsOfYear }) => (
        <section key={year} aria-label={year}>
          <h4 className="mt-3 mb-1.5 font-mono text-xs font-bold">{year}</h4>
          <ul
            className="grid"
            style={{
              gap: PRINT_TILE_GAP,
              gridTemplateColumns: `repeat(auto-fill, minmax(${PRINT_TILE_MIN_WIDTH}px, 1fr))`,
            }}
          >
            {printsOfYear.map((print) => {
              const frontFace = print.faces[0];
              const copies = copiesOfEachPrint.get(print.id) ?? 0;
              const usedByLine = copies > 0;
              const setAndNumber = setAndNumberOf(print, t);
              return (
                <li
                  key={print.id}
                  className={`flex flex-col rounded-md border-2 p-1 text-center text-xs ${usedByLine ? 'border-link' : 'border-transparent'}`}
                >
                  <button
                    type="button"
                    className="flex flex-col"
                    aria-pressed={usedByLine}
                    ref={(element) => {
                      if (element) printButtons.current.set(print.id, element);
                      else printButtons.current.delete(print.id);
                    }}
                    onClick={() => onAllocationChoice(allocateEveryCopy(line, print))}
                    // Beside the whole picker, so the zoomed card hides none of the other prints.
                    {...zoomOn(frontFace, `[${PRINT_PICKER}]`)}
                  >
                    {frontFace && (
                      <img
                        className="block w-full"
                        style={CARD_SHAPE}
                        src={frontFace.imageUris.small}
                        alt={t('line.imageAlt', { name: frontFace.name })}
                        width={SMALL_IMAGE.width}
                        height={SMALL_IMAGE.height}
                        loading="lazy"
                      />
                    )}
                    <span className="mt-1 font-mono">{setAndNumber}</span>
                    <span className={print.imageStatus === 'lowres' ? 'text-warning' : ''}>
                      {t(`printPicker.quality.${print.imageStatus}`)}
                    </span>
                  </button>
                  <div
                    className="mt-1 flex items-center justify-center gap-1"
                    role="group"
                    aria-label={t('printPicker.copiesOf', { print: setAndNumber })}
                  >
                    <button
                      type="button"
                      className={COUNTER_BUTTON}
                      aria-label={t('printPicker.decrease', { print: setAndNumber })}
                      disabled={copies === 0 || line.quantity <= 1}
                      onClick={() => onPrintQuantityChange(print, copies - 1)}
                    >
                      {t('panel.minus')}
                    </button>
                    <output aria-live="polite" className="min-w-[2ch] font-bold">
                      {copies}
                    </output>
                    <button
                      type="button"
                      className={COUNTER_BUTTON}
                      aria-label={t('printPicker.increase', { print: setAndNumber })}
                      onClick={() => onPrintQuantityChange(print, copies + 1)}
                    >
                      {t('panel.plus')}
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
      <div ref={endOfGridRef} className="min-h-6 text-muted-foreground" aria-live="polite">
        {isLoading && t('printPicker.loading')}
      </div>
      {lastRequestFailed && (
        <div role="alert">
          <p>{t('printPicker.error')}</p>
          <button type="button" className={SECONDARY_BUTTON} onClick={loadMore}>
            {t('printPicker.retry')}
          </button>
        </div>
      )}
      {zoomedCard}
    </section>
  );
}
