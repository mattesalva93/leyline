import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';
import './i18n.ts';
import { WIDE_SCREEN_QUERY } from './screen-size.ts';

// jsdom has no media queries: the tests run as a wide desktop browser, where a mouse is the main
// input.
window.matchMedia = (query) =>
  ({
    matches: query === WIDE_SCREEN_QUERY,
    media: query,
    addEventListener() {},
    removeEventListener() {},
  }) as never;

// jsdom does not open or close a <dialog>: these do the part the page relies on.
HTMLDialogElement.prototype.showModal = function () {
  this.open = true;
};
HTMLDialogElement.prototype.close = function () {
  this.open = false;
  this.dispatchEvent(new Event('close'));
};

afterEach(cleanup);

// jsdom lays nothing out, so nothing ever comes into sight or changes size: these never report.
window.IntersectionObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords() {
    return [];
  }
} as never;
