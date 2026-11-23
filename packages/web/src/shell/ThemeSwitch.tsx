import { useTranslation } from 'react-i18next';
import { Icon } from '../ui/Icon.tsx';
import type { Theme } from './theme-choice.ts';
import { BUTTON_STATES } from '../ui/board-styles.ts';

/**
 * The button that flips between the light and the dark theme. It shows the theme it switches
 * to: just its icon in the top bar, icon and words in the phone menu.
 */
export function ThemeSwitch({
  theme,
  onSwitch,
  showsWords = false,
  className = '',
}: {
  readonly theme: Theme;
  readonly onSwitch: () => void;
  readonly showsWords?: boolean;
  readonly className?: string;
}) {
  const { t } = useTranslation();
  const label = theme === 'dark' ? t('shell.switchToLight') : t('shell.switchToDark');
  return (
    <button
      type="button"
      aria-label={showsWords ? undefined : label}
      className={`flex items-center gap-2 rounded-md ${BUTTON_STATES} ${className}`}
      onClick={onSwitch}
    >
      <Icon name={theme === 'dark' ? 'sun' : 'moon'} />
      {showsWords && label}
    </button>
  );
}
