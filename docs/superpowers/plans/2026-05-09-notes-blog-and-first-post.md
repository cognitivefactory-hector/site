# Notes Blog + First Post Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a `/notes/` essays section to cognitivefactory.ai, organized around the MAD framework, with a Bun-based Markdown→HTML build, and ship the first post — an audited-evidence corpus moat for Cognitive Factory.

**Architecture:** Repo stays flat at the root (homepage source unchanged). New `notes/` directory holds Markdown post sources and HTML templates. A single `build.ts` (Bun + TypeScript) parses frontmatter, renders Markdown, injects into templates, and writes to `dist/`. Cloudflare Pages deploys `dist/`. Existing CSS is extended with `.post`, `.prose-long`, and `.post__nav` classes that reuse the editorial-industrial design tokens.

**Tech Stack:** Bun (runtime + dev server + test runner + build), TypeScript (build script only — no transpiler for browser code), `marked` (Markdown), `gray-matter` (YAML frontmatter), vanilla HTML/CSS/JS for the site itself, GitHub for source, Cloudflare Pages for hosting.

**Spec:** `docs/superpowers/specs/2026-05-09-notes-blog-and-first-post-design.md`

---

## File structure

**Created in this plan:**

| File | Responsibility |
| --- | --- |
| `package.json` | Bun project manifest with scripts and deps |
| `bunfig.toml` | Bun runtime config |
| `.gitignore` | Ignore `dist/`, `node_modules/`, `.DS_Store` |
| `tsconfig.json` | TypeScript config for the build script (build-time only) |
| `build.ts` | All build logic: walk, parse, render, write. Functions exported for tests. |
| `tests/build.test.ts` | Bun-test unit tests for each build function |
| `tests/fixtures/sample-post.md` | Fixture used by tests |
| `notes/_template.html` | Per-post page template with `{{...}}` placeholders |
| `notes/_index-template.html` | Archive page template |
| `notes/_row-template.html` | Single-row template used inside the archive |
| `notes/audit-trail-moat.md` | First post (Markdown + frontmatter) |
| `cloudflare-pages.md` | Short doc with the Pages deploy settings |

**Modified in this plan:**

| File | Change |
| --- | --- |
| `index.html` | Add one `/notes/` link inside `.footer` |
| `styles.css` | Append a Notes block: `.post`, `.post__header`, `.post__kicker`, `.post__title`, `.post__dek`, `.post__rule`, `.post__body`, `.prose-long`, `.post__nav`, `.notes-archive`, `.note-row`. No edits to existing rules. |
| `CLAUDE.md` | Update **Repository layout** and **Local preview** sections to reflect Bun build; add **Tech stack** subsection |

**Why one `build.ts` instead of multiple files:** Build code totals ~150 lines. One file with exported functions is easier to read end-to-end and still fully testable — every function gets imported individually in `tests/build.test.ts`.

---

## Task 1: Project scaffold (Bun + deps + ignores)

**Files:**
- Create: `package.json`
- Create: `bunfig.toml`
- Create: `.gitignore`
- Create: `tsconfig.json`

- [ ] **Step 1: Create `package.json`**

```json
{
  "name": "cognitivefactory-site",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "bun --hot serve",
    "build": "bun run build.ts",
    "preview": "bun --hot --cwd dist serve",
    "test": "bun test"
  },
  "devDependencies": {
    "@types/bun": "latest",
    "typescript": "^5.4.0"
  },
  "dependencies": {
    "marked": "^12.0.0",
    "gray-matter": "^4.0.3"
  }
}
```

- [ ] **Step 2: Create `bunfig.toml`**

```toml
[install]
exact = true

[test]
preload = []
```

- [ ] **Step 3: Create `.gitignore`**

```
node_modules/
dist/
.DS_Store
bun.lockb
```

(Note: `bun.lockb` is intentionally ignored at this scale — site is private, no CI matrix; commit later if reproducibility ever matters.)

- [ ] **Step 4: Create `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ESNext",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "noEmit": true,
    "types": ["bun-types"]
  },
  "include": ["build.ts", "tests/**/*.ts"]
}
```

- [ ] **Step 5: Install dependencies**

Run: `bun install`
Expected: creates `node_modules/`, prints "Installed X packages".

- [ ] **Step 6: Verify Bun works**

Run: `bun --version && bun run --help | head -5`
Expected: prints Bun version and a help excerpt without error.

- [ ] **Step 7: Commit**

```bash
git add package.json bunfig.toml .gitignore tsconfig.json
git commit -m "chore: scaffold Bun project for site build

What: Adds package.json with bun scripts (dev/build/preview/test),
bunfig.toml, tsconfig.json for the build script, and .gitignore
for dist/ and node_modules/.

Why: Establishes the toolchain the Notes blog build will run on.
The homepage stays static; only the build script and tests will be
TypeScript.

Who: Hector; future Claude Code sessions running bun dev/bun run build.

Where: New files at /package.json, /bunfig.toml, /tsconfig.json,
/.gitignore.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 2: Frontmatter parsing & validation (TDD)

**Files:**
- Create: `build.ts`
- Create: `tests/build.test.ts`
- Create: `tests/fixtures/sample-post.md`

- [ ] **Step 1: Create the test fixture**

`tests/fixtures/sample-post.md`:

```markdown
---
title: "Sample post"
slug: sample-post
mad: M
date: 2026-05-09
dek: "A short subhead used in tests."
---

# Heading

Body paragraph with **bold** and `code`.
```

- [ ] **Step 2: Write the failing test**

`tests/build.test.ts`:

```typescript
import { describe, expect, test } from "bun:test";
import { parsePost } from "../build.ts";

describe("parsePost", () => {
  test("parses valid frontmatter and body", async () => {
    const post = await parsePost("tests/fixtures/sample-post.md");
    expect(post.title).toBe("Sample post");
    expect(post.slug).toBe("sample-post");
    expect(post.mad).toBe("M");
    expect(post.date).toBe("2026-05-09");
    expect(post.dek).toBe("A short subhead used in tests.");
    expect(post.body).toContain("# Heading");
    expect(post.body).toContain("**bold**");
  });

  test("throws on missing required field", async () => {
    const path = "tests/fixtures/missing-title.md";
    await Bun.write(
      path,
      `---\nslug: x\nmad: M\ndate: 2026-05-09\ndek: y\n---\nbody`,
    );
    expect(parsePost(path)).rejects.toThrow(/title/);
  });

  test("throws on invalid mad letter", async () => {
    const path = "tests/fixtures/bad-mad.md";
    await Bun.write(
      path,
      `---\ntitle: t\nslug: s\nmad: Z\ndate: 2026-05-09\ndek: d\n---\nbody`,
    );
    expect(parsePost(path)).rejects.toThrow(/mad/);
  });
});
```

- [ ] **Step 3: Run test, verify it fails**

Run: `bun test tests/build.test.ts`
Expected: FAIL with "Cannot find module './build.ts'" or similar.

- [ ] **Step 4: Write the minimal implementation**

`build.ts`:

```typescript
import matter from "gray-matter";
import { readFile } from "node:fs/promises";

export type Mad = "M" | "A" | "D";

export type Post = {
  slug: string;
  title: string;
  dek: string;
  mad: Mad;
  date: string;
  body: string;
};

