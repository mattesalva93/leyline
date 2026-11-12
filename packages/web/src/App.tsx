import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { createBrowserRouter, Navigate, RouterProvider, type RouteObject } from 'react-router';
import { GeneratorPage } from './GeneratorPage.tsx';
import { AppShell } from './shell/AppShell.tsx';

const GENERATOR_PATH = '/proxy';

/** The shell with the areas that exist today: only the generator. */
function ShellWithTodaysAreas() {
  const { t } = useTranslation();
  return <AppShell areas={[{ path: GENERATOR_PATH, label: t('areas.generator') }]} />;
}

export const APP_ROUTES: RouteObject[] = [
  // The main address has no page of its own yet: it opens the generator.
  { index: true, element: <Navigate to={GENERATOR_PATH} replace /> },
  {
    element: <ShellWithTodaysAreas />,
    children: [{ path: GENERATOR_PATH, element: <GeneratorPage /> }],
  },
];

export function App() {
  const [router] = useState(() => createBrowserRouter(APP_ROUTES));
  return <RouterProvider router={router} />;
}
