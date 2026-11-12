import { useTranslation } from 'react-i18next';
import { SheetOptionsForm } from '../SheetOptionsForm.tsx';
import { BoardPanel } from '../ui/BoardPanel.tsx';
import { LABEL } from '../ui/board-styles.ts';
import { AdSlot } from './AdSlot.tsx';
import { CardsView } from './CardsView.tsx';
import { DecklistEditor } from './DecklistEditor.tsx';
import { DecklistSummary } from './DecklistSummary.tsx';
import { SheetView } from './SheetView.tsx';
import type { WorkspaceState, WorkspaceStep } from './workspace-state.ts';

const STEPS: readonly WorkspaceStep[] = ['list', 'cards', 'sheet'];

/**
 * The workspace on a phone: one step at a time on the whole screen (the decklist, the cards, the
 * sheet), picked from the bar at the foot of the screen.
 */
export function PhoneSteps({ workspace }: { readonly workspace: WorkspaceState }) {
  const { t } = useTranslation();
  const { generator, step } = workspace;
  return (
    <div className="flex h-full flex-col">
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
                <DecklistSummary generator={generator} />
              </BoardPanel>
            </div>
          </>
        )}
        {step === 'cards' && (
          <div className="p-3">
            <h1 className="mb-2 text-2xl leading-none font-bold">{t('workspace.views.cards')}</h1>
            <CardsView workspace={workspace} />
          </div>
        )}
        {step === 'sheet' && (
          <div className="flex flex-col gap-4 p-3 pr-4">
            <SheetView
              sheetLayout={generator.sheetLayout}
              unprintedCount={generator.unprintedCount}
            />
            <BoardPanel
              title={t('workspace.inspector.sheetOptions')}
              className="shrink-0"
              bodyClassName="p-3"
            >
              <SheetOptionsForm
                options={generator.sheetOptions}
                onChange={generator.changeSheetOptions}
                warnAboutPngWeight={workspace.warnAboutPngWeight}
              />
            </BoardPanel>
          </div>
        )}
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
            onClick={() => workspace.goToStep(name)}
          >
            {t(`workspace.stepNames.${name}`)}
          </button>
        ))}
      </nav>
    </div>
  );
}
