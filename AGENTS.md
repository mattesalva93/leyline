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
