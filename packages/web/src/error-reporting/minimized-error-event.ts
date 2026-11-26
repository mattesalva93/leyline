import type { ErrorEvent, Exception, StackFrame } from '@sentry/browser';

/** An address, then its query string or fragment, up to the space or punctuation ending it. */
const ADDRESS_WITH_QUERY = /([a-z][a-z\d+.-]*:\/\/[^\s?#]*)[?#][^\s,;)"'<>]*/gi;

/** The text with every address it holds cut before its query string, where a search writes card names. */
function withoutQueries(text: string): string {
  return text.replace(ADDRESS_WITH_QUERY, '$1');
}

function minimizedFrame(frame: StackFrame): StackFrame {
  const minimized = { ...frame };
  if (frame.filename !== undefined) minimized.filename = withoutQueries(frame.filename);
  if (frame.abs_path !== undefined) minimized.abs_path = withoutQueries(frame.abs_path);
  return minimized;
}

function minimizedException(exception: Exception): Exception {
  const minimized = { ...exception };
  if (exception.value !== undefined) minimized.value = withoutQueries(exception.value);
  const frames = exception.stacktrace?.frames;
  if (exception.stacktrace && frames) {
    minimized.stacktrace = { ...exception.stacktrace, frames: frames.map(minimizedFrame) };
  }
  return minimized;
}

/**
 * The error event as Bugsink receives it (ADR 0027): what tells the error apart, and nothing the
 * tester wrote or that identifies them. The SDK's `beforeSend`, a last net behind the options
 * that already keep most of it out.
 */
export function minimizedErrorEvent(event: ErrorEvent): ErrorEvent {
  const minimized: ErrorEvent = { ...event };
  delete minimized.user;
  delete minimized.breadcrumbs;
  delete minimized.request;
  if (event.message !== undefined) minimized.message = withoutQueries(event.message);
  const exceptions = event.exception?.values;
  if (event.exception && exceptions) {
    minimized.exception = { ...event.exception, values: exceptions.map(minimizedException) };
  }
  return minimized;
}
