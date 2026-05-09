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
