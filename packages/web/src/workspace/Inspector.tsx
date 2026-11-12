import { useTranslation } from 'react-i18next';
import { PRINT_PICKER_SCROLL_ROOT } from '../PrintPicker.tsx';
import { SheetOptionsForm } from '../SheetOptionsForm.tsx';
import { BoardPanel } from '../ui/BoardPanel.tsx';
import type { Generator } from '../use-generator.ts';
import { DecklistSummary } from './DecklistSummary.tsx';
import { lineWithPanel, SelectedLinePanel } from './SelectedLinePanel.tsx';
import type { CentreView } from './ToolRail.tsx';

interface InspectorProps {
  readonly generator: Generator;
  readonly view: CentreView;
  /** The `writtenIndex` of the line of the selected tile; `null` when no tile is selected. */
  readonly selectedLineIndex: number | null;
  /** Whether to warn that a PNG sheet makes a PDF heavy enough to strain a phone. */
  readonly warnAboutPngWeight: boolean;
  readonly className?: string;
}

/**
 * The side zone of the workspace: the sheet options in the "sheet" view; otherwise the panel of
 * the selected tile's line, or, with no tile selected, the settings of the whole decklist.
 */
export function Inspector({
  generator,
  view,
  selectedLineIndex,
  warnAboutPngWeight,
  className = '',
}: InspectorProps) {
  const { t } = useTranslation();
  // The sheet view always shows the sheet options.
  const panelLine = view === 'cards' ? lineWithPanel(generator, selectedLineIndex) : null;
  const content = view === 'sheet' ? 'sheetOptions' : panelLine ? 'line' : 'summary';
  return (
    <BoardPanel
      as="aside"
      title={t(`workspace.inspector.${content}`)}
      className={className}
      bodyClassName="overflow-y-auto p-3"
      bodyProps={{ [PRINT_PICKER_SCROLL_ROOT]: '' }}
    >
      {content === 'sheetOptions' && (
        <SheetOptionsForm
          options={generator.sheetOptions}
          onChange={generator.changeSheetOptions}
          warnAboutPngWeight={warnAboutPngWeight}
        />
      )}
      {panelLine && <SelectedLinePanel generator={generator} lineInText={panelLine} />}
      {content === 'summary' && <DecklistSummary generator={generator} />}
    </BoardPanel>
  );
}
