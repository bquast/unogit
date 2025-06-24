import { serveStatic } from "wrangler";

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // Route: /api/...
    if (url.pathname.startsWith("/api/")) {
      return new Response("API route not found", { status: 404 });
    }

    // Fallback: serve static assets
    return serveStatic(request, env, ctx);
  },
};