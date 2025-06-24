import signup from "./signup.js";
import login from "./login.js";
import userRepo from "./user-repo.js";

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;

    // Handle API routes
    if (path === "/api/signup") return signup.fetch(request, env, ctx);
    if (path === "/api/login") return login.fetch(request, env, ctx);
    if (/^\/api\/[^/]+\/[^/]+$/.test(path)) return userRepo.fetch(request, env, ctx);

    // Redirect / to /index.html
    if (path === "/") {
      return Response.redirect(url.origin + "/index.html", 302);
    }

    // Serve static files from /public/
    try {
      const name = path === "/" ? "index.html" : path.slice(1);
      const asset = await env.ASSETS.fetch(new Request(`https://fakehost/${name}`, request));
      if (asset.status === 404) return new Response("Not Found", { status: 404 });
      return asset;
    } catch (err) {
      return new Response("Error serving static asset", { status: 500 });
    }
  }
};