# AGENTS.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A Chrome extension (Manifest V3) that removes visited URLs from browser history for configured domains, keeping the omnibox clean. It defaults to `google.com` but supports any domains via an options page.

## Commands

```sh
npm run lint          # check formatting with prettier
npm run lint:fix      # auto-fix formatting
./gen-icons.sh        # regenerate PNG icons from assets/omnibox.svg (requires ImageMagick)
./gen-zip.sh          # package dist/ into dist.zip for Chrome Web Store upload
```

No build step — source files live directly in `dist/` and are edited there.

## Architecture

All extension source is in `dist/`:

- **`clear-history.js`** — service worker (background script). Deletes history entries for active domains via `onVisited` in real time, plus retroactive sweeps (see below). Loads domain config from `chrome.storage.sync` and listens for changes.
- **`options.js`** + **`options.html`** + **`options.css`** — options UI (inline popup, not a tab). Reads/writes the `domains` key in `chrome.storage.sync` as a lowercase array of hostnames or `*.` wildcard patterns. Entries without a `.` or containing spaces are dropped on save; no further normalization happens there.
- **`manifest.json`** — MV3 manifest. Declares `history` and `storage` permissions.

Key behaviors encoded in the service worker:

- Sweeps go through `clearCurrentHistory(days)`, which is queued so sweeps never run concurrently:
  - quick sweep (`QUICK_SWEEP_DAYS`, 1 day) on every worker wake-up, since MV3 has no general wake-up hook;
  - full sweep (`FULL_SWEEP_DAYS`, 365 days) on `runtime.onInstalled`, `runtime.onStartup`, and domain changes.
- Callers pass the day constant directly to `clearCurrentHistory`; don't add thin `fullSweep()`/`quickSweep()` wrappers.
- Root URLs (`pathname === "/"` with no query string) are intentionally preserved.
- `www.` is stripped from both hostnames and patterns before matching, so `www.google.com` matches `google.com`.
- `*.example.com` matches `example.com` and all its subdomains; plain entries match the exact hostname only.
- Removing the `domains` key counts as a change: the worker falls back to `DEFAULT_DOMAINS` and runs a full sweep.
- Invalid URLs are silently ignored.
