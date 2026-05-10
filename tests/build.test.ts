import { describe, expect, test } from "bun:test";
import {
  parsePost,
  renderBody,
  renderPostPage,
  RenderedPost,
  renderArchivePage,
  build,
} from "../build.ts";
import { rm, readdir, readFile as fsReadFile } from "node:fs/promises";
import { existsSync } from "node:fs";

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
