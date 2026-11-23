import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Outlet } from 'react-router';
import { Icon } from '../ui/Icon.tsx';
import { AreaNav } from './AreaNav.tsx';
import { InfoDialog } from './InfoDialog.tsx';
import { PhoneMenu } from './PhoneMenu.tsx';
import { ScryfallCredit } from './ScryfallCredit.tsx';
import { ThemeSwitch } from './ThemeSwitch.tsx';
import type { ShellArea } from './shell-area.ts';
import type { ShellOutletContext } from './shell-outlet-context.ts';
import { useTheme } from './use-theme.ts';
import { BUTTON_STATES } from '../ui/board-styles.ts';

const MENU_ITEM = `flex items-center gap-2 rounded-md px-3 py-2.5 text-left ${BUTTON_STATES}`;

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
        <span className="shrink-0 font-mono text-base font-bold whitespace-nowrap">
          {t('shell.appName')}
        </span>
        <AreaNav
          areas={areas}
          placement="topBar"
          className="hidden min-w-0 items-center gap-1 lg:flex"
        />
        <ScryfallCredit className="ml-auto" />
        <div ref={setTopBarSlot} className="min-w-0 empty:hidden" />
        <InfoDialog
          isOpen={isInfoOpen}
          onOpenChange={setIsInfoOpen}
          triggerClassName={`hidden rounded-md px-1.5 py-1 font-mono text-[11px] font-bold tracking-widest uppercase underline lg:block ${BUTTON_STATES}`}
        />
        <ThemeSwitch theme={theme} onSwitch={switchTheme} className="hidden p-1.5 lg:flex" />
      </header>
      <main className="dot-grid min-h-0 flex-1 overflow-y-auto">
        <Outlet context={{ topBarSlot, theme } satisfies ShellOutletContext} />
      </main>
    </div>
  );
}
