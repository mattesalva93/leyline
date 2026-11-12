import type { Ref } from 'react';
import { useTranslation } from 'react-i18next';
import { LanguagePicker } from '../LanguagePicker.tsx';
import { LinePanel } from '../LinePanel.tsx';
import { PRINT_PICKER_SCROLL_ROOT } from '../PrintPicker.tsx';
import { SheetOptionsForm } from '../SheetOptionsForm.tsx';
import { BOARD_PANEL, LABEL } from '../ui/board-styles.ts';
import type { Generator } from '../use-generator.ts';
import type { CentreView } from './ToolRail.tsx';

interface InspectorProps {
  readonly generator: Generator;
  readonly view: CentreView;
  /** The `writtenIndex` of the line of the selected tile; `null` when no tile is selected. */
  readonly selectedLineIndex: number | null;
  /** Whether to warn that a PNG sheet makes a PDF heavy enough to strain a phone. */
  readonly warnAboutPngWeight: boolean;
  readonly className?: string;
  readonly ref?: Ref<HTMLElement>;
}

type InspectorContent = 'sheetOptions' | 'line' | 'summary';

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
  ref,
}: InspectorProps) {
  const { t } = useTranslation();
  const selectedLine = selectedLineIndex === null ? undefined : generator.lineAt(selectedLineIndex);
  // Only a resolved line has a panel; the sheet view always shows the sheet options.
  const panelLine =
    view === 'cards' && selectedLineIndex !== null && selectedLine?.status === 'resolved'
      ? { writtenIndex: selectedLineIndex, line: selectedLine }
      : null;
  const content: InspectorContent =
    view === 'sheet' ? 'sheetOptions' : panelLine ? 'line' : 'summary';
  return (
    <aside
      ref={ref}
      aria-labelledby="inspector-title"
      className={`${BOARD_PANEL} flex min-h-0 flex-col overflow-hidden ${className}`}
    >
      <h2
        id="inspector-title"
        className={`${LABEL} shrink-0 border-b-2 border-border bg-raised px-3 py-1`}
      >
        {t(`workspace.inspector.${content}`)}
      </h2>
      <div className="min-h-0 flex-1 overflow-y-auto p-3" {...{ [PRINT_PICKER_SCROLL_ROOT]: '' }}>
        {content === 'sheetOptions' && (
          <SheetOptionsForm
            options={generator.sheetOptions}
            onChange={generator.changeSheetOptions}
            warnAboutPngWeight={warnAboutPngWeight}
          />
        )}
        {panelLine && (
          <LinePanel
            // A new line starts its panel afresh: its own prints, scrolled to the top.
            key={panelLine.writtenIndex}
            line={panelLine.line}
            onLanguageChange={(lang) => generator.changeLineLanguage(panelLine.writtenIndex, lang)}
            onQuantityChange={(quantity) =>
              generator.changeLineQuantity(panelLine.writtenIndex, quantity)
            }
            onAllocationChoice={(allocations) =>
              generator.chooseAllocations(panelLine.writtenIndex, allocations)
            }
          />
        )}
        {content === 'summary' && (
          <div className="flex flex-col gap-3">
            <LanguagePicker
              label={t('app.defaultLang')}
              selectedLang={generator.defaultLang}
              onChange={generator.changeDefaultLanguage}
            />
            <p className="text-sm text-muted-foreground">{t('workspace.selectTileHint')}</p>
          </div>
        )}
      </div>
    </aside>
  );
}
