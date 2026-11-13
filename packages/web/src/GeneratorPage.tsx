import { LandingPage } from './landing-page/LandingPage.tsx';
import { useGenerator } from './use-generator.ts';
import { Workspace } from './workspace/Workspace.tsx';

/** The generator: the landing page until a decklist is under way, then the workspace. */
export function GeneratorPage() {
  const generator = useGenerator();
  return generator.isDecklistStarted ? (
    <Workspace generator={generator} />
  ) : (
    <LandingPage generator={generator} />
  );
}
