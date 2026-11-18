import type { Clock } from '../http/clock.ts';

interface ManualClock extends Clock {
  /** Moves time forward, firing every timer that elapses on the way. */
  advance(milliseconds: number): void;
  /** Settles once a timer is running: a request served over a socket starts its own later. */
  timerRunning(): Promise<void>;
}

export function manualClock(start = new Date('2026-11-18T12:00:00Z')): ManualClock {
  let now = start.getTime();
  const timers = new Set<{ elapsesAt: number; onElapsed: () => void }>();
  const waitingForTimer: (() => void)[] = [];
  return {
    now: () => new Date(now),
    startTimer(milliseconds, onElapsed) {
      const timer = { elapsesAt: now + milliseconds, onElapsed };
      timers.add(timer);
      for (const settle of waitingForTimer.splice(0)) settle();
      return () => timers.delete(timer);
    },
    timerRunning() {
      if (timers.size > 0) return Promise.resolve();
      return new Promise((settle) => waitingForTimer.push(settle));
    },
    advance(milliseconds) {
      now += milliseconds;
      for (const timer of [...timers].sort((a, b) => a.elapsesAt - b.elapsesAt)) {
        if (timer.elapsesAt > now) continue;
        timers.delete(timer);
        timer.onElapsed();
      }
    },
  };
}
