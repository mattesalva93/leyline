import type { DeckSite } from '../types.ts';

/** Any web address, as long as it says so with its scheme or `www.`. */
const WEB_ADDRESS = /^(?:https?:\/\/|www\.)\S+$/i;
/** The host of a web address, past its scheme and `www.`. */
const HOST = /^(?:https?:\/\/)?(?:www\.)?([^/?#\s]+)/i;

const SITE_HOSTS: Readonly<Record<DeckSite, string>> = {
  moxfield: 'moxfield.com',
  archidekt: 'archidekt.com',
};

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
 * The deck site `written` links to when it is a deck link, `null` when it links to a site of no
 * known `DeckSite`, `undefined` when it is no web address. A known site's address needs no
 * scheme nor `www.`: users copy it out of the address bar, which often hides them.
 */
export function deckLinkSite(written: string): DeckSite | null | undefined {
  if (/\s/.test(written)) return undefined;
  const host = HOST.exec(written)?.[1];
  if (!host) return undefined;
  const site = siteOfHost(host);
  if (site) return site;
  return WEB_ADDRESS.test(written) ? null : undefined;
}
