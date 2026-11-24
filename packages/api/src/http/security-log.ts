import type { Clock } from './clock.ts';

export interface RequestFacts {
  readonly method: string;
  readonly path: string;
  /** The client's network, never its full address (see `request-facts.ts`). */
  readonly clientNetwork: string | null;
}

export type SecurityEvent =
  | ({ readonly kind: 'body-too-large' } & RequestFacts)
  | ({ readonly kind: 'request-timeout' } & RequestFacts)
  | ({ readonly kind: 'rate-limited' } & RequestFacts)
  | ({ readonly kind: 'over-capacity' } & RequestFacts)
  | ({ readonly kind: 'server-error'; readonly error: string } & RequestFacts);

/** Where the API records what an operator should know about attacks and failures. */
export interface SecurityLog {
  record(event: SecurityEvent): void;
}

/** One JSON line per event on standard output, where Docker's log driver collects it. */
export function stdoutSecurityLog(clock: Clock): SecurityLog {
  return {
    record(event) {
      process.stdout.write(`${JSON.stringify({ time: clock.now().toISOString(), ...event })}\n`);
    },
  };
}
