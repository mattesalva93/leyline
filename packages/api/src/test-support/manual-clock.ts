import type { Clock } from '../http/clock.ts';

interface ManualClock extends Clock {
  /** Moves time forward, firing every timer that elapses on the way. */
  advance(milliseconds: number): void;
}

export function manualClock(start = new Date('2026-11-18T12:00:00Z')): ManualClock {
  let now = start.getTime();
  const timers = new Set<{ elapsesAt: number; onElapsed: () => void }>();
  return {
    now: () => new Date(now),
    startTimer(milliseconds, onElapsed) {
      const timer = { elapsesAt: now + milliseconds, onElapsed };
      timers.add(timer);
      return () => timers.delete(timer);
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
