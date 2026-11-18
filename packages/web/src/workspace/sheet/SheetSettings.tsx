import { SheetOptionsForm } from './SheetOptionsForm.tsx';
import type { WorkspaceState } from '../workspace-state.ts';

/** The sheet options of the generator, as both layouts of the workspace show them. */
export function SheetSettings({ state }: { readonly state: WorkspaceState }) {
  return (
    <SheetOptionsForm
      options={state.generator.sheetOptions}
      onChange={state.generator.changeSheetOptions}
      warnAboutPngWeight={state.warnAboutPngWeight}
    />
  );
}
