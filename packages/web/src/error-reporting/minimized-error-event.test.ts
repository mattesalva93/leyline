import type { ErrorEvent } from '@sentry/browser';
import { describe, expect, it } from 'vitest';
import { minimizedErrorEvent } from './minimized-error-event.ts';

function errorEventAt(url: string): ErrorEvent {
  return {
    type: undefined,
    event_id: 'abc',
    release: '0.2.2',
    message: 'boom',
    request: {
      url,
      query_string: 'q=Lightning+Bolt',
      headers: { 'User-Agent': 'Firefox', Cookie: 'a=b' },
      cookies: { a: 'b' },
      data: '4 Lightning Bolt',
      env: { REMOTE_ADDR: '203.0.113.7' },
    },
    user: { ip_address: '203.0.113.7', id: 'tester' },
    breadcrumbs: [{ category: 'ui.click', message: 'button "Lightning Bolt"' }],
    exception: {
      values: [
        {
          type: 'TypeError',
          value: 'x is undefined',
          stacktrace: {
            frames: [
              {
                filename: 'https://leyline.website/assets/index-a1.js?v=1#top',
                abs_path: 'https://leyline.website/assets/index-a1.js?v=1#top',
                lineno: 1,
              },
            ],
          },
        },
      ],
    },
  };
}

describe('the error event sent to Bugsink', () => {
  it('keeps the page address without its query string, where a search writes card names', () => {
    const event = minimizedErrorEvent(errorEventAt('https://leyline.website/proxy?q=Bolt#grid'));

    expect(event.request).toEqual({ url: 'https://leyline.website/proxy' });
  });

  it('sends none of the request’s headers, cookies, body or environment', () => {
    const { request } = minimizedErrorEvent(errorEventAt('https://leyline.website/proxy'));

    expect(Object.keys(request ?? {})).toEqual(['url']);
  });

  it('sends no user, so no IP address', () => {
    expect(minimizedErrorEvent(errorEventAt('https://leyline.website/')).user).toBeUndefined();
  });

  it('sends no breadcrumbs, where a click or a console message carries the page’s text', () => {
    expect(
      minimizedErrorEvent(errorEventAt('https://leyline.website/')).breadcrumbs,
    ).toBeUndefined();
  });

  it('drops the query string of every stack frame’s script address', () => {
    const [frame] =
      minimizedErrorEvent(errorEventAt('https://leyline.website/')).exception?.values?.[0]
        ?.stacktrace?.frames ?? [];

    expect(frame).toMatchObject({
      filename: 'https://leyline.website/assets/index-a1.js',
      abs_path: 'https://leyline.website/assets/index-a1.js',
      lineno: 1,
    });
  });

  it('keeps what tells the error apart: its release, message and exception', () => {
    const event = minimizedErrorEvent(errorEventAt('https://leyline.website/'));

    expect(event).toMatchObject({
      release: '0.2.2',
      message: 'boom',
      exception: { values: [{ type: 'TypeError', value: 'x is undefined' }] },
    });
  });
});