const REQUIRED = ["title", "slug", "mad", "date", "dek"] as const;

export async function parsePost(path: string): Promise<Post> {
  const raw = await readFile(path, "utf8");
  const { data, content } = matter(raw);

  for (const key of REQUIRED) {
    if (!data[key]) {
      throw new Error(`${path}: missing required frontmatter field '${key}'`);
    }
  }

  if (!["M", "A", "D"].includes(data.mad)) {
    throw new Error(
      `${path}: frontmatter 'mad' must be 'M', 'A', or 'D' (got '${data.mad}')`,
    );
  }

  return {
    slug: String(data.slug),
    title: String(data.title),
    dek: String(data.dek),
    mad: data.mad as Mad,
    date: String(data.date),
    body: content.trim(),
  };
}
```

- [ ] **Step 5: Run test, verify it passes**

Run: `bun test tests/build.test.ts`
Expected: 3 passing tests.

- [ ] **Step 6: Commit**

```bash
git add build.ts tests/build.test.ts tests/fixtures/sample-post.md
git commit -m "feat: add frontmatter parsing and validation for Notes posts

What: Adds parsePost() in build.ts that reads a Markdown file,
parses YAML frontmatter via gray-matter, validates required fields
(title, slug, mad, date, dek), enforces mad letter is M/A/D, and
returns a typed Post object. Three Bun tests cover happy path and
both validation failures.

Why: Frontmatter is the contract every post must satisfy; validating
at build time prevents broken posts from ever reaching dist/.

Who: Hector; the build pipeline that will render Notes posts.

Where: New /build.ts, /tests/build.test.ts,
/tests/fixtures/sample-post.md.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 3: Markdown body rendering (TDD)

**Files:**
- Modify: `build.ts` (append `renderBody`)
- Modify: `tests/build.test.ts` (add `renderBody` describe block)

- [ ] **Step 1: Add the failing test**

Append to `tests/build.test.ts`:

```typescript
import { renderBody } from "../build.ts";

describe("renderBody", () => {
  test("renders headings, bold, and inline code", () => {
    const html = renderBody("# Title\n\nBody with **bold** and `code`.");
    expect(html).toContain("<h1>Title</h1>");
    expect(html).toContain("<strong>bold</strong>");
    expect(html).toContain("<code>code</code>");
  });

  test("renders fenced code blocks", () => {
    const html = renderBody("```\nlet x = 1;\n```");
    expect(html).toContain("<pre>");
    expect(html).toContain("<code>");
    expect(html).toContain("let x = 1;");
  });

  test("renders blockquotes", () => {
    const html = renderBody("> A pull quote.");
    expect(html).toContain("<blockquote>");
    expect(html).toContain("A pull quote.");
  });
});
```

- [ ] **Step 2: Run test, verify it fails**

Run: `bun test tests/build.test.ts -t renderBody`
Expected: FAIL with import error or "renderBody is not a function".

- [ ] **Step 3: Implement `renderBody`**

Append to `build.ts`:

```typescript
import { marked } from "marked";

marked.setOptions({
  gfm: true,
  breaks: false,
});

export function renderBody(markdown: string): string {
  return marked.parse(markdown, { async: false }) as string;
}
```

- [ ] **Step 4: Run test, verify it passes**

Run: `bun test tests/build.test.ts -t renderBody`
Expected: 3 passing tests in the renderBody block.

- [ ] **Step 5: Commit**

```bash
git add build.ts tests/build.test.ts
git commit -m "feat: render post Markdown body to HTML via marked

What: Adds renderBody() that uses marked with GFM enabled to convert
a Markdown string to HTML. Three tests cover headings/bold/code,
fenced code blocks, and blockquotes.

Why: Post bodies are authored in Markdown; the build pipeline needs
a deterministic, testable renderer.

Who: Hector; the Notes build pipeline.

Where: /build.ts (new export), /tests/build.test.ts (new describe block).

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 4: Post page template + renderer (TDD)

**Files:**
- Create: `notes/_template.html`
- Modify: `build.ts` (add `renderPostPage`)
- Modify: `tests/build.test.ts` (add `renderPostPage` describe)

- [ ] **Step 1: Create the post template**

`notes/_template.html`:

```html
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>{{title}} — Cognitive Factory</title>
  <meta name="description" content="{{dek}}" />

  <meta property="og:title" content="{{title}} — Cognitive Factory" />
  <meta property="og:description" content="{{dek}}" />
  <meta property="og:type" content="article" />
  <meta property="og:url" content="https://cognitivefactory.ai/notes/{{slug}}/" />
  <meta name="twitter:card" content="summary" />
  <meta name="twitter:title" content="{{title}} — Cognitive Factory" />
  <meta name="twitter:description" content="{{dek}}" />

  <link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' fill='%23f4f1ec'/%3E%3Ctext x='16' y='23' font-family='Georgia,serif' font-size='22' font-style='italic' text-anchor='middle' fill='%230f1410'%3EC%3C/text%3E%3C/svg%3E" />

  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Newsreader:ital,opsz,wght@0,6..72,300;0,6..72,400;0,6..72,500;1,6..72,400&family=IBM+Plex+Sans:wght@300;400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap" rel="stylesheet" />

  <link rel="stylesheet" href="/styles.css" />
</head>
<body>
  <header class="frame" aria-hidden="false">
    <div class="frame__corner frame__corner--tl">
      <span class="frame__line">§ 2026</span>
      <span class="frame__line">COGNITIVE FACTORY</span>
    </div>
    <div class="frame__corner frame__corner--tr">
      <span class="frame__line">{{mad}} · {{mad_label}}</span>
      <span class="frame__line">{{date}}</span>
    </div>
  </header>

  <main class="post">
    <header class="post__header reveal">
      <span class="mono post__kicker">§ {{mad}} · {{mad_label}}</span>
      <h1 class="post__title">{{title}}</h1>
      <p class="mono post__dek">{{dek}}</p>
      <div class="post__rule"></div>
    </header>
    <article class="post__body prose-long">
      {{body}}
    </article>
    <footer class="post__nav">
      <a class="mono" href="/notes/">← all notes</a>
      <span class="mono">cognitivefactory.ai</span>
    </footer>
  </main>

  <footer class="footer">
    <span class="mono">© 2026 · COGNITIVE FACTORY</span>
    <span class="mono">BUILT ON THE FLOOR · DEPLOYED AT THE EDGE</span>
  </footer>

  <script src="/script.js" defer></script>
</body>
</html>
```

- [ ] **Step 2: Add the failing test**

Append to `tests/build.test.ts`:

```typescript
import { renderPostPage, type RenderedPost } from "../build.ts";

