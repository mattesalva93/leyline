import { useTranslation } from 'react-i18next';
import { AdSlot } from './AdSlot.tsx';
import { CardsView } from './CardsView.tsx';
import { DecklistEditor } from './DecklistEditor.tsx';
import { EmptyWorkspace } from './EmptyWorkspace.tsx';
import { Inspector } from './Inspector.tsx';
import { PdfControl } from './PdfControl.tsx';
import { SheetView } from './SheetView.tsx';
import { SIDE_PANEL_WIDTH_PX } from './side-panel-layout.ts';
import { SidePanel } from './SidePanel.tsx';
import { TileWidthSlider } from './TileWidthSlider.tsx';
import { useTileWidth } from './tile-width.ts';
import { ToolRail } from './ToolRail.tsx';
import { centreViewAt, type WorkspaceState } from './workspace-state.ts';

/**
 * The workspace on a wide screen, filling it: from left to right the tool rail, the decklist
 * text with a banner's place at its foot, the centre (the card grid or the sheet, with the PDF
 * button) and the inspector. Each zone scrolls on its own. Empty, it shows only how to start.
 */
export function DesktopWorkspace({ state }: { readonly state: WorkspaceState }) {
  const { t } = useTranslation();
  const { generator } = state;
  const view = centreViewAt(state.step);
  const [tileWidth, setTileWidth] = useTileWidth();
  if (state.isEmpty) {
    return (
      <div className="flex h-full overflow-y-auto">
        <EmptyWorkspace generator={generator} />
      </div>
    );
  }
  return (
    <div className="flex h-full gap-4 overflow-hidden p-4">
      <ToolRail view={view} onViewChange={state.goToStep} />
      <SidePanel
        title={t('workspace.decklistPanel')}
        gridSide="right"
        width={SIDE_PANEL_WIDTH_PX.decklist.default}
      >
        <DecklistEditor generator={generator} className="min-h-48 flex-1" />
        <AdSlot className="shrink-0 border-t-2 border-border p-2" />
      </SidePanel>
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <div className="mb-3 flex shrink-0 flex-wrap items-center gap-4">
          <h1 className="text-3xl leading-none font-bold tracking-tight">
            {t(`workspace.views.${view}`)}
          </h1>
          {view === 'cards' && <TileWidthSlider width={tileWidth} onChange={setTileWidth} />}
          <PdfControl pdf={generator.pdf} className="mr-1 ml-auto" />
        </div>
        {view === 'cards' ? (
          <div className="min-h-0 flex-1 overflow-y-auto">
            <CardsView state={state} tileWidthPx={tileWidth} />
          </div>
        ) : (
          <SheetView generator={generator} />
        )}
      </div>
      <Inspector state={state} view={view} className="mr-1 mb-1" />
    </div>
  );
}
