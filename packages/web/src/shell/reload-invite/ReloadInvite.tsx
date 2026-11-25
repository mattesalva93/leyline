import { useId, useState, type CSSProperties } from 'react';
import { useTranslation } from 'react-i18next';
import { Icon } from '../../ui/Icon.tsx';
import {
  BOARD_PANEL,
  BUTTON_STATES,
  LABEL,
  PRIMARY_BUTTON,
  SECONDARY_BUTTON,
} from '../../ui/board-styles.ts';
import { PHONE_STEP_BAR_HEIGHT } from '../../workspace/phone-step-bar.ts';
import { reloadPage } from './reload-page.ts';
import { useNewerOnlineRelease } from './use-newer-online-release.ts';

/** On a phone the invite floats just above the step bar, which stays free. */
const ABOVE_PHONE_STEP_BAR = { '--phone-step-bar-height': PHONE_STEP_BAR_HEIGHT } as CSSProperties;

/**
 * Invites a page left open on an older release to reload, with what the release online brings:
 * its «Novità», or its «Correzioni» when it brings only those. Closed, it stays closed for that
 * release in this tab. It floats over the page without blocking it, and never reloads on its own.
 */
export function ReloadInvite() {
  const { t } = useTranslation();
  const newer = useNewerOnlineRelease();
  const [closedFor, setClosedFor] = useState<string | null>(null);
  const labelId = useId();
  if (!newer || newer.version === closedFor) return null;

  const close = () => setClosedFor(newer.version);
  const changes =
    newer.news.length > 0
      ? { title: t('reloadInvite.news'), items: newer.news }
      : { title: t('reloadInvite.fixes'), items: newer.fixes };
  return (
    <div
      role="status"
      aria-labelledby={labelId}
      style={ABOVE_PHONE_STEP_BAR}
      className={`fixed inset-x-4 bottom-[calc(var(--phone-step-bar-height)+1rem)] z-30 p-4 text-foreground lg:inset-x-auto lg:right-6 lg:bottom-6 lg:w-96 ${BOARD_PANEL}`}
    >
      <div className="mb-2 flex items-start gap-2">
        <p id={labelId} className={`${LABEL} flex-1 text-accent`}>
          {t('reloadInvite.label', { version: newer.version })}
        </p>
        <button
          type="button"
          onClick={close}
          aria-label={t('reloadInvite.close')}
          className={`-m-1 rounded-md p-1 ${BUTTON_STATES}`}
        >
          <Icon name="close" />
        </button>
      </div>
      {changes.items.length > 0 && (
        <>
          <p className="mb-1 text-sm font-semibold">{changes.title}</p>
          <ul className="list-disc space-y-1 pl-5 text-sm">
            {changes.items.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </>
      )}
      <p className="mt-3 text-xs text-muted-foreground">{t('reloadInvite.workStays')}</p>
      <div className="mt-3 flex justify-end gap-2">
        <button type="button" onClick={close} className={SECONDARY_BUTTON}>
          {t('reloadInvite.later')}
        </button>
        <button type="button" onClick={reloadPage} className={PRIMARY_BUTTON}>
          {t('reloadInvite.reload')}
        </button>
      </div>
    </div>
  );
}
