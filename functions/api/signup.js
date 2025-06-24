import { createHash } from "@cfworker/crypto";

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

    if (!email || !password || !email.includes("@") || password.length < 6) {
      return new Response("Invalid input", { status: 400 });
    }

    const existing = await env.KV_USERS.get(email);
    if (existing) {
      return new Response("User already exists", { status: 409 });
    }

    const hashBuffer = await createHash("SHA-256").digest(password);
    const hashHex = Array.from(new Uint8Array(hashBuffer))
      .map(b => b.toString(16).padStart(2, "0"))
      .join("");

    const userId = crypto.randomUUID();

    await env.KV_USERS.put(email, JSON.stringify({
      userId,
      passwordHash: hashHex
    }));

    return new Response("Signup successful", { status: 200 });
  }
};