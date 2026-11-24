import type { DeckSite } from '../types.ts';

/** Any web address, as long as it says so with its scheme or `www.`. */
const WEB_ADDRESS = /^(?:https?:\/\/|www\.)\S+$/i;
/** The host of a web address, past its scheme and `www.`, without its port. */
const HOST = /^(?:https?:\/\/)?(?:www\.)?([^/?#:\s]+)/i;

const SITE_HOSTS: Readonly<Record<DeckSite, string>> = {
  moxfield: 'moxfield.com',
  archidekt: 'archidekt.com',
};

/** A written deck link: the site it links to, `null` for a site of no known `DeckSite`. */
export interface DeckLink {
  readonly site: DeckSite | null;
}

function siteOfHost(host: string): DeckSite | null {
  const lowerHost = host.toLowerCase();
  const sites = Object.keys(SITE_HOSTS) as DeckSite[];
  return (
    sites.find((site) => {
      const siteHost = SITE_HOSTS[site];
      return lowerHost === siteHost || lowerHost.endsWith(`.${siteHost}`);
    }) ?? null
  );
}

/**
 * The deck link `written` is, or `null` when it is no web address. A known site's address needs
 * no scheme nor `www.`: users copy it out of the address bar, which often hides them.
 */
export function deckLinkOf(written: string): DeckLink | null {
  if (/\s/.test(written)) return null;
  const host = HOST.exec(written)?.[1];
  if (!host) return null;
  const site = siteOfHost(host);
  if (site) return { site };
  return WEB_ADDRESS.test(written) ? { site: null } : null;
}
