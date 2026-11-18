import { useLayoutEffect, useState } from 'react';

/**
 * How many columns the grid of tiles given `gridRef` lays them in, and how wide they are, updated
 * as its width changes. One column of unbounded width until it is measured.
 */
export function useGridColumns(): {
  readonly gridRef: (grid: HTMLElement | null) => void;
  readonly columns: number;
  /** The width of each column, in CSS px: the grid stretches them all alike. */
  readonly columnWidthPx: number;
} {
  const [grid, setGrid] = useState<HTMLElement | null>(null);
  const [columns, setColumns] = useState(1);
  const [columnWidthPx, setColumnWidthPx] = useState(Number.POSITIVE_INFINITY);
  // A layout effect: the first measure lands before the grid is painted, so its tabs never jump.
  useLayoutEffect(() => {
    if (!grid || typeof ResizeObserver === 'undefined') return;
    const measure = () => {
      // Laid out, the template lists each column's width in px.
      const columnWidths = getComputedStyle(grid).gridTemplateColumns.split(' ');
      setColumns(columnWidths.length);
      const columnWidth = Number.parseFloat(columnWidths[0] ?? '');
      if (Number.isFinite(columnWidth)) setColumnWidthPx(columnWidth);
    };
    measure();
    // The grid changes width with the window and the side panels.
    const observer = new ResizeObserver(measure);
    observer.observe(grid);
    return () => observer.disconnect();
  }, [grid]);
  return { gridRef: setGrid, columns, columnWidthPx };
}
