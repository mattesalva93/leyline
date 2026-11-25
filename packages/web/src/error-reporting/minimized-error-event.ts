import type { ErrorEvent, Exception, StackFrame } from '@sentry/browser';

/** The address without its query string and fragment, where a search writes card names. */
function withoutQuery(url: string): string {
  return url.split(/[?#]/, 1)[0] ?? '';
}

function minimizedFrame(frame: StackFrame): StackFrame {
  const minimized = { ...frame };
  if (frame.filename !== undefined) minimized.filename = withoutQuery(frame.filename);
  if (frame.abs_path !== undefined) minimized.abs_path = withoutQuery(frame.abs_path);
  return minimized;
}

function minimizedException(exception: Exception): Exception {
  const frames = exception.stacktrace?.frames;
  if (!exception.stacktrace || !frames) return exception;
  return {
    ...exception,
    stacktrace: { ...exception.stacktrace, frames: frames.map(minimizedFrame) },
  };
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
  if (event.request?.url !== undefined) {
    minimized.request = { url: withoutQuery(event.request.url) };
  }
  const exceptions = event.exception?.values;
  if (event.exception && exceptions) {
    minimized.exception = { ...event.exception, values: exceptions.map(minimizedException) };
  }
  return minimized;
}
