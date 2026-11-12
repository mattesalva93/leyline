import { useTranslation } from 'react-i18next';
import { Outlet } from 'react-router';
import { AreaNav } from './AreaNav.tsx';
import { PhoneMenu } from './PhoneMenu.tsx';
import { ThemeSwitch } from './ThemeSwitch.tsx';
import { useTheme } from './use-theme.ts';

/** One area of the app, as the shell's navigation links to it. */
export interface ShellArea {
  readonly path: string;
  readonly label: string;
}

/**
 * The frame every area lives in: the top bar above, the current area below. On a wide screen
 * the areas sit in the top bar; narrower, they open from its menu button.
 */
export function AppShell({ areas }: { readonly areas: readonly ShellArea[] }) {
  const { t } = useTranslation();
  const { theme, switchTheme } = useTheme();
  return (
    <div className="flex h-dvh flex-col font-sans">
      <header className="flex h-12 shrink-0 items-center gap-2 bg-chrome px-2 text-chrome-foreground lg:h-11 lg:gap-5 lg:px-4">
        <PhoneMenu areas={areas} className="lg:hidden">
          {() => (
            <ThemeSwitch
              theme={theme}
              onSwitch={switchTheme}
              showsWords
              className="rounded-md px-3 py-2.5 text-left"
            />
          )}
        </PhoneMenu>
        <span className="font-mono text-base font-bold">{t('shell.appName')}</span>
        <AreaNav
          areas={areas}
          placement="topBar"
          className="hidden min-w-0 items-center gap-1 lg:flex"
        />
        <ThemeSwitch theme={theme} onSwitch={switchTheme} className="ml-auto hidden lg:flex" />
      </header>
      <main className="dot-grid min-h-0 flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
}
