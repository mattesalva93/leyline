# 0027: Self-hosted analytics and EU error monitoring, reached through the site's own origin

**Status:** accepted (2026-11-25)

## Decision

- **Security comes first.** When monitoring conflicts with the security baseline of ADR 0016, the baseline wins: the data is given up, the defence is never loosened.
- **Product analytics run on Umami, self-hosted on the VPS**, in a container of its own with a memory limit, with its own database and role in the existing PostgreSQL, apart from the catalogue. Only the path that receives events is public; the dashboard is reached through an SSH tunnel.
- **The app records only the product path, never what the user wrote**: a resolved decklist (line counts, unrecognised lines, language) and a generated PDF (sheet format, pages, card count). No decklist text, no card names, no session replay. App code records events only through one `product-events` module, so a later move to another tool (PostHog is the owner's reference) changes its adapter and the privacy notice, nothing else.
- **Errors from the browser and the API go to Bugsink's managed service** (Bugsink B.V., data in the EU), through the Sentry SDKs. No IP address, headers or request bodies reach it.
- **The page's CSP does not change.** The SDKs ship inside the Vite bundle, and their events go to paths of the site's own origin, which Caddy forwards, stripping the forwarded client address and the cookies on the way to Bugsink.
- **Umami uses the client address only for a hash with a daily salt** and keeps aggregated statistics for at most 25 months.
- **Uptime is checked from outside the VPS**: UptimeRobot watches the site and `/api/health`; Healthchecks.io raises an alert when the daily import stops checking in. Alerts go to the project's mailbox, the address `SECURITY.md` gives.
- **Each tool is off while its configuration is empty**, and the pull request that turns one on rewrites the privacy notice to say what it collects, who receives it and for how long. No banner: the configuration above stays within the Garante's conditions for analytics treated as technical tools.

## Why

- Every option and its source is in `research/monitoraggio-analytics.md` (2026-11-25).
- ADR 0023 rejected GitHub Pages to keep a US company out of the privacy notice; PostHog and Sentry, though storing data in Frankfurt, are US companies, so only EU or self-hosted tools keep that line.
- Cost decides between the remaining ones: Umami reuses PostgreSQL and costs nothing, Bugsink's free plan covers the alpha's volume, and neither PostHog nor Sentry self-hosted fits the VPS's memory.
- PDF generation happens in the browser (ADR 0001), so only a browser event shows whether the product works.
- Most of the logic runs in the browser, so leaving out browser errors would leave the owner blind exactly where bugs happen.

## Consequences

- No text we read says whether browser error reporting falls within ePrivacy art. 5(3)'s "strictly necessary" exemption. It is collected minimised, on legitimate interest, and declared in the notice; the risk is accepted.
- The free plans checked on 2026-11-25 (UptimeRobot, Healthchecks.io, Bugsink's 15K events a month) can change; their pages did not quote email alerts as included, which the owner verifies at sign-up.
- Umami is one more service to update on the VPS, and its memory counts against the build's peak on the host.
