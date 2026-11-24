import type { Clock } from '../http/clock.ts';

interface ManualClock extends Clock {
  /** Moves time forward, firing every timer that elapses on the way. */
  advance(milliseconds: number): void;
  /**
   * Settles once `count` timers are running: a request served over a socket starts its own
   * later than the test sends it.
   */
  timersRunning(count?: number): Promise<void>;
}

export function manualClock(start = new Date('2026-11-18T12:00:00Z')): ManualClock {
  let now = start.getTime();
  const timers = new Set<{ elapsesAt: number; onElapsed: () => void }>();
  const waitingForTimers: { count: number; settle: () => void }[] = [];
  const settleTheWaitsMet = () => {
    for (const wait of [...waitingForTimers]) {
      if (timers.size < wait.count) continue;
      waitingForTimers.splice(waitingForTimers.indexOf(wait), 1);
      wait.settle();
    }
  };
  return {
    now: () => new Date(now),
    startTimer(milliseconds, onElapsed) {
      const timer = { elapsesAt: now + milliseconds, onElapsed };
      timers.add(timer);
      settleTheWaitsMet();
      return () => timers.delete(timer);
    },
    timersRunning(count = 1) {
      return new Promise((settle) => {
        waitingForTimers.push({ count, settle });
        settleTheWaitsMet();
      });
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
