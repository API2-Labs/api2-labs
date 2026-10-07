const JSON_HEADERS = {
  "content-type": "application/json; charset=utf-8",
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS",
  "access-control-allow-headers": "*",
  "cache-control": "no-store"
};

const MAX_ECHO_BODY = 64 * 1024;

function noBodyStatus(status) {
  return status === 204 || status === 205 || status === 304;
}

function json(data, status = 200, extraHeaders = {}) {
  const body = noBodyStatus(status) ? null : JSON.stringify(data, null, 2);
  return new Response(body, {
    status,
    headers: { ...JSON_HEADERS, ...extraHeaders }
  });
}

function clampInt(value, fallback, min, max) {
  const n = Number.parseInt(value, 10);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback;
}

function headerObject(headers) {
  return Object.fromEntries([...headers.entries()].sort(([a], [b]) => a.localeCompare(b)));
}

async function readBody(request) {
  if (request.method === "GET" || request.method === "HEAD") return null;

  const contentLength = Number.parseInt(request.headers.get("content-length") || "0", 10);
  if (contentLength > MAX_ECHO_BODY) {
    return { truncated: true, reason: "Body exceeds API2 Mock's 64 KiB echo limit." };
  }

  const reader = request.body?.getReader();
  if (!reader) return null;

  let received = 0;
  const chunks = [];

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    received += value.byteLength;

    if (received > MAX_ECHO_BODY) {
      await reader.cancel();
      return { truncated: true, reason: "Body exceeds API2 Mock's 64 KiB echo limit." };
    }
    chunks.push(value);
  }

  if (!chunks.length) return null;

  const all = new Uint8Array(received);
  let offset = 0;
  for (const chunk of chunks) {
    all.set(chunk, offset);
    offset += chunk.byteLength;
  }

  const text = new TextDecoder().decode(all);
  const type = request.headers.get("content-type") || "";

  if (type.includes("application/json")) {
    try {
      return JSON.parse(text);
    } catch {
      return { invalid_json: true, raw: text };
    }
  }

  return text;
}

async function handleApi(request) {
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: JSON_HEADERS });
  }

  const url = new URL(request.url);
  const path = url.pathname.replace(/\/+$/, "") || "/";

  if (path === "/api") {
    return json({
      name: "API2 Mock",
      description: "Stateless HTTP endpoints for prototypes and integration tests.",
      endpoints: [
        "ANY /api/echo",
        "GET /api/mock?status=200&body={...}",
        "GET /api/status/:code",
        "GET /api/uuid",
        "GET /api/time",
        "GET /api/random?count=5&max=100"
      ]
    });
  }

  if (path === "/api/echo") {
    return json({
      method: request.method,
      path: url.pathname,
      query: Object.fromEntries(url.searchParams.entries()),
      headers: headerObject(request.headers),
      body: await readBody(request),
      timestamp: new Date().toISOString()
    });
  }

  if (path === "/api/mock") {
    const status = clampInt(url.searchParams.get("status"), 200, 200, 599);
    const body = url.searchParams.get("body") ?? '{"ok":true}';
    const contentType = url.searchParams.get("content_type") || "application/json; charset=utf-8";

    if (noBodyStatus(status)) {
      return new Response(null, {
        status,
        headers: {
          "access-control-allow-origin": "*",
          "cache-control": "no-store"
        }
      });
    }

    if (contentType.startsWith("application/json")) {
      try {
        return new Response(JSON.stringify(JSON.parse(body), null, 2), {
          status,
          headers: { ...JSON_HEADERS, "content-type": contentType }
        });
      } catch {
        return json({
          error: "Invalid JSON body",
          hint: "URL-encode a valid JSON value in the body query parameter."
        }, 400);
      }
    }

    return new Response(body, {
      status,
      headers: {
        "content-type": contentType,
        "access-control-allow-origin": "*",
        "cache-control": "no-store"
      }
    });
  }

  if (path.startsWith("/api/status/")) {
    const status = clampInt(path.slice("/api/status/".length), 200, 200, 599);

    if (noBodyStatus(status)) {
      return new Response(null, {
        status,
        headers: {
          "access-control-allow-origin": "*",
          "cache-control": "no-store"
        }
      });
    }

    return json({
      status,
      ok: status >= 200 && status < 300,
      message: `API2 Mock returned HTTP ${status}`
    }, status);
  }

  if (path === "/api/uuid") {
    return json({ uuid: crypto.randomUUID() });
  }

  if (path === "/api/time") {
    const now = new Date();
    return json({
      iso: now.toISOString(),
      unix: Math.floor(now.getTime() / 1000),
      unix_ms: now.getTime()
    });
  }

  if (path === "/api/random") {
    const count = clampInt(url.searchParams.get("count"), 5, 1, 100);
    const max = clampInt(url.searchParams.get("max"), 100, 1, 1_000_000);
    const values = Array.from({ length: count }, () => Math.floor(Math.random() * max));
    return json({ count, max, values });
  }

  return json({
    error: "Not found",
    path: url.pathname,
    docs: "/#endpoints"
  }, 404);
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/api" || url.pathname.startsWith("/api/")) {
      return handleApi(request);
    }

    return env.ASSETS.fetch(request);
  }
};
