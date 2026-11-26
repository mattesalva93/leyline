# Dependency updates

Dependencies are updated on the work item's branch, before its PR is opened, never in a PR of their own against `main` (ADR 0018).

1. Run `pnpm deps:outdated`. It lists npm packages, mise tools, the workflows' actions and the stack's base images that have a newer release or whose tag was rebuilt under a new digest.
2. Take every minor and patch update in:
   - npm: `pnpm update --recursive`.
   - mise: `mise upgrade --bump`. pnpm sits in `mise.toml` and in `package.json`'s `packageManager`: move both, and the `Dockerfile`'s `npm install --global pnpm@`, to the same version.
   - actions: edit the tag in `uses:`, then run `gh actions-lock` to rewrite `.github/workflows/actions.lock`.
   - images: the `node` image follows `mise.toml`'s node; the `caddy` image follows Caddy's latest minor; the `umamisoftware/umami` image follows Umami's latest release. Each image's digest moves to its tag's current one too, even when the tag stays, and the `.trivyignore.yaml` entries the new digest fixes come out.
3. Take each major in too, one at a time (`pnpm update --recursive --latest <package>`), and fix whatever it breaks on this branch. A major is never left for later or moved to an issue.
4. Run `pnpm check`, then commit the updates apart from the work item's own commits: one `chore(deps):` commit per major, one for the rest.
