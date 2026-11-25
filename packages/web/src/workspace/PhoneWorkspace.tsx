import { useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { InTopBar } from './top-bar-slot.tsx';
import { BoardPanel } from '../ui/BoardPanel.tsx';
import { BUTTON_STATES, LABEL, SINKS_WHEN_PRESSED } from '../ui/board-styles.ts';
import { AdSlot } from './AdSlot.tsx';
import { CardsView } from './card-grid/CardsView.tsx';
import { DecklistCount } from './decklist-summary/DecklistCount.tsx';
import { DecklistEditor } from '../decklist-editor/DecklistEditor.tsx';
import { EmptyWorkspaceInvite } from './empty-workspace/EmptyWorkspaceInvite.tsx';
import { DecklistSummary } from './decklist-summary/DecklistSummary.tsx';
import { PhoneLineHeading } from './line-panel/PhoneLineHeading.tsx';
import { PhoneLinePanel } from './line-panel/PhoneLinePanel.tsx';
import { PhonePdfStrip } from './sheet/PhonePdfStrip.tsx';
import { lineToFixOf, LineToFixPanel } from './line-to-fix/LineToFixPanel.tsx';
import { panelLineOf, SelectedLinePanel } from './line-panel/SelectedLinePanel.tsx';
import { SheetSettings } from './sheet/SheetSettings.tsx';
import { SheetView } from './sheet/SheetView.tsx';
import { TILE_WIDTH_PX } from './card-grid/tile-width.ts';
import { PHONE_STEP_BAR_HEIGHT } from './phone-step-bar.ts';
import { GuidedStepBubble, type GuidedStepPlacement } from './guide/GuidedStepBubble.tsx';
import { focusCurrentGridCell } from './card-grid/use-grid-cell-focus.ts';
import type { WorkspaceState, WorkspaceStep } from './workspace-state.ts';

const STEPS: readonly WorkspaceStep[] = ['list', 'cards', 'sheet'];

/**
 * Over the empty foot of the decklist, on the left: its arrow rises into the box, and the bubble
 * stays clear of the fold button at the right of the panel below.
 */
const DECKLIST_BUBBLE_PLACEMENT: GuidedStepPlacement = {
  side: 'bottom',
  aimInside: (decklist) => ({ x: decklist.left + 80, y: decklist.bottom - 130 }),
};

/** Below the tile, over the tiles under it: its arrow rises into the card by its foot. */
const TILE_BUBBLE_PLACEMENT: GuidedStepPlacement = {
  side: 'bottom',
  aimInside: (tile) => ({ x: tile.left + 48, y: tile.bottom - 40 }),
};

/**
 * Above the bar at the foot of the screen, running back left from its arrow: the sheet's button
 * is the last of the bar, by the right edge.
 */
const SHEET_BUTTON_BUBBLE_PLACEMENT: GuidedStepPlacement = {
  side: 'top',
  align: 'end',
  aimInside: (button) => ({ x: button.left + button.width / 2, y: button.top + 8 }),
};

/**
 * The workspace on a phone: one step at a time on the whole screen (the decklist, the cards, the
 * sheet with its PDF button), picked from the bar at the foot of the screen. Until a decklist is
 * under way, the decklist step opens on an invite to start one.
 */
export function PhoneWorkspace({ state }: { readonly state: WorkspaceState }) {
  const { t } = useTranslation();
  const { generator, step } = state;
  const panelLine = step === 'cards' ? panelLineOf(state.gridTiles, state.selection) : null;
  const lineToFix = step === 'cards' ? lineToFixOf(state.gridTiles, state.selection) : null;
  // A panel opened by Enter on a tile gives the focus back to it; one opened by a tap leaves it be.
  const isLinePanelOpenedByKeyboard = useRef(false);
  return (
    <div className="flex h-full flex-col">
      <InTopBar>
        <DecklistCount cardCount={generator.cardCount} pageCount={generator.pageCount} />
      </InTopBar>
      {/* Outside the scrolling step, so the banner stays put under the top bar. */}
      {step === 'list' && <AdSlot className="shrink-0 border-b-2 border-border bg-panel p-1.5" />}
      <div className="min-h-0 flex-1 overflow-y-auto">
        {step === 'list' && (
          <div className="flex flex-col gap-4 p-3 pr-4">
            {!generator.isDecklistUnderWay && <EmptyWorkspaceInvite generator={generator} />}
            <BoardPanel title={t('workspace.decklistPanel')} isFoldable className="shrink-0">
              <DecklistEditor
                generator={generator}
                guidedStepPlacement={DECKLIST_BUBBLE_PLACEMENT}
                className="h-[38dvh]"
              />
            </BoardPanel>
            <BoardPanel
              title={t('workspace.inspector.summary')}
              isFoldable
              className="shrink-0"
              bodyClassName="p-3"
            >
              <DecklistSummary state={state} />
            </BoardPanel>
          </div>
        )}
        {step === 'cards' && (
          <div className="p-3">
            {/* No tile width slider on a phone, as in the design: the tiles keep their default width. */}
            <CardsView
              state={state}
              tileWidthPx={TILE_WIDTH_PX.default}
              guidedTilePlacement={TILE_BUBBLE_PLACEMENT}
              // The panel rises over the grid and takes the focus as it opens.
              onOpenLinePanel={(selection) => {
                isLinePanelOpenedByKeyboard.current = true;
                state.selectTile(selection);
              }}
            />
          </div>
        )}
        {step === 'sheet' && (
          <div className="flex flex-col gap-4 p-3 pr-4">
            <SheetView generator={generator} />
            <BoardPanel
              title={t('workspace.inspector.sheetOptions')}
              className="shrink-0"
              bodyClassName="p-3"
            >
              <SheetSettings state={state} />
            </BoardPanel>
          </div>
        )}
      </div>
      {/* Outside the scrolling step, so the PDF button stays in reach above the bar. */}
      {step === 'sheet' && <PhonePdfStrip pdf={generator.pdf} />}
      <nav
        aria-label={t('workspace.steps')}
        className="grid shrink-0 border-t-2 border-border bg-panel"
        style={{
          height: PHONE_STEP_BAR_HEIGHT,
          gridTemplateColumns: `repeat(${STEPS.length}, 1fr)`,
        }}
      >
        {STEPS.map((name) => (
          <GuidedStepBubble
            key={name}
            guidedStep={name === 'sheet' ? 'goToSheet' : null}
            placement={SHEET_BUTTON_BUBBLE_PLACEMENT}
          >
            <button
              type="button"
              aria-current={step === name ? 'step' : undefined}
              className={`${LABEL} border-border not-last:border-r-2 ${step === name ? `bg-foreground text-panel ${SINKS_WHEN_PRESSED}` : BUTTON_STATES}`}
              onClick={() => state.goToStep(name)}
            >
              {t(`workspace.stepNames.${name}`)}
            </button>
          </GuidedStepBubble>
        ))}
      </nav>
      <PhoneLinePanel
        title={t(panelLine ? 'workspace.inspector.line' : 'workspace.inspector.lineToFix')}
        heading={
          panelLine ? (
            <PhoneLineHeading line={panelLine.line} />
          ) : (
            <h2 className="text-lg leading-tight font-bold">
              {t('workspace.inspector.lineToFix')}
            </h2>
          )
        }
        onClose={() => state.selectTile(null)}
        onClosed={() => {
          if (isLinePanelOpenedByKeyboard.current) focusCurrentGridCell();
          isLinePanelOpenedByKeyboard.current = false;
        }}
      >
        {panelLine ? (
          <SelectedLinePanel
            layout="phone"
            generator={generator}
            panelLine={panelLine}
            tileSelectionCount={state.tileSelectionCount}
            onSelectionMove={state.moveSelection}
          />
        ) : lineToFix ? (
          <LineToFixPanel generator={generator} lineToFix={lineToFix} />
        ) : null}
      </PhoneLinePanel>
    </div>
  );
}
