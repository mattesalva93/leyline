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

  /** Lets the dragged line land where the pointer is, while there is somewhere to land. */
  function allowDrop(event: React.DragEvent, nextDestination: LineDestination) {
    event.preventDefault();
    if (event.dataTransfer) event.dataTransfer.dropEffect = 'move';
    setDestination(nextDestination);
  }

  return {
    draggedWrittenIndex,
    destination,
    tileDragHandlers: (gridTile, section) => ({
      onDragStart: (event) => {
        // jsdom has no `dataTransfer`; Firefox starts no drag without data in it.
        if (event.dataTransfer) {
          event.dataTransfer.setData(LINE_DRAG_TYPE, `${gridTile.writtenIndex}`);
          event.dataTransfer.effectAllowed = 'move';
        }
        setDraggedWrittenIndex(gridTile.writtenIndex);
      },
      onDragOver: (event) => {
        if (draggedWrittenIndex === null) return;
        // Over the dragged line itself the line stays put: no bar, and the grid takes no drop.
        event.stopPropagation();
        if (draggedWrittenIndex === gridTile.writtenIndex) {
          setDestination(null);
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
      // Over the gap between tiles the bar stays where it was, and so does the drop.
      onDragOver: (event) => {
        if (draggedWrittenIndex !== null && destination) event.preventDefault();
      },
      onDragLeave: (event) => {
        const enteredElement = event.relatedTarget;
        const leftTheGrid =
          !(enteredElement instanceof Node) || !event.currentTarget.contains(enteredElement);
        if (leftTheGrid) setDestination(null);
      },
      onDrop: (event) => {
        if (draggedWrittenIndex === null || !destination) return;
        event.preventDefault();
        moveLine(draggedWrittenIndex, destination);
        endDrag();
      },
    },
  };
}
