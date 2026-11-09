# mtg-suite

## Agent skills

### Issue tracker

Issues and specs live in GitHub Issues (mattesalva93/mtg-suite), via the `gh` CLI. See `docs/agents/issue-tracker.md`.

### Triage labels

Default vocabulary: needs-triage, needs-info, ready-for-agent, ready-for-human, wontfix. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: one `GLOSSARY.md` and `docs/adr/` at the repo root. See `docs/agents/domain.md`.

## Sheet preview

Changing the sheet layout or the PDF → run `pnpm sheet:preview` and look at `.preview/sheet-*.png`; show those images when asking the user a layout question.

## Sources of truth

Each fact has one home; other files point to it, never restate it.

- **How** (numbers, geometry, formats, algorithms) lives in code and tests. Make the code explain itself through names and through test titles that read as the rule (`it('never crops the artist line')`). A comment carries only a _why_ the code cannot say.
- **Why** and hard constraints live in `docs/adr/`. An ADR names the test that pins its numbers instead of copying them.
- **What a word means** lives in `GLOSSARY.md`: one or two sentences, no rules or measurements.
- `research/` is dated background: cite it, never update it to match the code.

An accepted ADR is immutable (ADR 0008): change a decision by writing a new ADR and setting the old one's status to `superseded by ADR NNNN`. When a fix would contradict an ADR or another written rule, stop before editing either: name the conflict and ask the user to choose between a fix that keeps the decision and a new ADR that replaces it.
