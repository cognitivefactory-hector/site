# Cloudflare Pages — deploy settings

## Project setup

- **Connected repo:** `github.com/<org>/site` (or wherever this repo lives)
- **Production branch:** `main`
- **Build command:** `bun run build`
- **Build output directory:** `dist`
- **Root directory:** `/`
- **Node compatibility:** off
- **Bun version:** set `BUN_VERSION` build environment variable to a recent stable version (e.g. `1.1.x`).

## Custom domain

- `cognitivefactory.ai` → Pages production deployment
- `www.cognitivefactory.ai` → 301 to apex (configured in Cloudflare DNS or Page Rules)

## Build environment variables

- `BUN_VERSION` — pinned Bun version
- (No secrets needed — site is fully static)

## Deploy flow

1. Push to `main` → Pages auto-builds `bun run build` → publishes `dist/`.
2. Preview deployments are created automatically for every other branch.
3. To roll back: redeploy a prior production build from the Pages dashboard.

## Local equivalence check

```
bun run build && bun run preview
```

Visit `http://localhost:3000` and confirm the deploy artifact looks identical to production. If it doesn't, the bug is in `build.ts`, not in Pages.
