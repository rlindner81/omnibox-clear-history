# CLAUDE.md

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

- **`clear-history.js`** — service worker (background script). Registers `onVisited` to delete URLs matching active domains in real time, and runs a retroactive sweep of the last 14 days on install/startup. Uses a `keepAlive` alarm (every 30s) to prevent Chrome from suspending the worker. Loads domain config from `chrome.storage.sync` and listens for changes.
- **`options.js`** + **`options.html`** + **`options.css`** — options UI (inline popup, not a tab). Reads/writes the `domains` key in `chrome.storage.sync`. Domains are stored as a lowercase array of hostnames (no `www.` prefix); the service worker strips `www.` when matching.
- **`manifest.json`** — MV3 manifest. Declares `history`, `storage`, and `alarms` permissions.

Key behaviors encoded in the service worker:
- Root URLs (`pathname === "/"` with no query string) are intentionally preserved.
- `www.` is stripped before domain comparison so `www.google.com` matches `google.com`.
- Invalid URLs are silently ignored.
