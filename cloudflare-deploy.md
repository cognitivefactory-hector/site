# Cloudflare deploy — Workers Static Assets

This site deploys via Cloudflare Workers Static Assets (the modern replacement for Cloudflare Pages). The repo ships a `wrangler.jsonc` so `wrangler deploy` knows to upload only `dist/`, not the whole repo (otherwise `node_modules/workerd` blows the 25 MiB asset cap).

## Repository config

- **`wrangler.jsonc`** — committed at the repo root. Sets `assets.directory: "./dist"` so only the build artifact gets uploaded. Without this, wrangler defaults to uploading everything in the working directory.
- **`.wrangler/`** — local wrangler cache, gitignored.

## Cloudflare dashboard settings

These live in the Cloudflare dashboard, not in the repo. Configure them once per project:

| Setting | Value |
| --- | --- |
| Build command | `bun run build` |
| Deploy command | `npx wrangler deploy` |
| Root directory | `/` |
| Production branch | `main` |
| Bun version | latest stable (set via `BUN_VERSION` env var if pinning is needed) |

The order matters: the build command runs first, produces `dist/`, then the deploy command uploads `dist/` (because of `wrangler.jsonc`).

If the dashboard only allows a single command, use: `bun run build && npx wrangler deploy`.

## Custom domain

- `cognitivefactory.ai` → Workers production deployment.
- `www.cognitivefactory.ai` → 301 to apex (Cloudflare DNS or Page Rules).

## Build environment variables

- (No secrets needed — site is fully static.)
- `BUN_VERSION` — only set if pinning Bun to a specific version is required.

## Local equivalence check

```
bun install && bun run build && bun run preview
```

Then visit `http://localhost:3000/`, `/notes/`, and `/notes/audit-trail-moat/`. If those three pages render correctly locally, the production deploy will too.

## Troubleshooting

**"Asset too large" referencing `node_modules/workerd/...`**
The `wrangler.jsonc` is missing or `assets.directory` isn't `./dist`. Check the file at the repo root.

**`dist/` not found at deploy time**
The build command isn't running. Verify the dashboard's build command is `bun run build` (or that the deploy command chains it explicitly).

**Wrangler asks an interactive question and fails**
The build container is non-interactive — wrangler falls back to defaults and may auto-create a `wrangler.jsonc` in the wrong location. Make sure the committed `wrangler.jsonc` is being picked up; if wrangler is re-creating one with `assets.directory: "."`, the file isn't at the repo root or has the wrong name.
