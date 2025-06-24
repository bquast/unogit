import signup from "./signup.js";
import login from "./login.js";
import userRepo from "./user-repo.js";

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;

    if (path === "/api/signup") {
      return signup.fetch(request, env, ctx);
    }

    if (path === "/api/login") {
      return login.fetch(request, env, ctx);
    }

    // Match /api/:user/:repo
    const match = path.match(/^\/api\/([^/]+)\/([^/]+)$/);
    if (match) {
      return userRepo.fetch(request, env, ctx);
    }

    return new Response("Not Found", { status: 404 });
  }
};