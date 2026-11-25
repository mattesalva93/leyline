import { readOnlineRelease, VERSION_FILE, type OnlineRelease } from './online-release.ts';

/**
 * The release online now, asked of the server past every cache; null when the server cannot
 * be reached or its answer cannot be read.
 */
export async function fetchOnlineRelease(): Promise<OnlineRelease | null> {
  try {
    const response = await fetch(`${import.meta.env.BASE_URL}${VERSION_FILE}`, {
      cache: 'no-store',
    });
    return response.ok ? readOnlineRelease(await response.json()) : null;
  } catch {
    return null;
  }
}