describe("renderPostPage", () => {
  const post: RenderedPost = {
    slug: "sample-post",
    title: "Sample post",
    dek: "A test dek.",
    mad: "M",
    date: "2026-05-09",
    body: "# Heading\n\nBody.",
    html: "<h1>Heading</h1>\n<p>Body.</p>",
  };

  test("injects title, dek, mad, date, and body", async () => {
    const html = await renderPostPage(post);
    expect(html).toContain("<title>Sample post — Cognitive Factory</title>");
    expect(html).toContain('content="A test dek."');
    expect(html).toContain("M · MOATS");
    expect(html).toContain("2026-05-09");
    expect(html).toContain("<h1>Heading</h1>");
  });

  test("expands mad letter to full label", async () => {
    const a = await renderPostPage({ ...post, mad: "A" });
    const d = await renderPostPage({ ...post, mad: "D" });
    expect(a).toContain("A · AFFORDANCE");
    expect(d).toContain("D · DIFFUSION");
  });

  test("includes canonical OG URL with slug", async () => {
    const html = await renderPostPage(post);
    expect(html).toContain(
      'content="https://cognitivefactory.ai/notes/sample-post/"',
    );
  });
});
```

- [ ] **Step 3: Run test, verify it fails**

Run: `bun test tests/build.test.ts -t renderPostPage`
Expected: FAIL — `renderPostPage` not exported.

- [ ] **Step 4: Implement `renderPostPage`**

Append to `build.ts`:

```typescript
import { readFile } from "node:fs/promises";

export type RenderedPost = Post & { html: string };

const MAD_LABEL: Record<Mad, string> = {
  M: "MOATS",
  A: "AFFORDANCE",
  D: "DIFFUSION",
};

let postTemplateCache: string | null = null;

async function loadPostTemplate(): Promise<string> {
  if (postTemplateCache) return postTemplateCache;
  postTemplateCache = await readFile("notes/_template.html", "utf8");
  return postTemplateCache;
}

function applyTemplate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => {
    if (!(key in vars)) {
      throw new Error(`template placeholder '{{${key}}}' has no value`);
    }
    return vars[key];
  });
}

export async function renderPostPage(post: RenderedPost): Promise<string> {
  const template = await loadPostTemplate();
  return applyTemplate(template, {
    title: post.title,
    dek: post.dek,
    slug: post.slug,
    mad: post.mad,
    mad_label: MAD_LABEL[post.mad],
    date: post.date,
    body: post.html,
  });
}
```

(Note: `node:fs/promises` is already imported in Task 2; reuse the existing import statement rather than duplicating.)

- [ ] **Step 5: Run test, verify it passes**

Run: `bun test tests/build.test.ts -t renderPostPage`
Expected: 3 passing tests.

- [ ] **Step 6: Commit**

```bash
git add notes/_template.html build.ts tests/build.test.ts
git commit -m "feat: render Notes posts into per-page HTML template

What: Adds notes/_template.html (post page template) and
renderPostPage() in build.ts. The renderer expands {{title}},
{{dek}}, {{slug}}, {{mad}}, {{mad_label}}, {{date}}, {{body}}, and
maps the single MAD letter to its full label (MOATS / AFFORDANCE /
DIFFUSION). Three tests verify injection, label expansion, and
canonical OG URL.

Why: Each post is a static page that must reuse the homepage chrome
(frame, footer, type) while exposing post-specific metadata in the
top-right corner.

Who: Hector; the Notes build pipeline.

Where: New /notes/_template.html; appended exports in /build.ts; new
describe block in /tests/build.test.ts.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 5: Archive page template + renderer (TDD)

**Files:**
- Create: `notes/_index-template.html`
- Create: `notes/_row-template.html`
- Modify: `build.ts` (add `renderArchivePage`)
- Modify: `tests/build.test.ts` (add `renderArchivePage` describe)

- [ ] **Step 1: Create the archive page template**

`notes/_index-template.html`:

```html
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Notes — Cognitive Factory</title>
  <meta name="description" content="Field notes from the floor — ideas for AI in regulated manufacturing, organized around moats, affordance, and diffusion." />

  <link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' fill='%23f4f1ec'/%3E%3Ctext x='16' y='23' font-family='Georgia,serif' font-size='22' font-style='italic' text-anchor='middle' fill='%230f1410'%3EC%3C/text%3E%3C/svg%3E" />

  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Newsreader:ital,opsz,wght@0,6..72,300;0,6..72,400;0,6..72,500;1,6..72,400&family=IBM+Plex+Sans:wght@300;400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap" rel="stylesheet" />

  <link rel="stylesheet" href="/styles.css" />
</head>
<body>
  <header class="frame" aria-hidden="false">
    <div class="frame__corner frame__corner--tl">
      <span class="frame__line">§ 2026</span>
      <span class="frame__line">COGNITIVE FACTORY</span>
    </div>
    <div class="frame__corner frame__corner--tr">
      <span class="frame__line">NOTES</span>
      <span class="frame__line">{{count}} ENTRIES</span>
    </div>
  </header>

  <main>
    <section class="block reveal">
      <header class="block__header">
        <span class="mono">§ NOTES</span>
        <span class="mono">IDEAS FOR REGULATED MANUFACTURING</span>
      </header>
      <h2 class="block__title">Field notes from the floor.</h2>
      <div class="prose">
        <p>Working notes on building AI for regulated manufacturing. Each entry maps to one of three claims: a <em>moat</em> built from the customer back, an <em>affordance</em> that makes the path obvious, or a <em>diffusion</em> gap waiting to be closed.</p>
        <p>Written under audit, between batches, between flights.</p>
      </div>

      <ul class="notes-archive" role="list">
        {{rows}}
      </ul>
    </section>
  </main>

  <footer class="footer">
    <a class="mono" href="/">← cognitivefactory.ai</a>
    <span class="mono">© 2026 · COGNITIVE FACTORY</span>
  </footer>

  <script src="/script.js" defer></script>
</body>
</html>
```

- [ ] **Step 2: Create the row template**

`notes/_row-template.html`:

```html
<li class="note-row">
  <a class="note-row__link" href="/notes/{{slug}}/">
    <span class="mono note-row__num">NOTE {{num}}</span>
    <span class="note-row__title">{{title}}</span>
    <span class="mono note-row__tag">{{mad}} · {{mad_label}}</span>
    <span class="mono note-row__date">{{date}}</span>
    <span class="note-row__dek">{{dek}}</span>
    <span class="mono note-row__arrow" aria-hidden="true">→</span>
  </a>
</li>
```

- [ ] **Step 3: Add the failing test**

Append to `tests/build.test.ts`:

```typescript
import { renderArchivePage } from "../build.ts";

describe("renderArchivePage", () => {
  const posts: RenderedPost[] = [
    {
      slug: "first",
      title: "First post",
      dek: "Dek 1",
      mad: "M",
      date: "2026-05-09",
      body: "",
      html: "",
    },
    {
      slug: "second",
      title: "Second post",
      dek: "Dek 2",
      mad: "A",
      date: "2026-05-01",
      body: "",
      html: "",
    },
  ];

  test("renders one row per post in reverse-chronological order", async () => {
    const html = await renderArchivePage(posts);
    const firstIdx = html.indexOf("First post");
    const secondIdx = html.indexOf("Second post");
    expect(firstIdx).toBeGreaterThan(-1);
    expect(secondIdx).toBeGreaterThan(-1);
    expect(firstIdx).toBeLessThan(secondIdx); // newer first
  });

  test("numbers entries from 001 in display order", async () => {
    const html = await renderArchivePage(posts);
    expect(html).toContain("NOTE 001");
    expect(html).toContain("NOTE 002");
  });

  test("expands mad labels in tags", async () => {
    const html = await renderArchivePage(posts);
    expect(html).toContain("M · MOATS");
    expect(html).toContain("A · AFFORDANCE");
  });

  test("injects total count into corner", async () => {
    const html = await renderArchivePage(posts);
    expect(html).toMatch(/2\s*ENTRIES/);
  });
});
```

