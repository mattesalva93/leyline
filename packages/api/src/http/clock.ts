/** Stops a timer before it elapses; harmless once it has. */
export type CancelTimer = () => void;

/** Time as the API sees it: injected, so tests can stop and move it. */
export interface Clock {
  now(): Date;
  startTimer(milliseconds: number, onElapsed: () => void): CancelTimer;
}

export const systemClock: Clock = {
  now: () => new Date(),
  startTimer(milliseconds, onElapsed) {
    const timer = setTimeout(onElapsed, milliseconds);
    return () => clearTimeout(timer);
  },
};
