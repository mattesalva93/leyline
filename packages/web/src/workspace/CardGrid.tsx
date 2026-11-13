import type { LineDestination } from '@mtg-suite/core';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { TILE_ZOOM_WAIT_MS, useZoomedCard } from '../use-zoomed-card.tsx';
import { CardGridSection, type CardGridSectionProps } from './CardGridSection.tsx';
import { EmptySectionsRow } from './EmptySectionsRow.tsx';
import { emptySectionsOf, gridCellKeysOf, type GridSection } from './grid-sections.ts';
import { SideboardDropZone } from './SideboardDropZone.tsx';
import { useGridCellFocus } from './use-grid-cell-focus.ts';
import { useLineDrag } from './use-line-drag.ts';

interface CardGridProps extends Omit<
  CardGridSectionProps,
  'section' | 'zoomOn' | 'lineDrag' | 'cellPropsOf'
> {
  readonly sections: readonly GridSection[];
  /** Whether the mouse can drag tiles to reorder the decklist: not where touch is the main input. */
  readonly tilesAreDraggable: boolean;
  readonly onMoveLine: (writtenIndex: number, destination: LineDestination) => void;
}

/**
 * The decklist as tiles, section by section, in the order of the text within each, each line's
 * sibling tiles side by side, then an add tile for each section with no card yet. A tile the pointer rests on shows its card enlarged; the mouse
 * drags a tile to move its line, into another section too. The keyboard stops on the grid once,
 * and the arrows go from tile to tile.
 */
export function CardGrid({
  sections,
  selection,
  tilesAreDraggable,
  onMoveLine,
  ...sectionProps
}: CardGridProps) {
  const { t } = useTranslation();
  const { gridRef, cellPropsOf, gridFocusHandlers } = useGridCellFocus(gridCellKeysOf(sections));
  const { zoomOn, zoomedCard } = useZoomedCard(TILE_ZOOM_WAIT_MS);
  const lineDrag = useLineDrag(onMoveLine);
  // `null` where touch is the main input: there no tile can be dragged.
  const mouseLineDrag = tilesAreDraggable ? lineDrag : null;
  const hasSideboard = sections.some((section) => section.name === 'sideboard');
  // A tile can be selected from outside the grid, such as the first line to fix: bring it in.
  useEffect(() => {
    gridRef.current?.querySelector('[aria-current="true"]')?.scrollIntoView({ block: 'nearest' });
  }, [gridRef, selection?.writtenIndex, selection?.printId]);
  return (
    <>
      <div
        ref={gridRef}
        role="region"
        aria-label={t('workspace.cardGrid')}
        {...gridFocusHandlers}
        {...(mouseLineDrag?.gridDropHandlers ?? {})}
      >
        {sections.map((section) => (
          <CardGridSection
            key={section.name}
            section={section}
            selection={selection}
            zoomOn={zoomOn}
            lineDrag={mouseLineDrag}
            cellPropsOf={cellPropsOf}
            {...sectionProps}
          />
        ))}
        <EmptySectionsRow
          emptySections={emptySectionsOf(sections)}
          tileWidthPx={sectionProps.tileWidthPx}
          lang={sectionProps.defaultLang}
          cellPropsOf={cellPropsOf}
          onAddCard={sectionProps.onAddCard}
        />
        {/* A line can open the sideboard only by a drop: there is no tile of it to drop on yet. */}
        {mouseLineDrag?.draggedWrittenIndex != null && !hasSideboard && (
          <SideboardDropZone
            isTarget={mouseLineDrag.destination?.section === 'sideboard'}
            onDragOver={mouseLineDrag.sectionEndDragOver('sideboard')}
          />
        )}
      </div>
      {zoomedCard}
    </>
  );
}