- [ ] **Step 4: Run test, verify it fails**

Run: `bun test tests/build.test.ts -t renderArchivePage`
Expected: FAIL — `renderArchivePage` not exported.

- [ ] **Step 5: Implement `renderArchivePage`**

Append to `build.ts`:

```typescript
let archiveTemplateCache: string | null = null;
let rowTemplateCache: string | null = null;

async function loadArchiveTemplates(): Promise<{
  archive: string;
  row: string;
}> {
  if (!archiveTemplateCache) {
    archiveTemplateCache = await readFile(
      "notes/_index-template.html",
      "utf8",
    );
  }
  if (!rowTemplateCache) {
    rowTemplateCache = await readFile("notes/_row-template.html", "utf8");
  }
  return { archive: archiveTemplateCache, row: rowTemplateCache };
}

export async function renderArchivePage(
  posts: RenderedPost[],
): Promise<string> {
  const sorted = [...posts].sort((a, b) => b.date.localeCompare(a.date));
  const { archive, row } = await loadArchiveTemplates();

  const rows = sorted
    .map((post, i) =>
      applyTemplate(row, {
        slug: post.slug,
        num: String(i + 1).padStart(3, "0"),
        title: post.title,
        mad: post.mad,
        mad_label: MAD_LABEL[post.mad],
        date: post.date,
        dek: post.dek,
      }),
    )
    .join("\n");

  return applyTemplate(archive, {
    rows,
    count: String(sorted.length),
  });
}
```

- [ ] **Step 6: Run test, verify it passes**

Run: `bun test tests/build.test.ts -t renderArchivePage`
Expected: 4 passing tests.

- [ ] **Step 7: Commit**

```bash
git add notes/_index-template.html notes/_row-template.html build.ts tests/build.test.ts
git commit -m "feat: render Notes archive page with sorted post rows

What: Adds notes/_index-template.html, notes/_row-template.html, and
renderArchivePage() in build.ts. The renderer sorts posts
reverse-chronologically, numbers each row 001+, expands MAD letters
to labels, and injects the count into the corner. Four tests cover
ordering, numbering, label expansion, and count injection.

Why: /notes/ needs an archive index that lists every post in a
single chronological feed with the MAD tag visible per entry.

Who: Hector; readers landing on /notes/ from the homepage footer.

Where: New /notes/_index-template.html, /notes/_row-template.html;
appended to /build.ts; new describe block in /tests/build.test.ts.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 6: End-to-end build orchestrator (TDD)

**Files:**
- Modify: `build.ts` (add `build` function + CLI entry)
- Modify: `tests/build.test.ts` (add `build` describe)

- [ ] **Step 1: Add the failing test**

Append to `tests/build.test.ts`:

```typescript
import { build } from "../build.ts";
import { rm, readdir, readFile as fsReadFile } from "node:fs/promises";
import { existsSync } from "node:fs";

describe("build", () => {
  const TEST_DIST = "dist-test";
  const TEST_NOTES = "tests/fixtures/notes";

  test("produces dist with archive and per-post pages", async () => {
    if (existsSync(TEST_DIST)) await rm(TEST_DIST, { recursive: true });

    await build({
      notesDir: TEST_NOTES,
      outDir: TEST_DIST,
      staticAssets: ["index.html", "styles.css", "script.js"],
    });

    const files = await readdir(TEST_DIST, { recursive: true });
    expect(files).toContain("index.html");
    expect(files).toContain("styles.css");
    expect(files).toContain("script.js");
    expect(files.some((f) => f.toString().endsWith("notes/index.html"))).toBe(
      true,
    );
    expect(
      files.some((f) => f.toString().endsWith("notes/sample-post/index.html")),
    ).toBe(true);

    const post = await fsReadFile(
      `${TEST_DIST}/notes/sample-post/index.html`,
      "utf8",
    );
    expect(post).toContain("Sample post");
    expect(post).toContain("<h1>Heading</h1>");

    await rm(TEST_DIST, { recursive: true });
  });
});
```

- [ ] **Step 2: Set up the test fixture directory**

Run:
```bash
mkdir -p tests/fixtures/notes
cp tests/fixtures/sample-post.md tests/fixtures/notes/sample-post.md
```

- [ ] **Step 3: Run test, verify it fails**

Run: `bun test tests/build.test.ts -t build`
Expected: FAIL — `build` not exported.

- [ ] **Step 4: Implement `build`**

Update the top-of-file imports in `build.ts` so `node:fs/promises` covers everything we need (consolidate the existing `readFile` import — do NOT add a second `node:fs/promises` import statement):

```typescript
import { readFile, mkdir, writeFile, copyFile } from "node:fs/promises";
import { dirname, join, basename } from "node:path";
import { existsSync } from "node:fs";
```

Then append at the end of `build.ts`:

```typescript
export type BuildOptions = {
  notesDir: string;
  outDir: string;
  staticAssets: string[];
};

export async function build(opts: BuildOptions): Promise<void> {
  // 1. Discover Markdown sources (skip files starting with `_`)
  const glob = new Bun.Glob("*.md");
  const mdPaths: string[] = [];
  for await (const file of glob.scan({ cwd: opts.notesDir })) {
    if (!file.startsWith("_")) mdPaths.push(join(opts.notesDir, file));
  }

  // 2. Parse + render every post
  const rendered: RenderedPost[] = [];
  for (const path of mdPaths) {
    const post = await parsePost(path);
    rendered.push({ ...post, html: renderBody(post.body) });
  }

  // 3. Write per-post pages
  for (const post of rendered) {
    const html = await renderPostPage(post);
    const outPath = join(opts.outDir, "notes", post.slug, "index.html");
    await mkdir(dirname(outPath), { recursive: true });
    await writeFile(outPath, html, "utf8");
  }

  // 4. Write archive page
  const archiveHtml = await renderArchivePage(rendered);
  const archivePath = join(opts.outDir, "notes", "index.html");
  await mkdir(dirname(archivePath), { recursive: true });
  await writeFile(archivePath, archiveHtml, "utf8");

  // 5. Copy static assets
  await mkdir(opts.outDir, { recursive: true });
  for (const asset of opts.staticAssets) {
    if (existsSync(asset)) {
      await copyFile(asset, join(opts.outDir, basename(asset)));
    }
  }
}

// CLI entry — only runs when executed directly via `bun run build.ts`
if (import.meta.main) {
  await build({
    notesDir: "notes",
    outDir: "dist",
    staticAssets: ["index.html", "styles.css", "script.js"],
  });
  console.log("✓ build complete → dist/");
}
```

- [ ] **Step 5: Run test, verify it passes**

Run: `bun test tests/build.test.ts -t build`
Expected: 1 passing test.

- [ ] **Step 6: Run the full build against the real `notes/` directory**

Run: `bun run build`
Expected: prints `✓ build complete → dist/`. `dist/` contains `index.html`, `styles.css`, `script.js`, and `notes/index.html`. (No post pages yet — `notes/audit-trail-moat.md` does not exist until Task 9.)

- [ ] **Step 7: Run the full test suite**

Run: `bun test`
Expected: all tests pass (parsePost, renderBody, renderPostPage, renderArchivePage, build).

- [ ] **Step 8: Commit**

```bash
git add build.ts tests/build.test.ts tests/fixtures/notes/sample-post.md
git commit -m "feat: end-to-end Notes build that writes a deployable dist/

