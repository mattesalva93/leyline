import { useTranslation } from 'react-i18next';
import { NavLink } from 'react-router';
import type { ShellArea } from './AppShell.tsx';

const LINK_LOOK = {
  topBar:
    'px-2.5 py-1.5 font-mono text-[11px] font-bold tracking-widest whitespace-nowrap uppercase',
  menu: 'rounded-md px-3 py-2.5 text-base',
} as const;

/**
 * The links to the app's areas, the current one marked: a row in the top bar on a wide screen,
 * a column in the menu on a phone.
 */
export function AreaNav({
  areas,
  placement,
  className = '',
  onNavigate,
}: {
  readonly areas: readonly ShellArea[];
  readonly placement: keyof typeof LINK_LOOK;
  readonly className?: string;
  readonly onNavigate?: () => void;
}) {
  const { t } = useTranslation();
  return (
    <nav aria-label={t('shell.areas')} className={className}>
      {areas.map((area) => (
        <NavLink
          key={area.path}
          to={area.path}
          onClick={onNavigate}
          className={({ isActive }) =>
            `${LINK_LOOK[placement]} ${isActive ? 'bg-accent font-bold text-accent-foreground' : 'hover:underline'}`
          }
        >
          {area.label}
        </NavLink>
      ))}
    </nav>
  );
}
