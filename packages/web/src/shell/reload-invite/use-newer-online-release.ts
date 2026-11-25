import { useEffect, useState } from 'react';
import { fetchOnlineRelease } from '../../online-release/fetch-online-release.ts';
import { isAbove, type OnlineRelease } from '../../online-release/online-release.ts';

/**
 * The release online when the page last came back to the foreground, if it is above the one
 * this bundle was built from; null otherwise. Only a higher version counts, so a rollback does
 * not invite to a "new" older release.
 */
export function useNewerOnlineRelease(): OnlineRelease | null {
  const [newer, setNewer] = useState<OnlineRelease | null>(null);
  useEffect(() => {
    let isMounted = true;
    const askOnComingBack = async () => {
      if (document.visibilityState !== 'visible') return;
      const online = await fetchOnlineRelease();
      if (isMounted && online && isAbove(online.version, import.meta.env.APP_VERSION))
        setNewer(online);
    };
    document.addEventListener('visibilitychange', askOnComingBack);
    return () => {
      isMounted = false;
      document.removeEventListener('visibilitychange', askOnComingBack);
    };
  }, []);
  return newer;
}
