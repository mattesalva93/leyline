import { CARD_CORNER_RADIUS_MM, type SheetLayout } from '@mtg-suite/core';
import { useId, useState } from 'react';
import { useTranslation } from 'react-i18next';

interface SheetPreviewProps {
  readonly layout: SheetLayout;
}

/**
 * One page of the sheet as it will print, drawn from the same layout as the PDF, in mm. Images
 * use Scryfall's "normal" size, lighter than the PDF's "large" one; `xMidYMid slice` scales
 * them to cover the slot and centres them, as the PDF does (ADR 0007).
 */
export function SheetPreview({ layout }: SheetPreviewProps) {
  const { t } = useTranslation();
  const clipIdPrefix = useId();
  const [pageIndex, setPageIndex] = useState(0);
  const pageCount = layout.pages.length;
  // The sheet can lose pages while this one is shown: stay on its last page.
  const shownIndex = Math.min(pageIndex, pageCount - 1);
  const slots = layout.pages[shownIndex] ?? [];
  const { width, height } = layout.pageMm;
  return (
    <section className="sheet-preview" aria-labelledby="sheet-preview-title">
      <h2 id="sheet-preview-title">{t('sheetPreview.title')}</h2>
      <p className="sheet-preview__summary">
        {t('sheetPreview.cardsPerPage', { columns: layout.columns, rows: layout.rows })}
      </p>
      <svg
        className="sheet-preview__page"
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label={t('sheetPreview.pageLabel', { page: shownIndex + 1, count: pageCount })}
      >
        <rect width={width} height={height} fill="white" />
        <defs>
          {slots.map(({ box }, index) => (
            <clipPath key={index} id={`${clipIdPrefix}-${index}`}>
              <rect {...box} rx={CARD_CORNER_RADIUS_MM} />
            </clipPath>
          ))}
        </defs>
        {slots.map(({ box, face }, index) => (
          <image
            key={index}
            href={face.imageUris.normal}
            {...box}
            preserveAspectRatio="xMidYMid slice"
            clipPath={`url(#${clipIdPrefix}-${index})`}
          />
        ))}
        {layout.cropMarks.map(({ from, to }, index) => (
          <line
            key={index}
            x1={from.x}
            y1={from.y}
            x2={to.x}
            y2={to.y}
            stroke="black"
            strokeWidth={1}
            // The PDF's hairline would vanish at screen size: one screen pixel instead.
            vectorEffect="non-scaling-stroke"
          />
        ))}
      </svg>
      {pageCount > 1 && (
        <div className="sheet-preview__pager">
          <button
            type="button"
            className="button--secondary"
            aria-label={t('sheetPreview.previous')}
            disabled={shownIndex === 0}
            onClick={() => setPageIndex(shownIndex - 1)}
          >
            {t('sheetPreview.previousSymbol')}
          </button>
          <span aria-live="polite">
            {t('sheetPreview.page', { page: shownIndex + 1, count: pageCount })}
          </span>
          <button
            type="button"
            className="button--secondary"
            aria-label={t('sheetPreview.next')}
            disabled={shownIndex === pageCount - 1}
            onClick={() => setPageIndex(shownIndex + 1)}
          >
            {t('sheetPreview.nextSymbol')}
          </button>
        </div>
      )}
    </section>
  );
}
