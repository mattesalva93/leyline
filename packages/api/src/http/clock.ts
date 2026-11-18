/** Stops a timer before it elapses; harmless once it has. */
type CancelTimer = () => void;

/** Time as the API sees it: injected, so tests can stop and move it. */
export interface Clock {
  now(): Date;
  startTimer(milliseconds: number, onElapsed: () => void): CancelTimer;
}

export const systemClock: Clock = {
  now: () => new Date(),
  startTimer(milliseconds, onElapsed) {
    // Unref'd: a timer alone, such as a rate limit window's, never keeps a stopping API alive.
    const timer = setTimeout(onElapsed, milliseconds).unref();
    return () => clearTimeout(timer);
  },
};
