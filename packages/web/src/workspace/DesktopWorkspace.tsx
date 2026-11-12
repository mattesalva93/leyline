import { useTranslation } from 'react-i18next';
import { BoardPanel } from '../ui/BoardPanel.tsx';
import { AdSlot } from './AdSlot.tsx';
import { CardsView } from './CardsView.tsx';
import { DecklistEditor } from './DecklistEditor.tsx';
import { Inspector } from './Inspector.tsx';
import { PdfControl } from './PdfControl.tsx';
import { SheetView } from './SheetView.tsx';
import { ToolRail } from './ToolRail.tsx';
import { centreViewAt, type WorkspaceState } from './workspace-state.ts';

/**
 * The workspace on a wide screen, filling it: from left to right the tool rail, the decklist
 * text with a banner's place at its foot, the centre (the card grid or the sheet, with the PDF
 * button) and the inspector. Each zone scrolls on its own.
 */
export function DesktopWorkspace({ workspace }: { readonly workspace: WorkspaceState }) {
  const { t } = useTranslation();
  const { generator, selection } = workspace;
  const view = centreViewAt(workspace.step);
  return (
    <div className="flex h-full gap-4 overflow-hidden p-4">
      <ToolRail view={view} onViewChange={workspace.goToStep} />
      <BoardPanel title={t('workspace.decklistPanel')} className="w-60 shrink-0">
        <DecklistEditor generator={generator} className="min-h-48 flex-1" />
        <AdSlot className="shrink-0 border-t-2 border-border p-2" />
      </BoardPanel>
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <div className="mb-3 flex shrink-0 flex-wrap items-center gap-4">
          <h1 className="text-3xl leading-none font-bold tracking-tight">
            {t(`workspace.views.${view}`)}
          </h1>
          <PdfControl pdf={generator.pdf} className="mr-1 ml-auto" />
        </div>
        {view === 'cards' ? (
          <div className="min-h-0 flex-1 overflow-y-auto">
            <CardsView workspace={workspace} />
          </div>
        ) : (
          <SheetView
            sheetLayout={generator.sheetLayout}
            unprintedCount={generator.unprintedCount}
          />
        )}
      </div>
      <Inspector
        generator={generator}
        view={view}
        selectedLineIndex={selection?.writtenIndex ?? null}
        warnAboutPngWeight={workspace.warnAboutPngWeight}
        className="mr-1 mb-1 w-[340px] shrink-0"
      />
    </div>
  );
}
