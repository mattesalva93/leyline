import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Outlet } from 'react-router';
import { Icon } from '../ui/Icon.tsx';
import { AreaNav } from './AreaNav.tsx';
import { InfoDialog } from './InfoDialog.tsx';
import { PhoneMenu } from './PhoneMenu.tsx';
import { ScryfallCredit } from './ScryfallCredit.tsx';
import { ThemeSwitch } from './ThemeSwitch.tsx';
import type { ShellOutletContext } from './top-bar-slot.tsx';
import { useTheme } from './use-theme.ts';

const MENU_ITEM = 'flex items-center gap-2 rounded-md px-3 py-2.5 text-left';

/** One area of the app, as the shell's navigation links to it. */
export interface ShellArea {
  readonly path: string;
  readonly label: string;
}

/**
 * The frame every area lives in: the top bar above, the current area below. On a wide screen
 * the areas sit in the top bar; narrower, they open from its menu button. The area may put
 * something of its own on the right of the top bar (`InTopBar`).
 */
export function AppShell({ areas }: { readonly areas: readonly ShellArea[] }) {
  const { t } = useTranslation();
  const { theme, switchTheme } = useTheme();
  const [isInfoOpen, setIsInfoOpen] = useState(false);
  const [topBarSlot, setTopBarSlot] = useState<HTMLElement | null>(null);
  return (
    <div className="flex h-dvh flex-col font-sans">
      <header className="flex h-12 shrink-0 items-center gap-2 bg-chrome px-2 text-chrome-foreground lg:h-11 lg:gap-5 lg:px-4">
        <PhoneMenu areas={areas} className="lg:hidden">
          {(closeMenu) => (
            <>
              <ThemeSwitch theme={theme} onSwitch={switchTheme} showsWords className={MENU_ITEM} />
              <button
                type="button"
                className={MENU_ITEM}
                onClick={() => {
                  closeMenu();
                  setIsInfoOpen(true);
                }}
              >
                <Icon name="info" />
                {t('info.title')}
              </button>
            </>
          )}
        </PhoneMenu>
        <span className="font-mono text-base font-bold">{t('shell.appName')}</span>
        <AreaNav
          areas={areas}
          placement="topBar"
          className="hidden min-w-0 items-center gap-1 lg:flex"
        />
        <ScryfallCredit className="ml-auto" />
        <div ref={setTopBarSlot} className="empty:hidden" />
        <InfoDialog
          isOpen={isInfoOpen}
          onOpenChange={setIsInfoOpen}
          triggerClassName="hidden font-mono text-[11px] font-bold tracking-widest uppercase underline lg:block"
        />
        <ThemeSwitch theme={theme} onSwitch={switchTheme} className="hidden lg:flex" />
      </header>
      <main className="dot-grid min-h-0 flex-1 overflow-y-auto">
        <Outlet context={{ topBarSlot } satisfies ShellOutletContext} />
      </main>
    </div>
  );
}
