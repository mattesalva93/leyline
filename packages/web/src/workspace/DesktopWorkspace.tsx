import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AdSlot } from './AdSlot.tsx';
import { CardsView } from './CardsView.tsx';
import { DecklistEditor } from './DecklistEditor.tsx';
import type { TileSelection } from './grid-tiles.ts';
import { Inspector } from './Inspector.tsx';
import { PdfControl } from './PdfControl.tsx';
import { SheetView } from './SheetView.tsx';
import { SidePanel } from './SidePanel.tsx';
import { TileWidthSlider } from './TileWidthSlider.tsx';
import { useTileWidth } from './tile-width.ts';
import { ToolRail } from './ToolRail.tsx';
import { useFittedSidePanels } from './use-fitted-side-panels.ts';
import { centreViewAt, type WorkspaceState } from './workspace-state.ts';

/**
 * The workspace on a wide screen, filling it: from left to right the tool rail, the decklist
 * text with a banner's place at its foot, the centre (the card grid or the sheet, with the PDF
 * button) and the inspector. Each zone scrolls on its own.
 */
export function DesktopWorkspace({ state }: { readonly state: WorkspaceState }) {
  const { t } = useTranslation();
  const { generator } = state;
  const view = centreViewAt(state.step);
  const [tileWidth, setTileWidth] = useTileWidth();
  const { centreRef, panels } = useFittedSidePanels();
  const [inspectorFocusRequestCount, setInspectorFocusRequestCount] = useState(0);
  const openLinePanel = (selection: TileSelection) => {
    state.selectTile(selection);
    if (!panels.inspector.controls.isOpen) panels.inspector.controls.toggle();
    setInspectorFocusRequestCount((request) => request + 1);
  };
  return (
    <div className="flex h-full gap-4 overflow-hidden p-4">
      <ToolRail view={view} onViewChange={state.goToStep} />
      <SidePanel
        name="decklist"
        panel={panels.decklist}
        title={t('workspace.decklistPanel')}
        centreSide="right"
      >
        <DecklistEditor generator={generator} className="min-h-48 flex-1" />
        <AdSlot className="shrink-0 border-t-2 border-border p-2" />
      </SidePanel>
      <div ref={centreRef} className="flex min-h-0 min-w-0 flex-1 flex-col">
        <div className="mb-3 flex shrink-0 flex-wrap items-center gap-4">
          <h1 className="text-3xl leading-none font-bold tracking-tight">
            {t(`workspace.views.${view}`)}
          </h1>
          {view === 'cards' && <TileWidthSlider width={tileWidth} onChange={setTileWidth} />}
          <PdfControl pdf={generator.pdf} className="mr-1 ml-auto" />
        </div>
        {view === 'cards' ? (
          <div className="min-h-0 flex-1 overflow-y-auto">
            <CardsView state={state} tileWidthPx={tileWidth} onOpenLinePanel={openLinePanel} />
          </div>
        ) : (
          <SheetView generator={generator} />
        )}
      </div>
      <Inspector
        state={state}
        view={view}
        panel={panels.inspector}
        focusRequestCount={inspectorFocusRequestCount}
        className="mr-1 mb-1"
      />
    </div>
  );
}
