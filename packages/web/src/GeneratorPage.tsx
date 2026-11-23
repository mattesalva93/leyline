import { useGenerator } from './generator/use-generator.ts';
import { Workspace } from './workspace/Workspace.tsx';

/** The generator: its workspace, empty until a decklist is under way. */
export function GeneratorPage() {
  return <Workspace generator={useGenerator()} />;
}
