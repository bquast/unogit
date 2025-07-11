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

export default {
  async fetch(request, env, ctx) {
    if (request.method !== "POST") {
      return new Response("Method Not Allowed", { status: 405 });
    }

    const contentType = request.headers.get("content-type") || "";
    if (!contentType.includes("application/json")) {
      return new Response("Unsupported Media Type", { status: 415 });
    }

    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return new Response("Missing fields", { status: 400 });
    }

    const userRaw = await env.KV_USERS.get(email);
    if (!userRaw) {
      return new Response("Invalid credentials", { status: 403 });
    }

    const user = JSON.parse(userRaw);
    const hashHex = await sha256(password);

    if (hashHex !== user.passwordHash) {
      return new Response("Invalid credentials", { status: 403 });
    }

    const token = `${user.userId}:${hashHex}`;
    return jsonResponse({ token });
  }
};