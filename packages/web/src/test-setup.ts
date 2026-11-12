import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';
import './i18n.ts';

// jsdom has no media queries: the tests run as a desktop browser, where a mouse is the main input.
window.matchMedia = (query) =>
  ({ matches: false, media: query, addEventListener() {}, removeEventListener() {} }) as never;

// jsdom does not open or close a <dialog>: these do the part the page relies on.
HTMLDialogElement.prototype.showModal = function () {
  this.open = true;
};
HTMLDialogElement.prototype.close = function () {
  this.open = false;
  this.dispatchEvent(new Event('close'));
};

afterEach(cleanup);
