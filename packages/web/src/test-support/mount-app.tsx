import { render } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { APP_ROUTES } from '../App.tsx';

/**
 * Mounts the whole app, shell included, as if the user opened `address`. The returned router
 * tells where the app went: `router.state.location.pathname` is the address bar.
 */
export function mountApp(address: string) {
  const router = createMemoryRouter(APP_ROUTES, { initialEntries: [address] });
  render(<RouterProvider router={router} />);
  return router;
}
