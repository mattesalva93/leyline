import { useId } from 'react';
import { useTranslation } from 'react-i18next';
import { LABEL } from '../ui/board-styles.ts';
import { Icon } from '../ui/Icon.tsx';
import type { GuideOnDevice } from '../workspace/guide/use-guide-on-device.ts';

/**
 * The guide's part of the phone menu, under its "Guida" heading: the same two controls as the top
 * bar's "Guida" menu. `afterControlPressed` runs after either, such as closing the phone menu.
 */
export function PhoneGuideItems({
  guideOnDevice,
  itemClassName,
  afterControlPressed,
}: {
  readonly guideOnDevice: GuideOnDevice;
  readonly itemClassName: string;
  readonly afterControlPressed: () => void;
}) {
  const { t } = useTranslation();
  const headingId = useId();
  const { isGuideOn } = guideOnDevice.savedGuide;
  return (
    <div role="group" aria-labelledby={headingId} className="flex flex-col gap-1">
      <span id={headingId} className={`${LABEL} px-3 pt-1 text-muted-foreground`}>
        {t('shell.guide')}
      </span>
      <button
        type="button"
        role="checkbox"
        aria-checked={isGuideOn}
        className={itemClassName}
        onClick={() => {
          guideOnDevice.switchGuide(!isGuideOn);
          afterControlPressed();
        }}
      >
        <span className="grid size-4 place-items-center">
          {isGuideOn && <Icon name="check" className="size-4 animate-fade-in" />}
        </span>
        {t('shell.showGuidedSteps')}
      </button>
      <button
        type="button"
        className={itemClassName}
        onClick={() => {
          guideOnDevice.restartGuide();
          afterControlPressed();
        }}
      >
        <Icon name="flip" />
        {t('shell.restartGuide')}
      </button>
    </div>
  );
}
