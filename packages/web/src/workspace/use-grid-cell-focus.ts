import { useLayoutEffect, useRef, useState, type FocusEvent, type KeyboardEvent } from 'react';
import { cellAfterArrow, type Arrow, type CellGroup } from '@mtg-suite/core';

const CELL_ATTRIBUTE = 'data-grid-cell';
const GROUP_ATTRIBUTE = 'data-grid-cell-group';

/** What makes an element a cell of the card grid, the one element of a tile the focus lands on. */
export interface GridCellProps {
  readonly [CELL_ATTRIBUTE]: string;
  readonly tabIndex: 0 | -1;
}

/** Gives each cell of the card grid its `GridCellProps`, by the key of its tile. */
export type CellPropsOf = (cellKey: string) => GridCellProps;

/** What makes an element a group of cells laid out in rows of `columns`, as a section is. */
export function cellGroupProps(columns: number) {
  return { [GROUP_ATTRIBUTE]: columns };
}

const ARROWS: Readonly<Record<string, Arrow>> = {
  ArrowLeft: 'left',
  ArrowRight: 'right',
  ArrowUp: 'up',
  ArrowDown: 'down',
};

/** Whether the keyboard event comes from the cell itself, not from a control inside it. */
export function isOnCell(event: KeyboardEvent): boolean {
  return event.target === event.currentTarget;
}

/**
 * Puts the focus back on the cell of the card grid the keyboard last stood on, as the user leaves
 * a panel opened from it.
 */
export function focusCurrentGridCell(): void {
  document.querySelector<HTMLElement>(`[${CELL_ATTRIBUTE}][tabindex="0"]`)?.focus();
}

/**
 * The cell that stands in for `goneKey`, a cell that went: the one that took its place, or the
 * last one when it was the last.
 */
function neighbourOf(
  goneKey: string | null,
  previousKeys: readonly string[],
  cellKeys: readonly string[],
): string | null {
  const index = goneKey === null ? 0 : Math.max(previousKeys.indexOf(goneKey), 0);
  return cellKeys[Math.min(index, cellKeys.length - 1)] ?? null;
}

/**
 * One stop of Tab for the whole card grid, on the cell the keyboard last stood on (the first one
 * to begin with), and the arrows to move between cells along the rows and columns of the
 * sections. When the focused cell goes, the focus passes to the one that takes its place.
 */
export function useGridCellFocus(cellKeys: readonly string[]) {
  const gridRef = useRef<HTMLDivElement>(null);
  const [chosenKey, setChosenKey] = useState<string | null>(null);
  const previousKeys = useRef(cellKeys);
  const focusedKey = useRef<string | null>(null);
  const currentKey =
    chosenKey !== null && cellKeys.includes(chosenKey)
      ? chosenKey
      : neighbourOf(chosenKey, previousKeys.current, cellKeys);
  useLayoutEffect(() => {
    previousKeys.current = cellKeys;
    if (currentKey === chosenKey) return;
    setChosenKey(currentKey);
    const focusWasLost =
      document.activeElement === null || document.activeElement === document.body;
    if (focusWasLost && focusedKey.current === chosenKey && currentKey !== null) {
      gridRef.current?.querySelector<HTMLElement>(`[${CELL_ATTRIBUTE}="${currentKey}"]`)?.focus();
    }
  });
  const cellPropsOf: CellPropsOf = (cellKey) => ({
    [CELL_ATTRIBUTE]: cellKey,
    tabIndex: cellKey === currentKey ? 0 : -1,
  });
  const gridFocusHandlers = {
    onFocus(event: FocusEvent<HTMLElement>) {
      const cell = event.target.closest<HTMLElement>(`[${CELL_ATTRIBUTE}]`);
      const cellKey = cell?.getAttribute(CELL_ATTRIBUTE) ?? null;
      if (cellKey === null) return;
      focusedKey.current = cellKey;
      setChosenKey(cellKey);
    },
    onBlur(event: FocusEvent<HTMLElement>) {
      if (event.relatedTarget && !event.currentTarget.contains(event.relatedTarget)) {
        focusedKey.current = null;
      }
    },
    onKeyDown(event: KeyboardEvent<HTMLElement>) {
      const arrow = ARROWS[event.key];
      const cell = event.target as HTMLElement;
      if (!arrow || !cell.hasAttribute(CELL_ATTRIBUTE)) return;
      const groups = [...event.currentTarget.querySelectorAll<HTMLElement>(`[${GROUP_ATTRIBUTE}]`)];
      const cellsOfGroups = groups.map((group) => [
        ...group.querySelectorAll<HTMLElement>(`[${CELL_ATTRIBUTE}]`),
      ]);
      const group = cellsOfGroups.findIndex((cells) => cells.includes(cell));
      if (group < 0) return;
      event.preventDefault();
      const layout: CellGroup[] = groups.map((element, index) => ({
        cellCount: cellsOfGroups[index]?.length ?? 0,
        columns: Number(element.getAttribute(GROUP_ATTRIBUTE)) || 1,
      }));
      const index = cellsOfGroups[group]?.indexOf(cell) ?? 0;
      const next = cellAfterArrow(layout, { group, index }, arrow);
      cellsOfGroups[next.group]?.[next.index]?.focus();
    },
  };
  return { gridRef, cellPropsOf, gridFocusHandlers };
}