What: Adds build() in build.ts that discovers notes/*.md, parses
and renders each post, writes per-post pages to dist/notes/<slug>/,
writes the archive index to dist/notes/, and copies static assets
(homepage HTML, CSS, JS) to dist/. CLI entry runs build() with the
real /notes/ directory when invoked via 'bun run build'.

Why: Cloudflare Pages deploys from dist/; this is the artifact.

Who: Hector; the deploy pipeline.

Where: Appended to /build.ts; new describe in /tests/build.test.ts;
new fixture at /tests/fixtures/notes/sample-post.md.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 7: Extend `styles.css` for Notes

**Files:**
- Modify: `styles.css` (append a new section block at end)

- [ ] **Step 1: Append the Notes styles**

Append to `styles.css` (after the `@media (max-width: 460px)` block):

```css
/* =========================================================
   NOTES — post pages and archive
   ========================================================= */

/* ----- post page ----- */

.post {
  max-width: var(--max);
  margin: 0 auto;
  padding: 0 var(--margin);
}

.post__header {
  padding: clamp(7rem, 14vw, 11rem) 0 clamp(2.4rem, 4vw, 3.6rem);
  max-width: 62ch;
}

.post__kicker {
  display: block;
  color: var(--rust);
  margin-bottom: clamp(1.4rem, 2.5vw, 2rem);
}

.post__title {
  font-family: var(--display);
  font-weight: 400;
  font-size: clamp(2rem, 4.6vw, 3.4rem);
  line-height: 1.04;
  letter-spacing: -0.02em;
  color: var(--ink);
  font-variation-settings: 'opsz' 36;
  margin-bottom: clamp(1rem, 1.6vw, 1.4rem);
}

.post__dek {
  font-size: 0.78rem;
  color: var(--ink-soft);
  letter-spacing: 0.1em;
  line-height: 1.5;
  text-transform: none;
  max-width: 60ch;
}

.post__rule {
  height: 1px;
  background: var(--rule-strong);
  margin-top: clamp(2rem, 3.6vw, 3rem);
  position: relative;
}

.post__rule::after {
  content: '';
  position: absolute;
  top: 0;
  left: 0; right: 0;
  height: 9px;
  background-image: repeating-linear-gradient(
    to right,
    var(--rule-strong) 0,
    var(--rule-strong) 1px,
    transparent 1px,
    transparent 50px
  );
}

/* ----- post body (long-form prose) ----- */

.prose-long {
  max-width: 62ch;
  padding: clamp(2.4rem, 4vw, 3.6rem) 0 clamp(4rem, 7vw, 6rem);
  font-size: clamp(1.04rem, 1.18vw, 1.16rem);
  line-height: 1.7;
  color: var(--ink-soft);
}

.prose-long > * + * { margin-top: 1.2rem; }

.prose-long h2,
.prose-long h3 {
  font-family: var(--display);
  font-weight: 400;
  letter-spacing: -0.015em;
  color: var(--ink);
  line-height: 1.15;
  margin-top: clamp(2.4rem, 4vw, 3.2rem);
  margin-bottom: 0.4rem;
}

.prose-long h2 {
  font-size: clamp(1.45rem, 2.2vw, 1.85rem);
  font-variation-settings: 'opsz' 28;
}

.prose-long h3 {
  font-size: clamp(1.15rem, 1.6vw, 1.35rem);
  font-variation-settings: 'opsz' 22;
}

.prose-long em { font-style: italic; }
.prose-long strong { font-weight: 500; color: var(--ink); }

.prose-long a {
  color: var(--rust);
  text-decoration: none;
  border-bottom: 1px solid var(--rule);
  transition: border-color 0.3s var(--ease);
}
.prose-long a:hover { border-bottom-color: var(--rust); }

.prose-long blockquote {
  font-family: var(--display);
  font-style: italic;
  font-weight: 400;
  font-size: clamp(1.25rem, 1.9vw, 1.55rem);
  line-height: 1.35;
  color: var(--ink);
  padding: 0.8rem 0 0.5rem 1.4rem;
  border-left: 2px solid var(--rust);
  margin: clamp(1.8rem, 3vw, 2.4rem) 0;
  font-variation-settings: 'opsz' 24;
}

.prose-long ul,
.prose-long ol {
  padding-left: 1.4rem;
}

.prose-long li + li { margin-top: 0.4rem; }

.prose-long code {
  font-family: var(--mono);
  font-size: 0.9em;
  background: var(--bg-deep);
  padding: 0.1em 0.35em;
}

.prose-long pre {
  font-family: var(--mono);
  font-size: 0.86rem;
  line-height: 1.6;
  background: var(--bg-deep);
  padding: 1.1rem 1.3rem;
  overflow-x: auto;
  border-left: 2px solid var(--rule-strong);
  margin: clamp(1.4rem, 2.4vw, 1.8rem) 0;
}

.prose-long pre code {
  background: transparent;
  padding: 0;
}

.prose-long hr {
  border: 0;
  height: 14px;
  background-image: repeating-linear-gradient(
    to right,
    var(--rule) 0,
    var(--rule) 1px,
    transparent 1px,
    transparent 12px
  );
  margin: clamp(2.4rem, 4vw, 3.6rem) 0;
}

/* ----- post footer nav ----- */

.post__nav {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  padding: 1.8rem 0 0;
  border-top: 1px solid var(--rule);
  max-width: 62ch;
  font-size: 0.65rem;
}

.post__nav a {
  color: var(--ink);
  text-decoration: none;
  border-bottom: 1px solid transparent;
  transition: border-color 0.3s var(--ease), color 0.3s var(--ease);
}
.post__nav a:hover { color: var(--rust); border-bottom-color: var(--rust); }

/* ----- archive list ----- */

.notes-archive {
  list-style: none;
  border-top: 1px solid var(--rule-strong);
  margin-top: -1rem;
}

.note-row {
  border-bottom: 1px solid var(--rule);
  position: relative;
  transition: padding 0.45s var(--ease);
}

.note-row::before {
  content: '';
  position: absolute;
  left: 0; top: 0; bottom: 0;
  width: 0;
  background: var(--rust);
  transition: width 0.45s var(--ease);
}

.note-row:hover { padding-left: clamp(0.8rem, 1.6vw, 1.6rem); }
.note-row:hover::before { width: 3px; }

.note-row__link {
  display: grid;
  grid-template-columns: 7ch 1fr minmax(13ch, 16ch) minmax(11ch, 13ch) 2ch;
  grid-template-rows: auto auto;
  column-gap: clamp(1rem, 2vw, 2rem);
  row-gap: 0.4rem;
  padding: clamp(1.4rem, 2.4vw, 2rem) 0;
  text-decoration: none;
  color: inherit;
  align-items: baseline;
}

.note-row__num { color: var(--rust); align-self: start; padding-top: 0.4rem; grid-row: 1; grid-column: 1; }

