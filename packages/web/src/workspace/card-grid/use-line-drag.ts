import type { DecklistSection, LineDestination, LineSide } from '@mtg-suite/core';
import { useState } from 'react';
import { landingSideOf, type GridTile } from './grid-tiles.ts';

/**
 * What a dragged line carries for the browser. A type of the app's own, so no text field takes
 * the drop as text to paste.
 */
const LINE_DRAG_TYPE = 'application/x-mtg-suite-line';

/** The handlers a draggable tile takes. */
export interface TileDragHandlers {
  readonly onDragStart: (event: React.DragEvent) => void;
  readonly onDragOver: (event: React.DragEvent<HTMLElement>) => void;
  readonly onDragEnd: () => void;
}

/** A line dragged across the card grid by the mouse, and where it lands if dropped now. */
export interface LineDrag {
  /** The line being dragged, `null` while none is. */
  readonly draggedWrittenIndex: number | null;
  /** Where the dragged line lands if dropped now, `null` while nowhere. */
  readonly destination: LineDestination | null;
  readonly tileDragHandlers: (gridTile: GridTile, section: DecklistSection) => TileDragHandlers;
  /** Makes the end of `section` where the dragged line lands while the pointer is over it. */
  readonly sectionEndDragOver: (section: DecklistSection) => (event: React.DragEvent) => void;
  /** The handlers of the whole grid: a drop anywhere on it lands where the bar shows. */
  readonly gridDropHandlers: {
    readonly onDragOver: (event: React.DragEvent) => void;
    readonly onDragLeave: (event: React.DragEvent<HTMLElement>) => void;
    readonly onDrop: (event: React.DragEvent) => void;
  };
}

/** Which half of the tile under the pointer it is over: the line lands on that side of it. */
function sideUnderPointer(event: React.DragEvent<HTMLElement>): LineSide {
  const box = event.currentTarget.getBoundingClientRect();
  return event.clientX < box.left + box.width / 2 ? 'before' : 'after';
}

function isSameDestination(a: LineDestination | null, b: LineDestination): boolean {
  return (
    a?.section === b.section &&
    a.nextTo?.writtenIndex === b.nextTo?.writtenIndex &&
    a.nextTo?.side === b.nextTo?.side
  );
}

/** Lets the mouse drag a line by any of its tiles and drop it to `moveLine` it. */
export function useLineDrag(
  moveLine: (writtenIndex: number, destination: LineDestination) => void,
): LineDrag {
  const [draggedWrittenIndex, setDraggedWrittenIndex] = useState<number | null>(null);
  const [destination, setDestination] = useState<LineDestination | null>(null);

  function endDrag() {
    setDraggedWrittenIndex(null);
    setDestination(null);
  }

  /** Takes a drop that leaves the dragged line where it is: no bar shows. */
  function leaveInPlace(event: React.DragEvent) {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    setDestination(null);
  }

  /** Lets the dragged line land where the pointer is, while there is somewhere to land. */
  function allowDrop(event: React.DragEvent, nextDestination: LineDestination) {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    // `dragover` fires every few milliseconds: the grid renders again only when the bar moves.
    setDestination((current) =>
      isSameDestination(current, nextDestination) ? current : nextDestination,
    );
  }

  return {
    draggedWrittenIndex,
    destination,
    tileDragHandlers: (gridTile, section) => ({
      onDragStart: (event) => {
        // Firefox starts no drag without data in it.
        event.dataTransfer.setData(LINE_DRAG_TYPE, `${gridTile.writtenIndex}`);
        event.dataTransfer.effectAllowed = 'move';
        setDraggedWrittenIndex(gridTile.writtenIndex);
      },
      onDragOver: (event) => {
        if (draggedWrittenIndex === null) return;
        event.stopPropagation();
        if (draggedWrittenIndex === gridTile.writtenIndex) {
          // Over the dragged line itself the line stays put, which is no reason to show a ban.
          leaveInPlace(event);
          return;
        }
        const side = landingSideOf(gridTile, sideUnderPointer(event));
        allowDrop(event, { section, nextTo: { writtenIndex: gridTile.writtenIndex, side } });
      },
      onDragEnd: endDrag,
    }),
    sectionEndDragOver: (section) => (event) => {
      if (draggedWrittenIndex === null) return;
      event.stopPropagation();
      allowDrop(event, { section, nextTo: null });
    },
    gridDropHandlers: {
      // Over the gap between tiles the bar stays where it was, and so does the drop; with no bar,
      // the drop leaves the line where it is, which is no reason to show a ban either.
      onDragOver: (event) => {
        if (draggedWrittenIndex === null) return;
        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';
      },
      onDragLeave: (event) => {
        const enteredElement = event.relatedTarget;
        const leftTheGrid =
          !(enteredElement instanceof Node) || !event.currentTarget.contains(enteredElement);
        if (leftTheGrid) setDestination(null);
      },
      onDrop: (event) => {
        if (draggedWrittenIndex === null) return;
        event.preventDefault();
        if (destination) moveLine(draggedWrittenIndex, destination);
        endDrag();
      },
    },
  };
}
