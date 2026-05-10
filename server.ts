import { join } from "node:path";

const root = process.argv[2] ?? "dist";
const port = Number(process.env.PORT ?? 3000);

Bun.serve({
  port,
  async fetch(req) {
    const url = new URL(req.url);
    let pathname = decodeURIComponent(url.pathname);

    if (pathname.endsWith("/")) {
      pathname += "index.html";
    }

    const filePath = join(root, pathname);
    const file = Bun.file(filePath);

    if (await file.exists()) {
      return new Response(file);
    }

    const fallback = Bun.file(join(root, pathname, "index.html"));
    if (await fallback.exists()) {
      return new Response(fallback);
    }

    return new Response("Not Found", { status: 404 });
  },
});

console.log(`Serving ${root}/ at http://localhost:${port}/`);
