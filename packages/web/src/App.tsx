import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { createBrowserRouter, Navigate, RouterProvider, type RouteObject } from 'react-router';
import { AppShell } from './shell/AppShell.tsx';
import { Workspace } from './workspace/Workspace.tsx';

const GENERATOR_PATH = '/proxy';

/** The shell with the areas the app has in production: only the generator, for now. */
function ShellWithProductionAreas() {
  const { t } = useTranslation();
  return <AppShell areas={[{ path: GENERATOR_PATH, label: t('areas.generator') }]} />;
}

export const APP_ROUTES: RouteObject[] = [
  // The main address has no page of its own yet: it opens the generator.
  { index: true, element: <Navigate to={GENERATOR_PATH} replace /> },
  {
    element: <ShellWithProductionAreas />,
    children: [{ path: GENERATOR_PATH, element: <Workspace /> }],
  },
];

export function App() {
  const [router] = useState(() => createBrowserRouter(APP_ROUTES));
  return <RouterProvider router={router} />;
}
