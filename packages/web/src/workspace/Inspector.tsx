import { useTranslation } from 'react-i18next';
import { PRINT_PICKER_SCROLL_ROOT_PROPS } from '../PrintPicker.tsx';
import { SECONDARY_BUTTON } from '../ui/board-styles.ts';
import { DecklistSummary } from './DecklistSummary.tsx';
import { lineToFixOf, LineToFixPanel } from './LineToFixPanel.tsx';
import { panelLineOf, SelectedLinePanel } from './SelectedLinePanel.tsx';
import { SheetSettings } from './SheetSettings.tsx';
import { SidePanel } from './SidePanel.tsx';
import type { CentreView } from './ToolRail.tsx';
import type { WorkspaceState } from './workspace-state.ts';

/**
 * The side zone of the workspace: the sheet options in the "sheet" view; otherwise the panel of
 * the selected tile's line, or of its line to fix, or, with no tile selected, the summary.
 */
export function Inspector({
  state,
  view,
  className = '',
}: {
  readonly state: WorkspaceState;
  readonly view: CentreView;
  readonly className?: string;
}) {
  const { t } = useTranslation();
  const { generator } = state;
  const panelLine = view === 'cards' ? panelLineOf(state.gridTiles, state.selection) : null;
  const lineToFix = view === 'cards' ? lineToFixOf(state.gridTiles, state.selection) : null;
  const content =
    view === 'sheet' ? 'sheetOptions' : panelLine ? 'line' : lineToFix ? 'lineToFix' : 'summary';
  return (
    <SidePanel
      name="inspector"
      as="aside"
      title={t(`workspace.inspector.${content}`)}
      gridSide="left"
      className={className}
    >
      <div className="min-h-0 flex-1 overflow-y-auto p-3" {...PRINT_PICKER_SCROLL_ROOT_PROPS}>
        {content === 'sheetOptions' && <SheetSettings state={state} />}
        {panelLine && <SelectedLinePanel generator={generator} panelLine={panelLine} />}
        {lineToFix && (
          <div className="flex flex-col gap-4">
            <LineToFixPanel generator={generator} lineToFix={lineToFix} />
            <button
              type="button"
              className={`${SECONDARY_BUTTON} self-start`}
              onClick={() => state.selectTile(null)}
            >
              {t('panel.backToSummary')}
            </button>
          </div>
        )}
        {content === 'summary' && <DecklistSummary state={state} />}
      </div>
    </SidePanel>
  );
}
