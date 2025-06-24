async function sha256(text) {
  const data = new TextEncoder().encode(text);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, "0"))
    .join("");
}

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json"
    }
  });
}

async function authenticate(request, env) {
  const authHeader = request.headers.get("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) return null;

  const token = authHeader.slice(7);
  const [userId, hashHex] = token.split(":");
  if (!userId || !hashHex) return null;

  const keys = await env.KV_USERS.list();
  for (const key of keys.keys) {
    const record = await env.KV_USERS.get(key.name);
    if (!record) continue;
    const parsed = JSON.parse(record);
    if (parsed.userId === userId && parsed.passwordHash === hashHex) {
      return { userId, email: key.name };
    }
  }

  return null;
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const pathMatch = url.pathname.match(/^\/api\/([^/]+)\/([^/]+)$/);
    if (!pathMatch) return new Response("Not Found", { status: 404 });

    const [_, user, repo] = pathMatch;
    const repoKey = `${user}:${repo}`;

    if (request.method === "POST") {
      const authed = await authenticate(request, env);
      if (!authed || authed.email !== user) {
        return new Response("Unauthorized", { status: 401 });
      }

      const contentType = request.headers.get("content-type") || "";
      if (!contentType.includes("application/json")) {
        return new Response("Unsupported Media Type", { status: 415 });
      }

      const body = await request.json();
      const { content } = body;
      if (!content || typeof content !== "string") {
        return new Response("Missing file content", { status: 400 });
      }

      const metaRaw = await env.KV_REPOS.get(repoKey);
      const meta = metaRaw ? JSON.parse(metaRaw) : { latest: 0, created: Date.now() };

      const nextVersion = meta.latest + 1;
      await env.KV_VERSIONS.put(`${repoKey}:${nextVersion}`, content);

      meta.latest = nextVersion;
      meta.updated = Date.now();
      await env.KV_REPOS.put(repoKey, JSON.stringify(meta));

      return jsonResponse({ success: true, version: nextVersion });
    }

    if (request.method === "GET") {
      if (url.searchParams.has("meta")) {
        const metaRaw = await env.KV_REPOS.get(repoKey);
        if (!metaRaw) return new Response("Not Found", { status: 404 });
        return jsonResponse(JSON.parse(metaRaw));
      }

      const version = url.searchParams.get("version");
      const metaRaw = await env.KV_REPOS.get(repoKey);
      if (!metaRaw) return new Response("Not Found", { status: 404 });

      const meta = JSON.parse(metaRaw);
      const targetVersion = version ? parseInt(version, 10) : meta.latest;

      if (!targetVersion || targetVersion < 1 || targetVersion > meta.latest) {
        return new Response("Invalid version", { status: 400 });
      }

      const content = await env.KV_VERSIONS.get(`${repoKey}:${targetVersion}`);
      if (!content) return new Response("Version not found", { status: 404 });

      return new Response(content, {
        status: 200,
        headers: {
          "Content-Type": "text/plain",
          "X-Version": String(targetVersion)
        }
      });
    }

    return new Response("Method Not Allowed", { status: 405 });
  }
};