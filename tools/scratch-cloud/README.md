# Scratch tooling from the cloud session (2026-11-05 to 2026-11-12)

Saved from the cloud container when that session was retired, because it existed nowhere else. Nothing here is part of
the game or the probe suite; it is the harness the cloud session used to run probes. Not for main as is.

## Shell scripts

Each sources an `env.sh` at a container path. Before use, replace that line with:

    export SP=<a scratch folder>   REPO=<this checkout>   AXE=$REPO/tools/probe/node_modules/axe-core/axe.min.js

and serve a built site first: `python3 tools/build_site.py <dir>`, then `python3 -m http.server <port> --bind 127.0.0.1`
from inside `<dir>`.

| Script | What it does |
|---|---|
| `batch.sh <port> <site> <prefix> probe…` | runs the named probes one at a time against the served build, one log each, and a `<prefix>_done.log` of `name exit N secs` lines, then `BATCHDONE`. Refuses to start (`WRONG BUILD`) if the server is serving a different build than `<site>` (a stale server on a reused port once caused 8 false failures). |
| `verify.sh <port> <site> <prefix>` | the full chain: the gate, every probe in `tools/probe/all.mjs` order, then `alive.mjs` with MAX=1, `soak`, `shots`, `monkey`. About 2.5 hours. `PIN=<worktree>` runs the probes from a checkout pinned to the build's commit (do that for long runs, so newer probes do not meet an older build; a pinned worktree needs `tools/probe/node_modules` symlinked in). |
| `resume_chain.sh <port> <site> <prefix> <last-probe>` | the rest of a full chain after the last probe that finished. |
| `extras.sh <port> <site> <prefix>` | only the chain's last four steps, skipping those already logged. |

Run long ones detached (`setsid nohup …`): the cloud session's background commands were stopped at two hours.

## probes/

Throwaway debugging scripts (`_*.mjs`), kept only because they existed nowhere else: screenshots of the main screens
(`_tour`, `_tour2`, `_roomshot`, `_shot152`, `_shot153`), the app icon at launcher sizes (`_icons`), the boot sequence
(`_boot5`), keyboard play (`_kbdbg`), tablet layout (`_tab`) and a one-off check (`_vet`). They import `./harness.mjs`,
so they only run from `tools/probe/`; never commit them there (the repo's rule).
