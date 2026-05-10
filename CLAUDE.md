# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

The marketing site for **Cognitive Factory** (cognitivefactory.ai) — an AI consultancy targeting regulated manufacturing (Nadcap, AS9100, AMS — aerospace, defense, medical, energy). Single-page editorial site, vanilla HTML/CSS/JS, no build step.

## Repository layout

Homepage source stays flat at the root: `index.html`, `styles.css`, `script.js`. The `notes/` directory holds Markdown post sources plus three HTML templates (`_template.html`, `_index-template.html`, `_row-template.html`). A single `build.ts` (Bun + TypeScript) parses frontmatter, renders Markdown, applies templates, and writes everything to `dist/` — that's the artifact `wrangler deploy` uploads to Cloudflare Workers. Tests live in `tests/build.test.ts` and run under `bun test`.

Fonts come from Google Fonts at runtime. The browser-side site itself is still vanilla HTML/CSS/JS — no bundler, no transpiler, no framework. TypeScript is build-time only.

## Local preview

- `bun install` — install deps (one-time per clone).
- `bun run build` — render Markdown posts, copy assets, write the deploy artifact to `dist/`.
- `bun dev` — alias for `bun run build && bun run server.ts dist`. One-shot: build then serve `dist/` at `http://localhost:3000/`. **Re-run after editing** any source file (homepage HTML/CSS/JS or a `notes/*.md` post). No hot reload.
- `bun run preview` — same server without rebuilding (use after `bun run build` to check the deploy artifact).
- `bun test` — run the build-pipeline test suite.

The local server (`server.ts`) is a tiny `Bun.serve` wrapper that resolves directory paths to `index.html` (so `/notes/` maps to `dist/notes/index.html`). Cloudflare Workers Static Assets does the same in production.

Deploy is via Cloudflare Workers Static Assets — `wrangler.jsonc` at the repo root constrains uploads to `dist/`. Dashboard settings and troubleshooting: see `cloudflare-deploy.md`.

## Tech stack

- **Source:** GitHub.
- **Hosting:** Cloudflare Workers Static Assets. `wrangler.jsonc` constrains uploads to `dist/`; the dashboard runs `bun run build` then `npx wrangler deploy` on push to `main`.
- **Toolchain:** Bun for dev server, build script (`build.ts`), and tests. Two runtime deps: `marked` (Markdown), `gray-matter` (YAML frontmatter). No framework, no bundler.
- **Browser code:** vanilla HTML, CSS, JavaScript. No transpiler.
- **TypeScript:** build-time only — `build.ts` and tests.

This stack is deliberately minimal. New build dependencies require an explicit reason; reach for vanilla first.

## Design system — treat as load-bearing

The visual identity is deliberate "editorial industrial" (engineering drawing meets editorial typography). When extending the page, reuse the existing tokens and motifs rather than inventing new ones.

**Type stack** (loaded in `index.html`):
- `--display`: Newsreader — used for hero headline, section titles, pull quotes, contact values. Variable `opsz` axis is set per-context (`60` hero, `36` section title, `24` pull quote).
- `--body`: IBM Plex Sans — body copy.
- `--mono`: IBM Plex Mono — all technical labels via the `.mono` class (uppercased, letter-spaced, muted).