.note-row__title {
  font-family: var(--display);
  font-size: clamp(1.2rem, 1.8vw, 1.5rem);
  letter-spacing: -0.01em;
  line-height: 1.2;
  color: var(--ink);
  grid-row: 1; grid-column: 2;
  font-variation-settings: 'opsz' 28;
}

.note-row__tag { text-align: right; padding-top: 0.55rem; grid-row: 1; grid-column: 3; color: var(--ink-soft); }

.note-row__date { text-align: right; padding-top: 0.55rem; grid-row: 1; grid-column: 4; color: var(--ink-muted); }

.note-row__arrow {
  text-align: right;
  padding-top: 0.55rem;
  color: var(--ink-muted);
  grid-row: 1; grid-column: 5;
  transition: transform 0.35s var(--ease), color 0.35s var(--ease);
}

.note-row:hover .note-row__arrow { transform: translateX(0.3rem); color: var(--rust); }

.note-row__dek {
  grid-row: 2; grid-column: 2 / -1;
  color: var(--ink-soft);
  font-size: clamp(0.95rem, 1vw, 1.02rem);
  line-height: 1.55;
  max-width: 70ch;
}

@media (max-width: 720px) {
  .note-row__link {
    grid-template-columns: 7ch 1fr;
    grid-template-rows: auto auto auto auto;
    row-gap: 0.3rem;
  }
  .note-row__num { grid-row: 1; grid-column: 1; }
  .note-row__title { grid-row: 1; grid-column: 2; }
  .note-row__dek { grid-row: 2; grid-column: 1 / -1; padding-top: 0.4rem; }
  .note-row__tag { grid-row: 3; grid-column: 1 / -1; text-align: left; padding-top: 0.5rem; }
  .note-row__date { grid-row: 4; grid-column: 1 / -1; text-align: left; padding-top: 0; }
  .note-row__arrow { display: none; }

  .post__nav { flex-direction: column; gap: 0.4rem; }
}
```

- [ ] **Step 2: Commit**

```bash
git add styles.css
git commit -m "feat: extend styles.css for Notes post and archive pages

What: Appends a Notes block to styles.css with .post, .post__header,
.post__kicker, .post__title, .post__dek, .post__rule, .prose-long,
.post__nav, .notes-archive, .note-row, and a 720px breakpoint for
the row layout. All new rules reuse existing tokens (colors, type,
spacing) and follow the editorial-industrial pattern from the
homepage.

Why: Post pages and the archive need their own layout primitives
(single-column long-form prose, ticked rule, archive grid) without
disturbing the homepage section styles.

Who: Hector; readers viewing /notes/ and post pages.

Where: Appended to /styles.css. No edits to existing rules.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 8: Homepage footer link to `/notes/`

**Files:**
- Modify: `index.html` (footer block)

- [ ] **Step 1: Update the footer**

In `index.html`, locate this block (around line 227):

```html
  <footer class="footer">
    <span class="mono">© 2026 · COGNITIVE FACTORY</span>
    <span class="mono">BUILT ON THE FLOOR · DEPLOYED AT THE EDGE</span>
  </footer>
```

Replace with:

```html
  <footer class="footer">
    <span class="mono">© 2026 · COGNITIVE FACTORY</span>
    <a class="mono footer__link" href="/notes/">NOTES · /notes</a>
    <span class="mono">BUILT ON THE FLOOR · DEPLOYED AT THE EDGE</span>
  </footer>
```

- [ ] **Step 2: Add the `.footer__link` rule to `styles.css`**

In `styles.css`, locate the existing `.footer` block (around line 415):

```css
.footer {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  padding: 2.2rem var(--margin);
  border-top: 1px solid var(--rule);
  max-width: var(--max);
  margin: 0 auto;
  font-size: 0.65rem;
}
```

Append immediately after it (still inside the existing FOOTER section comment, before `/* ============== REVEAL ON SCROLL ============== */`):

```css
.footer__link {
  color: var(--ink-muted);
  text-decoration: none;
  border-bottom: 1px solid transparent;
  transition: color 0.3s var(--ease), border-color 0.3s var(--ease);
}
.footer__link:hover {
  color: var(--rust);
  border-bottom-color: var(--rust);
}
```

- [ ] **Step 3: Manual verification**

Run: `bun dev`
Open: `http://localhost:3000` (or whatever port Bun reports)
Check: footer now shows three items — copyright, NOTES link in middle, tagline. Hover over NOTES — turns rust with underline. Click goes to `/notes/` (404 in dev — fine, archive is built into `dist/`).

- [ ] **Step 4: Commit**

```bash
git add index.html styles.css
git commit -m "feat: link homepage footer to /notes/

What: Adds a NOTES · /notes link to the homepage footer between the
copyright and tagline, plus a .footer__link style with rust hover.

Why: The Notes archive needs one entry point from the homepage
without disturbing the section scroll rhythm; the footer is the
right placement.

Who: Hector; visitors discovering Notes from the homepage.

Where: /index.html footer block; /styles.css FOOTER section.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 9: Write the first post — `audit-trail-moat.md`

**Files:**
- Create: `notes/audit-trail-moat.md`

- [ ] **Step 1: Create the post file**

`notes/audit-trail-moat.md`:

```markdown
---
title: "The audit-trail moat"
slug: audit-trail-moat
mad: M
date: 2026-05-09
dek: "Why every audit Cognitive Factory survives makes the next one cheaper to win."
---

The standard advice for a customer-back moat is to own the workflow, own the data, own the integration. It assumes the customer's data has the same shape as everyone else's. In regulated manufacturing it doesn't.

The data that matters here is *audit-grade*. Redlines that survived a Nadcap subscriber. Evidence packages a DER signed off on. MRBs that closed without a CAR. NDT calls a Level III put a stamp on. None of it is scraped. None of it is licensed. It is born under stakes — under a runway, a reactor, an implant — and it can only be earned, one engagement at a time, by people the audit community already trusts.

That is the moat. Not the model. The corpus the model is graded against.

## What the engagements actually produce

Cognitive Factory ships five services. Each one of them, on every job, produces evidence as a byproduct.

- **Factory Audit** ships redlined paragraphs against a real spec.
- **Factory Yield** ships traced root causes against real scrap.
- **Factory Vision** ships defect calls against a real Level III.
- **Factory Twin** ships predicted process windows against real soak data.
- **Factory Agents** ship dispatch decisions against a real shop.

Every one of those outputs is verified before it counts. An auditor signs the redline. A quality lead closes the MRB. A Level III holds the inspection stamp. A DER agrees the twin is conservative. A scheduler watches the agent's call survive a shift change.

That verification is the asset. Each verified output is one ground-truth label that no frontier lab can manufacture, because no frontier lab is in the audit room.

## Why this is structurally a customer-back moat

The corpus is created by the customer's audit cycle, not by our engineering cycle. We do not generate this data; the regulated environment does, and we are the ones present when it lands. The pre-conditions for the moat — domain trust, working software, presence in the audit room — are the exact pre-conditions Cognitive Factory was built around.

Three properties make it a moat rather than a head start:

**It compounds.** Every engagement adds verified examples; the corpus is monotonic. A competitor entering year three has to recreate three years of audited outputs from scratch, and they can only recreate them at the rate the certification calendar allows.

