# Notes blog + first post — design spec

**Date:** 2026-05-09
**Owner:** Hector Garza
**Status:** draft, pending review

## Goals

1. Add an essays/notes section to cognitivefactory.ai, organized around Pat Grady's MAD framework (Moats, Affordance, Diffusion).
2. Establish a minimal Bun-based build pipeline so the existing flat-file homepage stays unchanged while Markdown-authored posts get rendered to static HTML.
3. Ship the first post: a Moats entry articulating one customer-back moat for Cognitive Factory and how the business actually builds it.

## Non-goals

- No CMS, no authentication, no comments, no RSS feed (defer until post volume justifies).
- No tag system beyond the M / A / D letter (YAGNI; the three-letter taxonomy is the entire conceit).
- No design refresh of the homepage.

## Tech stack

- **Source control:** GitHub.
- **Hosting:** Cloudflare Pages, deploying from `dist/` on every push to `main`.
- **Toolchain:** Bun for dev server (`bun --hot`) and build script (`build.ts`). Two small dependencies: a Markdown renderer (`marked`) and a YAML frontmatter parser (`gray-matter`). No framework.
- **Markup:** vanilla HTML, CSS, JavaScript. No bundler, no transpiler, no JS framework.

## Architecture

### File layout

```
/                              # repo root
  index.html                   # homepage source (unchanged)
  styles.css                   # shared styles (extended for /notes/)
  script.js                    # homepage JS (unchanged)
  notes/
    _template.html             # post page template
    _index-template.html       # archive page template
    audit-trail-moat.md        # post sources, one .md per post
    ...
  build.ts                     # Bun build script
  package.json
  bunfig.toml
  .gitignore                   # ignores dist/
  dist/                        # build output, gitignored
    index.html
    styles.css
    script.js
    notes/
      index.html               # /notes/ archive
      audit-trail-moat/index.html
```

### Build pipeline (`build.ts`)

Single ~100-line script. Responsibilities, in order:

1. Walk `notes/*.md`. For each file: parse YAML frontmatter, render Markdown body to HTML, inject into `notes/_template.html`, write to `dist/notes/<slug>/index.html`.
2. Sort post metadata reverse-chronological. Render the archive list into `notes/_index-template.html`, write to `dist/notes/index.html`.
3. Copy `index.html`, `styles.css`, `script.js` to `dist/` unchanged.

Build is idempotent and deterministic. No incremental builds (rebuild everything every time — at this scale it costs <1 second).

### Frontmatter schema

```yaml
title: "The audit-trail moat"
slug: audit-trail-moat
mad: M                       # M / A / D — single letter
date: 2026-05-09
dek: "One-sentence subhead, mono-styled under the title."
```

Build script validates required fields and refuses to render a post with missing or invalid frontmatter.

### Scripts (`package.json`)

- `bun dev` — `bun --hot` static server at repo root for editing the homepage and previewing source markdown locations.
- `bun run build` — runs `build.ts`, produces `dist/`.
- `bun run preview` — `bun --hot` static server at `dist/` to verify the deploy artifact.

### Cloudflare Pages config

