interface ImportMetaEnv {
  /**
   * The Bugsink project's DSN, built into the bundle from the host's `.env` (ADR 0027). Empty or
   * missing, the browser reports no error.
   */
  readonly VITE_BUGSINK_DSN?: string;
}
