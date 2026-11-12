import { useTranslation } from 'react-i18next';
import { PRINT_PICKER_SCROLL_ROOT_PROPS } from '../PrintPicker.tsx';
import { BoardPanel } from '../ui/BoardPanel.tsx';
import { DecklistSummary } from './DecklistSummary.tsx';
import { panelLineAt, SelectedLinePanel } from './SelectedLinePanel.tsx';
import { SheetSettings } from './SheetSettings.tsx';
import type { CentreView } from './ToolRail.tsx';
import type { WorkspaceState } from './workspace-state.ts';

/**
 * The side zone of the workspace: the sheet options in the "sheet" view; otherwise the panel of
 * the selected tile's line, or, with no tile selected, the settings of the whole decklist.
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
  const panelLine =
    view === 'cards' ? panelLineAt(generator, state.selection?.writtenIndex ?? null) : null;
  const content = view === 'sheet' ? 'sheetOptions' : panelLine ? 'line' : 'summary';
  return (
    <BoardPanel as="aside" title={t(`workspace.inspector.${content}`)} className={className}>
      <div className="min-h-0 flex-1 overflow-y-auto p-3" {...PRINT_PICKER_SCROLL_ROOT_PROPS}>
        {content === 'sheetOptions' && <SheetSettings state={state} />}
        {panelLine && <SelectedLinePanel generator={generator} panelLine={panelLine} />}
        {content === 'summary' && (
          <DecklistSummary
            defaultLang={generator.defaultLang}
            onDefaultLangChange={generator.changeDefaultLanguage}
          />
        )}
      </div>
    </BoardPanel>
  );
}