**It is frontier-aligned.** Karpathy's verifiability thesis from the same Sequoia keynote — *LLMs automate what you can verify* — implies the most valuable thing on the floor is a verifier. Our corpus is exactly that. Every model jump makes the corpus more valuable, not less. A new model is a new candidate; the corpus is the gate.

**It is asymmetric to capital.** A competitor with ten times our budget cannot buy ten times the audits. Audit cadence is set by AS9100 surveillance schedules, by Nadcap reaccreditation, by FDA submissions, by DER review boards. Burn rate doesn't move them.

> A frontier lab cannot run a Nadcap audit. A SaaS competitor cannot get a DER on a Zoom call. A consulting firm without working software cannot capture the verification at the moment it happens.

## How we build it — the four-phase business move

The moat does not appear by writing code. It appears by writing the right contract, capturing the right artifact, and surviving the audit. Four phases, each scoped to a quarter, each shipping customer value first.

### Phase 1 — Capture (months 0–6)

Every service deliverable ships with a structured artifact. The schema is a one-page document inside the deliverable contract. Examples:

- Audit redlines: `(spec_paragraph, draft_text, redlined_text, reviewer_id, decision)`.
- Yield analyses: `(scrap_event, candidate_causes, validated_cause, evidence)`.
- Vision deployments: `(image_hash, model_call, level3_call, agreement)`.
- Twin runs: `(input_window, predicted_envelope, observed_outcome)`.
- Agents: `(state, action, supervisor_decision)`.

The artifacts live in a per-customer Postgres instance that the customer owns. We keep a sanitized, append-only read-replica with the customer's permission, written into the contract from day one.

### Phase 2 — Index (months 6–12)

Build the corpus layer on top of the per-customer captures. Tag each artifact by process family (heat treat, NDT, weld, plating, chem), spec lineage (AMS 2750G vs F vs E, AWS D17.1, ASTM E1444), part class, customer industry, and verifier identity. Stand up a search and slice interface so engagements can pull comparable evidence in seconds. The indexed corpus is the asset that compounds; without indexing it is a pile.

### Phase 3 — Verify (months 12–18)

Stand up an internal evaluation harness. Every model release we consider — frontier, open-weights, fine-tuned — runs against the corpus before it touches a customer floor. Disagreements between model and verifier surface immediately. They get triaged into one of three buckets: model wins (we update the verifier), verifier wins (we constrain the model), or it depends (we route to a human). The harness becomes the gate every Cognitive Factory deployment passes through.

### Phase 4 — Compound (months 18+)

Use the corpus to win the next deal. New customers get a head-start, not a head-fake: their first Audit deployment is calibrated against twelve other Nadcap subscribers' redlines; their first Vision deployment is checked against thousands of audited Level III calls; their first Yield analysis is benchmarked against verified scrap traces from comparable processes. The customer pitch shifts from *"we know this domain"* to *"we know what passing looks like in your domain, and we can show you."*

## The window

Six months in, the corpus is real, the schema is locked, two customers are contributing.

Eighteen months in, the verifier harness is gating every deployment, and no model touches a floor without passing.

Thirty-six months in, this is the most authoritative private record of regulated-manufacturing decisions in existence, and the customer pitch writes itself.

A frontier lab will not build this in the next twenty-four months. A competitor without the floor will not build it ever.

The next twenty-four months decide who runs the cognitive factories. The audit trail decides who runs them next.
```

- [ ] **Step 2: Build and verify**

Run: `bun run build`
Expected: prints `✓ build complete → dist/`. `dist/notes/audit-trail-moat/index.html` exists.

- [ ] **Step 3: Run the test suite**

Run: `bun test`
Expected: all tests pass.

- [ ] **Step 4: Manual visual verification**

Run: `bun run preview`
Open: `http://localhost:3000/notes/audit-trail-moat/`

Check:
- Frame top-right shows `M · MOATS` in rust and `2026-05-09` underneath.
- Title in Newsreader, large. Dek below in mono caps.
- Ticked rule under header (matches hero rule pattern).
- Single-column body, generous line height (~1.7), max-width feels readable.
- `## What the engagements actually produce` renders as Newsreader heading, not bold sans.
- Bullet list under that heading renders cleanly with proper spacing.
- The blockquote ("A frontier lab cannot run a Nadcap audit...") renders as italic Newsreader with rust left-rule.
- `← all notes` link at bottom-left, `cognitivefactory.ai` at bottom-right.
- Hover on `← all notes` — turns rust.

Open: `http://localhost:3000/notes/`

Check:
- Header shows `§ NOTES · IDEAS FOR REGULATED MANUFACTURING`.
- Title `Field notes from the floor.` in Newsreader.
- Standfirst paragraphs render in two-column `.prose`.
- One row: `NOTE 001  The audit-trail moat  M · MOATS  2026-05-09  →` plus the dek below.
- Hover on the row — left rust bar slides in, row pads right, arrow shifts right.
- Click — navigates to the post page.

Open: `http://localhost:3000/`

Check:
- Homepage looks identical to before, with the new `NOTES · /notes` link in the footer.
- Hover on it — rust + underline. Click — goes to `/notes/`.

- [ ] **Step 5: Editorial review pass**

Reread the post once more in the browser. Confirm it lands in the keynote register per `CLAUDE.md` "Tone of copy":

- Opens with a contrast pair (standard advice vs. regulated reality).
- Short declarative punches alternate with explanatory paragraphs.
- Concrete nouns throughout (Nadcap, DER, MRB, CAR, Level III, AMS 2750G, AWS D17.1, ASTM E1444).
- "So what?" is answered explicitly in each phase description.
- Closes with time-horizon expansion (6 → 18 → 36 months → "ever").
- No AI-vendor clichés, no "leverage," no exclamation points.

If any paragraph drifts toward generic startup register, edit inline and rebuild.

- [ ] **Step 6: Commit**

```bash
git add notes/audit-trail-moat.md
git commit -m "feat: ship the first Notes post — the audit-trail moat

What: Adds notes/audit-trail-moat.md, a ~1,100-word post on a
customer-back moat for Cognitive Factory: the corpus of audit-grade
evidence that every engagement produces as a byproduct, structurally
unreachable by frontier labs and asymmetric to competitors' capital.
The post walks through a four-phase implementation (Capture, Index,
Verify, Compound) and closes on the 6/18/36-month time horizon.

Why: First entry under the M (Moats) letter of the MAD blog;
articulates the actual business move the moat implies, not just the
moat thesis.

Who: Hector; readers landing on the post from /notes/ or social.

Where: New /notes/audit-trail-moat.md.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 10: Cloudflare Pages deploy doc

**Files:**
- Create: `cloudflare-pages.md`

- [ ] **Step 1: Create the doc**

`cloudflare-pages.md`:

```markdown
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
```

- [ ] **Step 2: Commit**

```bash
git add cloudflare-pages.md
git commit -m "docs: document Cloudflare Pages deploy settings

What: Adds cloudflare-pages.md with the Pages project config
(build command, output dir, BUN_VERSION env var), custom domain
notes, and a local-equivalence check command.

Why: Pages settings are configured in a Cloudflare dashboard; the
canonical record needs to live in the repo so it survives if the
dashboard is reconfigured by a different operator.

