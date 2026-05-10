import matter from "gray-matter";
import { readFile, mkdir, writeFile, copyFile } from "node:fs/promises";
import { dirname, join, basename } from "node:path";
import { existsSync } from "node:fs";
import { marked } from "marked";

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

marked.setOptions({
  gfm: true,
  breaks: false,
});

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
    date: typeof data.date === "string" ? data.date : data.date.toISOString().split("T")[0],
    body: content.trim(),
  };
}

export function renderBody(markdown: string): string {
  return marked.parse(markdown, { async: false }) as string;
}

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