- Build command: `bun run build`
- Build output directory: `dist`
- Root directory: `/`
- Environment: Bun (set via `BUN_VERSION` env var or Pages' Bun support).

## Page designs

### Post page (`/notes/<slug>/`)

Reuses existing chrome — frame corners, footer, type stack, color tokens, paper grain — defined in `styles.css`.

**Frame corners**, `notes/_template.html`:
- Top-left: `§ 2026` / `COGNITIVE FACTORY` (unchanged from homepage).
- Top-right repurposed: `M · MOATS` (or A / D) on top line in rust, post date on second line. Maintains engineering-drawing affordance with post-specific metadata.

**Article scaffold:**

```html
<main class="post">
  <header class="post__header reveal">
    <span class="mono post__kicker">§ M · MOATS</span>
    <h1 class="post__title">{{ title }}</h1>
    <p class="mono post__dek">{{ dek }}</p>
    <div class="post__rule"></div>          <!-- ticked rule, mirrors hero__rule -->
  </header>
  <article class="post__body prose-long">
    {{ rendered markdown body }}
  </article>
  <footer class="post__nav">
    <a class="mono" href="/notes/">← all notes</a>
    <span class="mono">cognitivefactory.ai</span>
  </footer>
</main>
```

**`prose-long`** is a new style added to `styles.css`:
- Single column, `max-width: 62ch`, centered under the title.
- Newsreader for `h2`/`h3` (smaller variants of `block__title`, `opsz` 28 / 22).
- IBM Plex Sans for body, line-height 1.7 for long-form readability (homepage uses 1.6).
- IBM Plex Mono for inline `<code>` and code blocks.
- Lists: hanging numerals/markers, mono-styled where ordinal.
- Blockquotes: reuse `.pull` (Newsreader italic, rust left-rule).
- Horizontal rules: use the existing measurement-tick aesthetic.

**Reveal:** `.post__header` gets `.reveal` so the existing IntersectionObserver fades it in. Body stays static — no animation while reading.

### Archive page (`/notes/`)

Header section in homepage `.block` pattern:
- `§ NOTES · IDEAS FOR REGULATED MANUFACTURING`
- Title: `Field notes from the floor.`
- One paragraph of standfirst (positioning what the notes are).

Below it, a chronological list reusing the `.contact` row pattern (label column / value column):

```
NOTE 001       The audit-trail moat                        M · MOATS
2026-05-09     One-sentence dek lifted from frontmatter.   →
─────────────────────────────────────────────────────────────────────
```

Reverse chronological. MAD letter on the right acts as the sortable tag. No per-letter filters yet — chronological feed plus the visible tag does the categorization without forcing a navigation choice. Add filters at >20 posts.

### Homepage integration

Add a single `/notes/` link to the homepage footer — `NOTES · cognitivefactory.ai/notes` as a third `<span class="mono">` in the existing `.footer`. Footer is the right placement: it preserves the existing homepage scroll rhythm (each section already pulls its own weight; injecting a notes block between Contact and Footer would dilute the close), and a footer link is the conventional affordance for an archive. The notes section announces itself; it does not compete with the homepage hierarchy.

## First post — content thesis

**Title:** *The audit-trail moat.*
**Dek:** *Why every audit Cognitive Factory survives makes the next one cheaper to win.*
**MAD:** M.
**Slug:** `audit-trail-moat`.

### The thesis (the angle the post takes)

The standard customer-back moat advice — own the workflow, own the data, own the integration — assumes the customer's data has the same shape as everyone else's. In regulated manufacturing it doesn't. The data that matters is *audit-grade*: redlines that survived a Nadcap subscriber, evidence packages a DER signed off on, MRBs that closed without a CAR, NDT calls a Level III put their stamp on. That data is born under stakes. It cannot be scraped, synthesized, or licensed. It can only be earned, one engagement at a time, by people the audit community already trusts.

Cognitive Factory's moat is that every engagement produces this data as a byproduct. Factory Audit ships redlined paragraphs against a real spec. Factory Yield ships traced root causes against real scrap. Factory Vision ships defect calls against a real Level III. Factory Twin ships predicted process windows against real soak data. Factory Agents ship dispatch decisions against a real shop. Each one of those outputs is verified — by an auditor, an inspector, a DER, a customer's quality lead — and each verification is a ground-truth label that no frontier lab can manufacture.

The moat is therefore not the model. The moat is the corpus of verified evidence the model gets graded against. As frontier capabilities improve, that corpus appreciates: every new model passes through it on the way to a customer's floor, and every new customer expands it.

### Why this is structurally a customer-back moat

The corpus is created by the customer's audit cycle, not by Cognitive Factory's engineering cycle. We do not generate this data; the regulated environment does, and we are the ones present when it lands. A frontier lab cannot run a Nadcap audit. A SaaS competitor cannot get a DER on a Zoom call. A consulting firm without working software cannot capture the verification at the moment it happens. The pre-conditions for the moat — domain trust, working software, presence in the audit room — are the exact pre-conditions Cognitive Factory was built around.

Three properties make it a moat rather than a head start:

- **Compounding.** Each customer engagement adds verified examples; the corpus is monotonic. A competitor entering year three has to recreate three years of audited outputs from scratch.
- **Frontier-aligned.** Karpathy's verifiability thesis from the same keynote — *LLMs automate what you can verify* — means the most valuable thing on the floor is a verifier. Our corpus is exactly that. Every model jump makes the corpus more valuable, not less.
- **Asymmetric to capital.** A competitor with ten times our budget cannot buy ten times the audits. Audit cadence is set by certification cycles, not by burn rate.

### How Cognitive Factory implements it — the business move

The post walks through implementation in four phases. Each phase is concrete, scoped to a quarter, and ships customer value first.

**Phase 1 — Capture (months 0–6).**
Every service deliverable ships with a structured artifact. Audit redlines are captured as `(spec_paragraph, draft_text, redlined_text, reviewer_id, decision)` tuples. Yield analyses ship as `(scrap_event, candidate_causes, validated_cause, evidence)` tuples. Vision deployments ship as `(image, model_call, level3_call, agreement)` tuples. Twin runs ship as `(input_window, predicted_envelope, observed_outcome)`. Agents ship as `(state, action, supervisor_decision)`. Schema is defined once, written into the deliverable contract, and stored in a per-customer Postgres instance the customer owns. Cognitive Factory keeps a sanitized read-replica.

**Phase 2 — Index (months 6–12).**
Build the corpus layer on top of the per-customer captures. Each artifact is tagged by process family (heat treat, NDT, weld, plating, chem), spec lineage (AMS 2750G vs F vs E), part class, customer industry, and verifier identity. The indexed corpus is the asset.

**Phase 3 — Verify (months 12–18).**
Stand up an internal evaluation harness. Every model release Cognitive Factory considers — frontier, open-weights, fine-tuned — runs against the corpus before it touches a customer floor. Disagreements between model and verifier are surfaced, triaged, and either fixed in deployment or fed back as RL signal where the customer permits. The harness becomes the gate every CF deployment passes through.

**Phase 4 — Compound (months 18+).**
Use the corpus to win the next deal. New customers get a head-start: their first Audit deployment is calibrated against twelve other Nadcap subscribers' redlines; their first Vision deployment is checked against thousands of audited Level III calls; their first Yield analysis is benchmarked against verified scrap traces from comparable processes. The customer pitch shifts from *"we know this domain"* to *"we know what passing looks like in your domain, and we can show you."*

### Closing move

The post closes by widening the time horizon, in keynote style:
- 6 months: the corpus is real, schema is locked, two customers in.
- 18 months: the verifier harness is gating every deployment, no model touches a floor without passing.
- 36 months: the corpus is the most authoritative private record of regulated-manufacturing decisions in existence.
- The window: a frontier lab will not build this in the next twenty-four months; a competitor without the floor will not build it ever.

### Tone & length

Target ~1,000–1,400 words. Register matches `CLAUDE.md` "Tone of copy" — Sequoia AI Ascent 2026 keynote mechanics. Short declarative punches alternating with longer explanatory passages, contrast pairs (model-side vs. customer-side; frontier capability vs. floor verification), specific nouns (AMS 2750, Level III, MRB, CAR, DER, Nadcap subscriber), no hedging, no AI-vendor clichés.

## Risks & open questions

- **Customer-data sensitivity.** Sanitized read-replicas need explicit contract language. The deliverable contract template is a separate work item; not blocking the blog.
- **Bun on Cloudflare Pages.** Pages added Bun support recently; verify the build container picks up `bunfig.toml` and the lockfile correctly. Fallback: pre-build locally and commit `dist/` (acceptable but not desired).
- **Markdown extension surface.** `marked` covers everything in the first post. If later posts need diagrams or charts, evaluate `mermaid` or static SVG; out of scope here.

## Out of scope (explicit)

- RSS, sitemap, OG image generation per post — defer.
- Comments, reactions, view counts — never.
- Post search — defer until ≥20 posts.
- Author bios beyond the existing `Who's building this` section on the homepage — defer.

## Acceptance criteria

- `bun run build` produces a `dist/` that, when served, renders:
  - Homepage unchanged byte-for-byte except for the addition of one footer or contact-row link to `/notes/`.
  - `/notes/` archive page listing the first post.
  - `/notes/audit-trail-moat/` post page rendering the first post.
- All three pages share frame, footer, type, and color tokens with no visual regression.
- Lighthouse performance score on the homepage stays ≥95 (current baseline).
- The first post reads in the keynote register (verified by the user).
