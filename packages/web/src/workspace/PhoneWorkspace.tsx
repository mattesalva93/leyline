import { useTranslation } from 'react-i18next';
import { InTopBar } from '../shell/top-bar-slot.tsx';
import { BoardPanel } from '../ui/BoardPanel.tsx';
import { LABEL } from '../ui/board-styles.ts';
import { AdSlot } from './AdSlot.tsx';
import { CardsView } from './CardsView.tsx';
import { DecklistCount } from './DecklistCount.tsx';
import { DecklistEditor } from './DecklistEditor.tsx';
import { DecklistSummary } from './DecklistSummary.tsx';
import { PdfButton, PdfNotes } from './PdfControl.tsx';
import { PhoneLinePanel } from './PhoneLinePanel.tsx';
import { panelLineAt } from './SelectedLinePanel.tsx';
import { SheetSettings } from './SheetSettings.tsx';
import { SheetView } from './SheetView.tsx';
import type { WorkspaceState, WorkspaceStep } from './workspace-state.ts';

const STEPS: readonly WorkspaceStep[] = ['list', 'cards', 'sheet'];

/**
 * The workspace on a phone: one step at a time on the whole screen (the decklist, the cards, the
 * sheet), picked from the bar at the foot of the screen, which ends with the PDF button. The
 * PDF's progress shows just above that bar.
 */
export function PhoneWorkspace({ state }: { readonly state: WorkspaceState }) {
  const { t } = useTranslation();
  const { generator, step } = state;
  return (
    <div className="flex h-full flex-col">
      <InTopBar>
        <DecklistCount cardCount={generator.cardCount} pageCount={generator.pageCount} />
      </InTopBar>
      <div className="min-h-0 flex-1 overflow-y-auto">
        {step === 'list' && (
          <>
            <AdSlot className="border-b-2 border-border bg-panel p-1.5" />
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
                <DecklistSummary
                  defaultLang={generator.defaultLang}
                  onDefaultLangChange={generator.changeDefaultLanguage}
                />
              </BoardPanel>
            </div>
          </>
        )}
        {step === 'cards' && (
          <div className="p-3">
            <CardsView state={state} />
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
      <div className="flex shrink-0 flex-col items-center gap-1 border-t-2 border-border bg-panel px-3 py-2 text-sm empty:hidden">
        <PdfNotes pdf={generator.pdf} />
      </div>
      <nav
        aria-label={t('workspace.steps')}
        className="grid h-14 shrink-0 grid-cols-4 border-t-2 border-border bg-panel"
      >
        {STEPS.map((name) => (
          <button
            key={name}
            type="button"
            aria-current={step === name ? 'step' : undefined}
            className={`${LABEL} border-r-2 border-border ${step === name ? 'bg-foreground text-panel' : ''}`}
            onClick={() => state.goToStep(name)}
          >
            {t(`workspace.stepNames.${name}`)}
          </button>
        ))}
        <PdfButton
          pdf={generator.pdf}
          className={`${LABEL} flex items-center justify-center gap-1 bg-accent px-1 text-accent-foreground disabled:opacity-40`}
        />
      </nav>
      <PhoneLinePanel
        generator={generator}
        panelLine={
          step === 'cards' ? panelLineAt(generator, state.selection?.writtenIndex ?? null) : null
        }
        onClose={() => state.selectTile(null)}
      />
    </div>
  );
}
