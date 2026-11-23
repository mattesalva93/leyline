import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AdSlot } from './AdSlot.tsx';
import { CardsView } from './card-grid/CardsView.tsx';
import { DecklistEditor } from '../decklist-editor/DecklistEditor.tsx';
import { EmptyWorkspaceInvite } from './empty-workspace/EmptyWorkspaceInvite.tsx';
import { GoToSheetButton } from './sheet/GoToSheetButton.tsx';
import type { TileSelection } from './card-grid/grid-tiles.ts';
import { Inspector } from './side-panel/Inspector.tsx';
import { PdfControl } from './sheet/PdfControl.tsx';
import { SheetView } from './sheet/SheetView.tsx';
import { SidePanel } from './side-panel/SidePanel.tsx';
import type { GuidedStepPlacement } from './guide/GuidedStepBubble.tsx';
import { Tab, TabList, TabPanel, Tabs } from '../ui/Tabs.tsx';
import { TileWidthSlider } from './card-grid/TileWidthSlider.tsx';
import { useTileWidth } from './card-grid/tile-width.ts';
import { useFittedSidePanels } from './side-panel/use-fitted-side-panels.ts';
import {
  CENTRE_VIEWS,
  centreViewAt,
  centreViewNamed,
  type WorkspaceState,
} from './workspace-state.ts';

/**
 * Out in the centre beside the decklist, below the empty workspace's example button, so it hides
 * none of the invite: its arrow enters the decklist a little in from its edge.
 */
const DECKLIST_GUIDED_STEP: GuidedStepPlacement = {
  side: 'right',
  aimInside: (decklist) => ({
    x: decklist.right - 48,
    y: Math.min(decklist.top + 290, decklist.bottom - 40),
  }),
};

/**
 * The workspace on a wide screen, filling it: from left to right the decklist text with a
 * banner's place at its foot, the centre (the card grid or the sheet, picked from the tabs at its
 * head) and the inspector. Each zone scrolls on its own. Until a decklist is under way, an invite
 * to start one stands in place of the grid.
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
      <SidePanel name="decklist" panel={panels.decklist} title={t('workspace.decklistPanel')}>
        <DecklistEditor
          generator={generator}
          guide={state.guide}
          guidedStepPlacement={DECKLIST_GUIDED_STEP}
          className="min-h-48 flex-1"
        />
        <AdSlot className="shrink-0 border-t-2 border-border p-2" />
      </SidePanel>
      <Tabs
        ref={centreRef}
        value={view}
        onValueChange={(name) => {
          const picked = centreViewNamed(name);
          if (picked) state.goToStep(picked);
        }}
        className="flex min-h-0 min-w-0 flex-1 flex-col"
      >
        <div className="mb-3 flex shrink-0 flex-wrap items-center gap-4">
          <TabList className="flex gap-2">
            {CENTRE_VIEWS.map((tabView) => (
              <Tab key={tabView} value={tabView}>
                {t(`workspace.views.${tabView}`)}
              </Tab>
            ))}
          </TabList>
          {view === 'sheet' ? (
            <PdfControl pdf={generator.pdf} className="mr-1 ml-auto" />
          ) : (
            generator.isDecklistUnderWay && (
              <>
                <TileWidthSlider width={tileWidth} onChange={setTileWidth} />
                <GoToSheetButton
                  sheetHasSomethingToPrint={generator.sheetLayout !== null}
                  onGoToSheet={() => state.goToStep('sheet')}
                  className="mr-1 ml-auto"
                />
              </>
            )
          )}
        </div>
        {/* The grid takes its own stop of Tab, so the panel around it takes none. */}
        <TabPanel value="cards" tabIndex={-1} className="min-h-0 flex-1 overflow-y-auto">
          {generator.isDecklistUnderWay ? (
            <CardsView state={state} tileWidthPx={tileWidth} onOpenLinePanel={openLinePanel} />
          ) : (
            <EmptyWorkspaceInvite generator={generator} className="p-1" />
          )}
        </TabPanel>
        <TabPanel value="sheet" className="flex min-h-0 flex-1 flex-col">
          <SheetView generator={generator} />
        </TabPanel>
      </Tabs>
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
