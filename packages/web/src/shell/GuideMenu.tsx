import { Trans, useTranslation } from 'react-i18next';
import { BUTTON_STATES, LABEL } from '../ui/board-styles.ts';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../ui/DropdownMenu.tsx';
import { Icon } from '../ui/Icon.tsx';
import type { GuideOnDevice } from '../workspace/guide/use-guide-on-device.ts';

/**
 * "Guida" in the top bar: its button tells whether the guide is on and opens the menu that
 * switches it and starts it over. Every control of the guide goes here, so it grows without
 * crowding the top bar.
 */
export function GuideMenu({
  guideOnDevice,
  className = '',
}: {
  readonly guideOnDevice: GuideOnDevice;
  readonly className?: string;
}) {
  const { t } = useTranslation();
  const { isGuideOn } = guideOnDevice.savedGuide;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={`group flex items-center gap-1 rounded-md px-1.5 py-1 whitespace-nowrap data-[state=open]:bg-accent data-[state=open]:text-accent-foreground ${LABEL} ${BUTTON_STATES} ${className}`}
      >
        <Trans
          i18nKey="shell.guideMenu"
          values={{ state: isGuideOn ? t('shell.guideOn') : t('shell.guideOff') }}
          components={{
            state: (
              <span
                className={`group-hover:text-inherit group-data-[state=open]:text-inherit ${isGuideOn ? 'text-accent' : 'text-muted-foreground'}`}
              />
            ),
          }}
        />
        <Icon name="chevronDown" className="size-3" />
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuCheckboxItem isChecked={isGuideOn} onCheckedChange={guideOnDevice.switchGuide}>
          {t('shell.showGuidedSteps')}
        </DropdownMenuCheckboxItem>
        <DropdownMenuItem onSelect={guideOnDevice.restartGuide}>
          <Icon name="flip" />
          {t('shell.restartGuide')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