**Color tokens** (CSS custom properties on `:root` in `styles.css`): `--bg` warm bone, `--ink` near-black with green undertone, `--rust` (#a04a1f) is the single accent — used for section numbers, italicized hero word, hover borders, selection. Don't add new accent colors.

**Spatial tokens**: `--margin`, `--gutter`, `--max` (1440px), all `clamp()`-based. Use them instead of hard-coded values.

**Recurring motifs**: corner labels styled like an engineering drawing (`.frame__corner`), the measurement-tick rule under the hero (`.hero__rule` + `.hero__ticks`), the section header pattern of `§ NN` + label in mono caps, the SVG paper-grain noise overlay applied via `body::before`. The hero antenna SVG is a deliberate easter egg (NASA ST-5 evolved antenna) — don't replace it casually.

## Animation conventions

Two patterns, both honoring `prefers-reduced-motion` via the rule at the bottom of `styles.css`:

1. **`.rise`** — initial-load stagger. Set the delay inline: `style="--d: 0.34s"`. Used for hero elements that appear immediately.
2. **`.reveal`** — scroll-triggered fade-up. Add the class to a section; `script.js` uses an `IntersectionObserver` (12% bottom rootMargin, 0.08 threshold) to add `.is-in` once. New sections that should animate in on scroll need this class.

`script.js` has no dependencies and is intentionally tiny — keep it that way unless there's a real reason to grow it.

## Section pattern

Each top-level section under `<main>` follows the same skeleton:

```html
<section class="block reveal" id="...">
  <header class="block__header">
    <span class="mono">§ NN</span>
    <span class="mono">SECTION LABEL</span>
  </header>
  <h2 class="block__title">...</h2>
  <div class="prose">...</div>
</section>
```

Adding a new section means continuing the `§ NN` numbering and matching this structure so the borders, spacing rhythm, and reveal behavior stay consistent.

## Notes (essays) section

Posts live in `notes/<slug>.md` with frontmatter (`title`, `slug`, `mad: M|A|D`, `date: YYYY-MM-DD`, `dek`). The build renders each to `dist/notes/<slug>/index.html` and the archive at `dist/notes/index.html`.

When adding a post:
1. Pick the MAD letter the post supports — a single letter, not multiple. If the idea spans two letters, it's two posts.
2. Match the keynote register (see "Tone of copy"). Re-read the existing post (`audit-trail-moat.md`) before drafting; it sets the cadence.
3. Use Markdown headings (`##`, `###`), blockquotes for pull quotes, and bullet lists sparingly. Don't introduce custom HTML in posts — extend the templates instead if a real new pattern emerges.
4. Run `bun run build && bun run preview` and read the post in the browser before committing. Long-form prose looks different at 62ch than it does in your editor.

## Responsive breakpoints

Three breakpoints in `styles.css`: 960px (collapse hero grid, stack prose columns), 720px (mobile frame, restructure service rows, stack contact rows), 460px (hide some rule labels). Test layout changes against all three.

## Tone of copy

**Reference:** Sequoia AI Ascent 2026 keynote — "This is AGI" by Pat Grady & Sonya Huang (https://sequoiacap.com/article/2026-this-is-agi/) plus the Karpathy fireside (https://karpathy.bearblog.dev/sequoia-ascent-2026/). Match that register. The current site copy is already in it — the Napoleon-aluminum opening, the "talkers vs. doers"-style contrast moves, the "next twenty-four months decide..." time-horizon close are all intentional. Do not drift toward generic SaaS or AI-vendor marketing copy.

Specific mechanics to keep using:

- **Short declarative punches alternating with longer explanatory passages.** Punch, then paragraph, then punch. "Most plants will fumble it." → setup → "We have." A whole section can pivot on one five-word sentence.
- **Functional definitions over jargon.** When defining what something is, do it in plain words and stop. The keynote does this with AGI ("the ability to figure things out. That's it."). The site does it with each service — one sentence of what, then a one-word category tag.
- **Concrete details anchor every abstract claim.** Specific specs (AMS 2750, AS9100, Nadcap), specific processes (heat treat, NDT, plating, weld), specific time spans (thirty years, eight hours, twenty-four months). Never wave at "the industry" when you can name the standard.
- **Contrast pairs as structural backbone.** "Talkers vs. doers." "Industrial revolution did for thrust; cognitive revolution does for thinking." "Run cognitive factories vs. buy them from someone else." Build paragraphs around an opposition, not a list of features.
- **The Don Valentine "so what?" test.** Every capability claim has to imply a business consequence. The site already does this — each service ends with a category (Compliance, Quality, NDT·Final, Engineering, Operations) that names where the value lands.
- **Identity-claim authority, no hedging.** "We have." "The same hands that wrote the audit response now write the prompt." Don't soften with "we believe" or "we think."
- **Self-aware nuance after confidence.** Confident assertion, then a grounding qualifier. Avoid hype-then-hype.
- **Time-horizon expansion at section closes.** Pull the reader from "right now on the floor" out to "the next twenty-four months" or "the trajectory." The Sequoia essay closes by scaling from 30 minutes today to centuries; sections here scale from a single audit response to who runs the industry.
- **Direct address to the reader.** "Tell us what's on the line." Questions and imperatives, sparingly, at decision points.
- **Credibility signals over adjectives.** Naming Nadcap, AMS 2750, DERs, heat-treat soaks — those words carry the weight that "world-class" and "cutting-edge" can't. If you find yourself reaching for an adjective, reach for a specific noun instead.

What to avoid: AI-vendor clichés ("transform your business," "unlock value," "leverage"), em-dash-laden hype, exclamation points outside ironic understatement, generic startup voice, anything that could appear unchanged on a competitor's site.

## Positioning frame — MAD

From the same keynote: Pat Grady's framework for founders building on top of the foundation models. Use it as the strategic skeleton when copy needs to articulate *why this company / why now*. The tonal mechanics above are how these claims get delivered; MAD is *what* gets claimed.

- **Moats** — built from the customer back, not from the model. For Cognitive Factory the moat is thirty years inside special processes (heat treat, NDT, welding, coatings, chem) — domain knowledge a frontier lab cannot replicate. When framing differentiation, anchor in customer-side depth, never in model choice.
- **Affordance** — Grady's image: a hammer has affordance, a two-year-old picks one up and knows what to do. The path from "this regulated manufacturer" to "this audit-ready output" should read as obvious in the copy. Each service block already does this — one sentence of what, one tag of where it lands.
- **Diffusion** — the gap between what frontier models can now do and what the Fortune 500 has actually deployed. That gap is the entire application-layer opportunity. Site copy invokes it explicitly ("the next twenty-four months decide who runs cognitive factories and who buys them from someone else") — when extending the argument, keep pointing at this gap rather than at the models.

If a new section or service description doesn't ladder up to at least one of M / A / D, it probably doesn't belong on the page.
