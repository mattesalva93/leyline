import { useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { InTopBar } from '../shell/top-bar-slot.tsx';
import { BoardPanel } from '../ui/BoardPanel.tsx';
import { LABEL } from '../ui/board-styles.ts';
import { AdSlot } from './AdSlot.tsx';
import { CardsView } from './CardsView.tsx';
import { DecklistCount } from './DecklistCount.tsx';
import { DecklistEditor } from '../decklist-editor/DecklistEditor.tsx';
import { DecklistSummary } from './DecklistSummary.tsx';
import { PhoneLinePanel } from './PhoneLinePanel.tsx';
import { PhonePdfStrip } from './PhonePdfStrip.tsx';
import { lineToFixOf, LineToFixPanel } from './LineToFixPanel.tsx';
import { panelLineOf, SelectedLinePanel } from './SelectedLinePanel.tsx';
import { SheetSettings } from './SheetSettings.tsx';
import { SheetView } from './SheetView.tsx';
import { TILE_WIDTH_PX } from './tile-width.ts';
import { focusCurrentGridCell } from './use-grid-cell-focus.ts';
import type { WorkspaceState, WorkspaceStep } from './workspace-state.ts';

const STEPS: readonly WorkspaceStep[] = ['list', 'cards', 'sheet'];

/**
 * The workspace on a phone: one step at a time on the whole screen (the decklist, the cards, the
 * sheet with its PDF button), picked from the bar at the foot of the screen.
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
            <BoardPanel title={t('workspace.decklistPanel')} isFoldable className="shrink-0">
              <DecklistEditor generator={generator} className="h-[38dvh]" />
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
        className="grid h-14 shrink-0 border-t-2 border-border bg-panel"
        style={{ gridTemplateColumns: `repeat(${STEPS.length}, 1fr)` }}
      >
        {STEPS.map((name) => (
          <button
            key={name}
            type="button"
            aria-current={step === name ? 'step' : undefined}
            className={`${LABEL} border-border not-last:border-r-2 ${step === name ? 'bg-foreground text-panel' : ''}`}
            onClick={() => state.goToStep(name)}
          >
            {t(`workspace.stepNames.${name}`)}
          </button>
        ))}
      </nav>
      <PhoneLinePanel
        title={t(panelLine ? 'workspace.inspector.line' : 'workspace.inspector.lineToFix')}
        onClose={() => state.selectTile(null)}
        onClosed={() => {
          if (isLinePanelOpenedByKeyboard.current) focusCurrentGridCell();
          isLinePanelOpenedByKeyboard.current = false;
        }}
      >
        {panelLine ? (
          <SelectedLinePanel
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
