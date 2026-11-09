# Commits

A ticket lands as several commits, one per topic. A topic is one behaviour or one change of mind: a `core` rule with its test, an `api` or import change, a UI change.

- Commit each topic as soon as its tests go green, before writing the next one. The final "commit your work" step of `/implement` then only picks up what is left.
- Stage the topic by path (`git add <paths>`, or `git add -p` to pick hunks).
- A `GLOSSARY.md` entry or an ADR travels in the commit that introduces its term or decision.
- Review fixes go in their own `fix:` or `refactor:` commit.
- No AI co-author trailers: a commit is authored by its committer. `.husky/commit-msg` rejects them.
- To regroup commits before the push, run `git reset --soft main` and commit again topic by topic.
