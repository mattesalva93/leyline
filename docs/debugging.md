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
- JavaScript Debugger Companion (`ms-vscode.js-debug-companion`), which lets "Debug web" open Chrome or Edge on Windows from WSL

`.vscode/settings.json` is git-ignored: keep your personal editor settings there.

`api` and the import read `DATABASE_URL` from the repo's `.env` (`cp .env.example .env`) and need PostgreSQL (`pnpm db:up`).

## VS Code configurations

Pick one in the Run and Debug view (Ctrl+Shift+D), then press F5.

### "Debug current test file"

Runs Vitest on the test file open in the editor, with `--inspect-brk --no-file-parallelism --test-timeout=0 --hook-timeout=0`:

- `--inspect-brk` turns on Vitest's debug mode. From a terminal it opens the inspector and pauses before the test file runs (see `pnpm test:debug` below).
- `--no-file-parallelism` runs one file at a time in a single process, so there is only one process to debug. Vitest refuses `--inspect-brk` without it.
- `--test-timeout=0` and `--hook-timeout=0` turn off Vitest's timeouts (5 s per test, 10 s per hook). They keep counting while execution is paused on a breakpoint, so without these flags the test fails while you inspect it.

VS Code attaches to the Vitest worker by itself (`autoAttachChildProcesses`) before any test code runs. Because the inspector is already open, Vitest skips its own initial pause: execution stops only on your breakpoints. Set them in the `.ts` source before pressing F5.

### "Debug current Node file"

Runs `node` on the `.ts` file open in the editor. Node 26 strips TypeScript types natively, so there is no build step and breakpoints sit on the source.

It uses the `node` on the PATH of the VS Code server in WSL. If it fails on TypeScript syntax, check that `node -v` in the VS Code terminal prints the version pinned in `mise.toml`.

This only works for syntax that can be erased: `tsconfig.base.json` sets `erasableSyntaxOnly: true`, so `pnpm typecheck` rejects `enum`, `namespace` and parameter properties, which `node file.ts` could not run.

### "Debug api"

Runs the `api` server from its `.ts` sources with `node --conditions=source --env-file-if-exists=.env --watch`, like `pnpm dev:debug` (see below), on `http://127.0.0.1:3000`:

- `--conditions=source` makes `@mtg-suite/core` resolve to `packages/core/src` (the `source` export in its `package.json`), so breakpoints in `core` hit the source too and no build is needed.
- `--watch` restarts the server when a file it imports changes. VS Code attaches to each new process by itself.

Stop the Docker Compose `api` service first if it is running; it does not publish port 3000, so the two do not clash, but two servers on one database are confusing.

### "Debug import"

Runs the catalog import (`packages/api/src/import.ts`), which downloads today's Scryfall `all_cards` bulk file and swaps it in. To debug against a file downloaded earlier, put `"--file", "/path/to/all-cards.jsonl.gz"` in the configuration's `"args"`. A full import takes a couple of minutes: set breakpoints with a hit count or a condition (right-click the breakpoint) rather than stopping on every card.

### "Debug web"

Opens Chrome on Windows on the Vite dev server (`http://127.0.0.1:5173`) and attaches VS Code to it, so breakpoints in `packages/web/src` and in `core` (served from its sources) hit in VS Code.

1. Start the dev servers in a terminal: `pnpm dev` (or `pnpm dev:debug` to debug `api` at the same time).
2. Pick "Debug web" and press F5.

From WSL, VS Code cannot start a Windows browser by itself: the JavaScript Debugger Companion extension does it, and must be installed on the Windows side (VS Code offers it the first time). For Edge, change `"type": "chrome"` to `"type": "msedge"` in `.vscode/launch.json`. The browser reaches `127.0.0.1:5173` thanks to mirrored networking (see below).

## `pnpm dev:debug` and `pnpm import:debug`

```sh
pnpm dev:debug        # api with the inspector on 127.0.0.1:9229, plus the Vite dev server
pnpm import:debug     # the import, waiting for a debugger on 127.0.0.1:9229 before it starts
```

- `pnpm dev:debug` runs `api` with `--inspect=127.0.0.1:9229`: the server starts right away and you attach whenever you like. `web` runs its usual dev server.
- `pnpm import:debug` uses `--inspect-wait=127.0.0.1:9229`: Node opens the inspector and waits for a debugger to attach before running any code, so breakpoints set in DevTools are in place from the first line. Unlike `--inspect-brk`, it does not pause once attached.

Attach from `chrome://inspect` as described below. Both use port 9229, like `pnpm test:debug`: run one at a time.

## `pnpm test:debug` and `chrome://inspect`

```sh
pnpm test:debug                                   # all test files, in watch mode
pnpm test:debug packages/core/src/foo.test.ts     # one file
```

The script runs `vitest --inspect-brk=127.0.0.1:9229 --no-file-parallelism --test-timeout=0 --hook-timeout=0`, so timeouts are off here too. Vitest prints `Debugger listening on ws://127.0.0.1:9229/...` and waits for a debugger.

To attach from Chrome or Edge on Windows:

1. Open `chrome://inspect` (`edge://inspect` in Edge).
2. Under "Remote Target" the process appears (the Vitest worker, `api` or the import). If it does not, click "Configure..." and make sure `localhost:9229` is listed.
3. Click "inspect". With `pnpm test:debug` DevTools opens paused: press F8 to resume until your breakpoints.

This works from Windows only with mirrored networking: `%UserProfile%\.wslconfig` must contain `networkingMode=mirrored` under `[wsl2]` (a per-machine setting, not part of the repo; run `wsl --shutdown` after changing it). With it, a port that WSL opens on `127.0.0.1` is reachable on Windows `127.0.0.1` too.

In watch mode the inspector reopens and waits again on every re-run.

## Why the inspector listens only on `127.0.0.1`

Anyone who can connect to an open inspector can run arbitrary code in that process, with your user's permissions: read files, read `.env`, open network connections. On `0.0.0.0` the port would be reachable from every network the machine is on.

Every `pnpm` debug script and VS Code configuration that passes an inspector address uses `127.0.0.1` explicitly; the other VS Code configurations let VS Code pick a local port. Never change it to `0.0.0.0`, and never expose `9229` through Docker or a firewall rule.
