# 0005: User first: same features for everyone, ads removable by voluntary support

**Status:** accepted (2026-11-07)

## Decision

mtg-suite is **user first**: every user gets the same tool, with the same features, limits and quality, whether or not they pay.

- **Never a paywall.** No feature, limit, quota, export option or data access is ever reserved for paying users. No payment, survey, download or email sign-up is ever required to use the tool. If accounts exist, everything stays usable anonymously or with a free account.
- **Minimal, non-blocking ads.** The only funding the app itself carries is a few small banners that never stand between the user and the task. No interstitials, no ad before generating or downloading a PDF, no "watch an ad to unlock", no anti-adblock wall. Using an adblocker is fine.
- **Voluntary support removes the banners, and nothing else.** Anyone who wants to support the project (for example via Patreon) can do so, and in return the banners go away. Optional cosmetic thanks (a badge, a theme) are allowed. Supporters get no extra features, no higher limits and no priority.
- In practice, those who can and want to pay cover the running costs for those who can't, and everyone gets the same tool.

## Why

- **It is the product's stance.** The tool exists for players, not to sell them access to their own hobby. Players with more money must not get a better tool than those with less.
- **It is what the policies allow.** Wizards' Fan Content Policy requires fan content to be free to access. It allows sponsors, advertising and donations (Patreon is the example it gives) as long as they don't interfere with community access. Scryfall forbids paywalling its data or requiring payment or sign-up to reach it. See `research/ai-deckbuilding.md` (section 4), `research/portale-news-eventi.md` and `research/competitor.md` (section 10).
- **It matches established fan tools.** Archidekt, EDHREC and Moxfield use the same model: ads, removed by Patreon support.
- **Alternatives rejected:**
  - Freemium or paid tiers: these break the user-first stance and the policies above.
  - No funding at all: hosting, and later the LLM tokens, cost money. Voluntary support keeps the tool sustainable without a paywall.

## Consequences

- **AI features are where this gets tested.** No supporter tier with more AI suggestions: that would be a disguised paywall. LLM costs have to be covered by a usage limit that is the same for everyone, optionally with a bring-your-own-API-key mode open to every user. This needs its own decision when the AI module is designed.
- **Ad networks come with constraints.** EU users mean GDPR consent for tracking ads, so non-tracking ads are preferred. Sponsors must be labelled as sponsors and must not be Wizards' competitors or harmful to Wizards.
- **There is an open tension with Wizards.** Wizards' Terms of Use §14.1 describe the Fan Content Policy as permitting only "noncommercial activities", while the policy itself allows ads and donations. That is acceptable at the scale of a few banners. Ask Wizards for clarification before the income becomes significant.
- **Reread the policies before ads go live.** This ADR relies on the research summaries, not on a fresh reading of the full policy texts.
- **Feature work has a review check:** any ticket or PR that gates behaviour on supporter status is rejected, unless that behaviour is banner removal or cosmetic.
