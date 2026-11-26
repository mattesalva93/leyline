interface ImportMetaEnv {
  /**
   * The id of the site in Umami, built into the bundle from the host's `.env` (ADR 0027). Empty
   * or missing, the browser records no product event.
   */
  readonly VITE_UMAMI_WEBSITE_ID?: string;
}
