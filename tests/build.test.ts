import { describe, expect, test } from "bun:test";
import { parsePost, renderBody, renderPostPage, RenderedPost } from "../build.ts";

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
