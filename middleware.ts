// Vercel Routing Middleware: serve markdown versions of pages to agents that
// ask for text/markdown. Runs before the static filesystem, so it works for "/".
export const config = { matcher: ["/"] };

const MARKDOWN: Record<string, string> = { "/": "/index.md" };

export default function middleware(request: Request) {
  const accept = request.headers.get("accept") || "";
  const url = new URL(request.url);
  const target = MARKDOWN[url.pathname];
  if (!target || !accept.includes("text/markdown")) return;
  return new Response(null, {
    headers: { "x-middleware-rewrite": new URL(target, url).toString(), Vary: "Accept" },
  });
}
