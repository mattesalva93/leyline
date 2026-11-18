import { cleanup } from '@testing-library/react';
import { afterEach, beforeEach } from 'vitest';
import '../i18n.ts';
import { DESKTOP, stubScreen } from './test-screen.ts';

beforeEach(() => stubScreen(DESKTOP));

// jsdom does not open or close a <dialog>: these do the part the page relies on.
HTMLDialogElement.prototype.showModal = function () {
  this.open = true;
};
HTMLDialogElement.prototype.close = function () {
  this.open = false;
  this.dispatchEvent(new Event('close'));
};

afterEach(cleanup);

// jsdom lays nothing out, so there is nothing to scroll: the page only asks.
Element.prototype.scrollIntoView = () => {};

// jsdom lays nothing out, so nothing ever comes into sight or changes size: these never report.
window.IntersectionObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords() {
    return [];
  }
} as never;
