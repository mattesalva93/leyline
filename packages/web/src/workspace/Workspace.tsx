import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { touchIsMainInput } from '../pdf-delivery.ts';
import { useGenerator } from '../use-generator.ts';
import { CardGrid, type TileSelection } from './CardGrid.tsx';
import { DecklistPanel } from './DecklistPanel.tsx';
import { gridTilesOf } from './grid-tiles.ts';
import { Inspector } from './Inspector.tsx';
import { PdfControl } from './PdfControl.tsx';
import { SheetView } from './SheetView.tsx';
import { ToolRail, type CentreView } from './ToolRail.tsx';

/** The width from which the zones stand side by side and fill the screen: Tailwind's `lg`. */
const SIDE_BY_SIDE_QUERY = '(min-width: 64rem)';

/**
 * The generator's screen: from left to right the tool rail, the decklist text, the centre (the
 * card grid or the sheet, with the PDF button) and the inspector. On a wide screen it fills the
 * screen and each zone scrolls on its own; narrower, the zones stand in a column.
 */
export function Workspace() {
  const { t } = useTranslation();
  const generator = useGenerator();
  const [view, setView] = useState<CentreView>('cards');
  const [selection, setSelection] = useState<TileSelection | null>(null);
  const [touchIsMain] = useState(touchIsMainInput);
  const inspectorRef = useRef<HTMLElement>(null);
  const gridTiles = gridTilesOf(generator.cardLines);

  function selectTile(nextSelection: TileSelection | null) {
    setSelection(nextSelection);
    // In a column the inspector sits below the grid: bring the line's settings into sight.
    if (nextSelection && !window.matchMedia(SIDE_BY_SIDE_QUERY).matches) {
      inspectorRef.current?.scrollIntoView?.({ behavior: 'smooth', block: 'start' });
    }
  }

  return (
    <div className="flex flex-col gap-4 p-4 lg:h-full lg:flex-row lg:overflow-hidden">
      <ToolRail view={view} onViewChange={setView} />
      <DecklistPanel generator={generator} className="h-80 shrink-0 lg:h-auto lg:w-60" />
      <div className="flex min-w-0 flex-col lg:min-h-0 lg:flex-1">
        <div className="mb-3 flex shrink-0 flex-wrap items-center gap-4">
          <h1 className="text-3xl leading-none font-bold tracking-tight">
            {t(`workspace.views.${view}`)}
          </h1>
          <PdfControl pdf={generator.pdf} className="mr-1 ml-auto" />
        </div>
        {view === 'cards' ? (
          <div className="lg:min-h-0 lg:flex-1 lg:overflow-y-auto">
            {gridTiles.length === 0 ? (
              <p className="max-w-xl p-4 text-sm text-muted-foreground">{t('app.intro')}</p>
            ) : (
              <CardGrid
                gridTiles={gridTiles}
                selection={selection}
                isResolving={generator.isResolving}
                onSelect={selectTile}
                onPickCandidate={generator.pickCandidate}
              />
            )}
          </div>
        ) : (
          <SheetView
            sheetLayout={generator.sheetLayout}
            unprintedCount={generator.unprintedCount}
          />
        )}
      </div>
      <Inspector
        ref={inspectorRef}
        generator={generator}
        view={view}
        selectedLineIndex={selection?.writtenIndex ?? null}
        warnAboutPngWeight={touchIsMain}
        className="shrink-0 lg:mr-1 lg:mb-1 lg:w-[340px]"
      />
    </div>
  );
}
