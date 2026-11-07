# Debugging

Stop on a breakpoint, inspect variables and the call stack. Two ways in, same Node inspector underneath:

- **VS Code** configurations in `.vscode/launch.json`, for one-click debugging.
- **`pnpm` scripts** that open the inspector, for any client (VS Code, `chrome://inspect`).

Debugging processes inside Docker Compose, staging or production is out of scope for now.

## Setup

VS Code runs on Windows and opens the repo through the WSL extension. When you open the repo, accept the recommended extensions (`.vscode/extensions.json`):

- ESLint (`dbaeumer.vscode-eslint`)
- Prettier (`esbenp.prettier-vscode`)
- Vitest (`vitest.explorer`), which adds a "Debug" button next to each test

`.vscode/settings.json` is git-ignored: keep your personal editor settings there.

## VS Code configurations

Pick one in the Run and Debug view (Ctrl+Shift+D), then press F5.

### "Debug test file corrente"

Runs Vitest on the test file open in the editor, with `--inspect-brk --no-file-parallelism`:

- `--inspect-brk` opens the inspector and pauses before the test file runs, so no breakpoint is missed.
- `--no-file-parallelism` runs one file at a time in a single process, so there is only one process to debug.

VS Code attaches to the Vitest worker by itself (`autoAttachChildProcesses`). Set breakpoints in the `.ts` source.

### "Node file corrente"

Runs `node` on the `.ts` file open in the editor. Node 26 strips TypeScript types natively, so there is no build step and breakpoints sit on the source.

This only works for syntax that can be erased: `tsconfig.base.json` sets `erasableSyntaxOnly: true`, so `pnpm typecheck` rejects `enum`, `namespace` and parameter properties, which `node file.ts` could not run.

## `pnpm test:debug` and `chrome://inspect`

```sh
pnpm test:debug                                   # all test files, in watch mode
pnpm test:debug packages/core/src/foo.test.ts     # one file
```

The script runs `vitest --inspect-brk=127.0.0.1:9229 --no-file-parallelism`. Vitest prints `Debugger listening on ws://127.0.0.1:9229/...` and waits for a debugger.

To attach from Chrome or Edge on Windows:

1. Open `chrome://inspect` (`edge://inspect` in Edge).
2. Under "Remote Target" the Vitest worker appears. If it does not, click "Configure..." and make sure `localhost:9229` is listed.
3. Click "inspect". DevTools opens paused; press F8 to resume until your breakpoints.

This works from Windows because `.wslconfig` sets `networkingMode=mirrored`: a port that WSL opens on `127.0.0.1` is reachable on Windows `127.0.0.1` too.

In watch mode the inspector reopens and waits again on every re-run.

## Why the inspector listens only on `127.0.0.1`

Anyone who can connect to an open inspector can run arbitrary code in that process, with your user's permissions: read files, read `.env`, open network connections. On `0.0.0.0` the port would be reachable from every network the machine is on.

Every debug script in this repo binds the inspector to `127.0.0.1` explicitly. Never change it to `0.0.0.0`, and never expose `9229` through Docker or a firewall rule.
