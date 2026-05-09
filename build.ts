import matter from "gray-matter";
import { readFile } from "node:fs/promises";
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

export const MAD_LABEL: Record<Mad, string> = {
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
