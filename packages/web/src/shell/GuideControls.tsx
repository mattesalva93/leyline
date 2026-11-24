import { useTranslation } from 'react-i18next';
import type { GuideOnDevice } from '../workspace/guide/use-guide-on-device.ts';

/**
 * The shell's controls of the guide: the "Guida" switch, which turns it off and on again, and
 * "Ricomincia la guida", which starts it over from its first step. `afterControlPressed` runs after either,
 * such as closing the phone menu.
 */
export function GuideControls({
  guideOnDevice,
  controlClassName,
  afterControlPressed = () => {},
}: {
  readonly guideOnDevice: GuideOnDevice;
  readonly controlClassName: string;
  readonly afterControlPressed?: () => void;
}) {
  const { t } = useTranslation();
  const { isGuideOn } = guideOnDevice.savedGuide;
  return (
    <>
      <button
        type="button"
        role="switch"
        aria-checked={isGuideOn}
        className={controlClassName}
        onClick={() => {
          guideOnDevice.switchGuide(!isGuideOn);
          afterControlPressed();
        }}
      >
        <SwitchTrack isOn={isGuideOn} />
        {t('shell.guide')}
      </button>
      <button
        type="button"
        className={controlClassName}
        onClick={() => {
          guideOnDevice.restartGuide();
          afterControlPressed();
        }}
      >
        {t('shell.restartGuide')}
      </button>
    </>
  );
}

/** The track and knob that show a switch on or off; the switch's role tells it in words. */
function SwitchTrack({ isOn }: { readonly isOn: boolean }) {
  return (
    <span
      aria-hidden
      className={`flex h-3.5 w-6 shrink-0 items-center rounded-full border-2 border-current px-px ${isOn ? 'justify-end' : 'justify-start'}`}
    >
      <span className={`size-1.5 rounded-full ${isOn ? 'bg-current' : 'border border-current'}`} />
    </span>
  );
}