Who: Hector; whoever next reconfigures the Pages project.

Where: New /cloudflare-pages.md.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 11: Update `CLAUDE.md` for the new tech stack

**Files:**
- Modify: `CLAUDE.md`

- [ ] **Step 1: Replace the "Repository layout" section**

Locate the existing section in `CLAUDE.md`:

```markdown
## Repository layout

Three files at root: `index.html`, `styles.css`, `script.js`. No package manager, no build, no tests, no framework. Fonts come from Google Fonts at runtime.
```

Replace with:

```markdown
## Repository layout

Homepage source stays flat at the root: `index.html`, `styles.css`, `script.js`. The `notes/` directory holds Markdown post sources plus three HTML templates (`_template.html`, `_index-template.html`, `_row-template.html`). A single `build.ts` (Bun + TypeScript) parses frontmatter, renders Markdown, applies templates, and writes everything to `dist/` — that's what Cloudflare Pages deploys. Tests live in `tests/build.test.ts` and run under `bun test`.

Fonts come from Google Fonts at runtime. The browser-side site itself is still vanilla HTML/CSS/JS — no bundler, no transpiler, no framework. TypeScript is build-time only.
```

- [ ] **Step 2: Replace the "Local preview" section**

Locate:

```markdown
## Local preview

No build or dev server is configured. To preview, serve the directory statically — e.g. `python3 -m http.server 8000` from the repo root, then open `http://localhost:8000`. Edits to the three files are live on refresh.
```

Replace with:

```markdown
## Local preview

- `bun install` — install deps (one-time per clone).
- `bun dev` — Bun dev server with hot reload, serves the repo root. Use this for editing `index.html` / `styles.css` / `script.js`.
- `bun run build` — render Markdown posts and write the deploy artifact to `dist/`.
- `bun run preview` — serve `dist/` to verify the deploy artifact byte-for-byte before pushing.
- `bun test` — run the build-pipeline test suite.

Cloudflare Pages picks up `bun run build` automatically on push to `main`. Settings: see `cloudflare-pages.md`.
```

- [ ] **Step 3: Add a "Tech stack" section**

Insert immediately after the "Local preview" section, before "Design system — treat as load-bearing":

```markdown
## Tech stack

- **Source:** GitHub.
- **Hosting:** Cloudflare Pages, deploys `dist/` on every push to `main`.
- **Toolchain:** Bun for dev server, build script (`build.ts`), and tests. Two runtime deps: `marked` (Markdown), `gray-matter` (YAML frontmatter). No framework, no bundler.
- **Browser code:** vanilla HTML, CSS, JavaScript. No transpiler.
- **TypeScript:** build-time only — `build.ts` and tests.

This stack is deliberately minimal. New build dependencies require an explicit reason; reach for vanilla first.
```

- [ ] **Step 4: Add Notes-specific guidance to the "Section pattern" or as new section**

Insert after the existing "Section pattern" section, before "Responsive breakpoints":

```markdown
## Notes (essays) section

Posts live in `notes/<slug>.md` with frontmatter (`title`, `slug`, `mad: M|A|D`, `date: YYYY-MM-DD`, `dek`). The build renders each to `dist/notes/<slug>/index.html` and the archive at `dist/notes/index.html`.

When adding a post:
1. Pick the MAD letter the post supports — a single letter, not multiple. If the idea spans two letters, it's two posts.
2. Match the keynote register (see "Tone of copy"). Re-read the existing post (`audit-trail-moat.md`) before drafting; it sets the cadence.
3. Use Markdown headings (`##`, `###`), blockquotes for pull quotes, and bullet lists sparingly. Don't introduce custom HTML in posts — extend the templates instead if a real new pattern emerges.
4. Run `bun run build && bun run preview` and read the post in the browser before committing. Long-form prose looks different at 62ch than it does in your editor.
```

- [ ] **Step 5: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: update CLAUDE.md to reflect Bun build and Notes section

What: Updates the Repository layout, Local preview, and Section
pattern guidance in CLAUDE.md. Adds a Tech stack section (GitHub,
Cloudflare Pages, Bun, vanilla HTML/CSS/JS) and a Notes section
covering the post authoring workflow.

Why: The repo just gained a build pipeline and a /notes/ section;
CLAUDE.md must describe the current reality so future sessions don't
operate on the old 'three flat files, no build' assumption.

Who: future Claude Code sessions; Hector.

Where: /CLAUDE.md.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 12: Final integration verification

**Files:** none modified — verification only.

- [ ] **Step 1: Clean rebuild from scratch**

Run:
```bash
rm -rf dist node_modules
bun install
bun test
bun run build
```

Expected: tests all pass; build completes; `dist/` contains:
- `index.html`, `styles.css`, `script.js` (homepage)
- `notes/index.html` (archive)
- `notes/audit-trail-moat/index.html` (post)

- [ ] **Step 2: Serve `dist/` and check every page**

Run: `bun run preview`

Pages to check:
- `http://localhost:3000/` — homepage with footer link.
- `http://localhost:3000/notes/` — archive with one row.
- `http://localhost:3000/notes/audit-trail-moat/` — full post.

For each: open browser devtools, confirm no console errors, no 404s in the network tab (paper grain SVG is inline; fonts load from Google).

- [ ] **Step 3: Lighthouse check on homepage**

Run a Lighthouse audit on `http://localhost:3000/` (Chrome DevTools → Lighthouse → Performance + Best Practices, mobile or desktop).

Expected: Performance ≥ 95 (acceptance criterion). If lower, the regression is likely a new font request or unoptimized SVG; investigate before declaring done.

- [ ] **Step 4: Cross-reference acceptance criteria**

Open `docs/superpowers/specs/2026-05-09-notes-blog-and-first-post-design.md` and walk the Acceptance criteria section line by line. Every box should be checkable:

- [ ] `bun run build` produces `dist/` that renders three pages.
- [ ] Homepage byte-identical except for footer link.
- [ ] `/notes/` archive lists the first post.
- [ ] `/notes/audit-trail-moat/` post page renders.
- [ ] Frame, footer, type, color tokens shared with no visual regression.
- [ ] Lighthouse ≥ 95.
- [ ] Post reads in keynote register (user verifies).

- [ ] **Step 5: No commit needed**

Verification only. If anything failed, file as a fix task and re-run.

---

## Self-review notes

Spec coverage walked: every section in the spec has at least one task. Tech stack → Task 1 + 11. Architecture/file layout → Tasks 1, 2, 4, 5, 6, 7, 8. Frontmatter schema → Task 2. Build pipeline → Tasks 2-6. Post template → Task 4. Archive template → Task 5. Homepage integration → Task 8. First post content (full thesis arc) → Task 9. Cloudflare config → Task 10. CLAUDE.md update → Task 11. Acceptance criteria check → Task 12.

Type/name consistency: `Post`, `RenderedPost`, `parsePost`, `renderBody`, `renderPostPage`, `renderArchivePage`, `build`, `BuildOptions`, `Mad`, `MAD_LABEL`, `applyTemplate` are used consistently across Tasks 2–6. Template placeholder names (`title`, `dek`, `slug`, `mad`, `mad_label`, `date`, `body`, `rows`, `count`, `num`) are consistent between templates and renderer.

No placeholders left.
