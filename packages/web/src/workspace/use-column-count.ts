import { useEffect, useState } from 'react';

/**
 * How many columns the grid of tiles given `gridRef` lays them in, updated as its width changes.
 * One until it is measured.
 */
export function useColumnCount(): {
  readonly gridRef: (grid: HTMLElement | null) => void;
  readonly columns: number;
} {
  const [grid, setGrid] = useState<HTMLElement | null>(null);
  const [columns, setColumns] = useState(1);
  useEffect(() => {
    if (!grid || typeof ResizeObserver === 'undefined') return;
    // The grid changes width with the window and the side panels.
    const observer = new ResizeObserver(() =>
      setColumns(getComputedStyle(grid).gridTemplateColumns.split(' ').length),
    );
    observer.observe(grid);
    return () => observer.disconnect();
  }, [grid]);
  return { gridRef: setGrid, columns };
}
