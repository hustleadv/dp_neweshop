/* ==========================================================================
   DP AGRON - /api/advisor  (Vercel Serverless Function, Node.js)
   POST { query: string, history?: [{role:"user"|"model", text}], session?: {...} }
   -> { reply_html, product_ids, action, followups, needs_clarification, source }
   The browser falls back to the local rule engine on any non-200 response.
   ========================================================================== */

const { getCatalog } = require("./_lib/catalog");
const { buildSystemPrompt, RESPONSE_SCHEMA } = require("./_lib/prompt");

const MAX_QUERY_CHARS = 500;
const MAX_HISTORY_TURNS = 8;
const GEMINI_TIMEOUT_MS = 11000;

// Best-effort per-instance rate limit (20 req / minute / IP)
const RATE_LIMIT = 20;
const RATE_WINDOW_MS = 60 * 1000;
const hits = new Map();

function rateLimited(ip) {
  const now = Date.now();
  const arr = (hits.get(ip) || []).filter(t => now - t < RATE_WINDOW_MS);
  arr.push(now);
  hits.set(ip, arr);
  if (hits.size > 5000) hits.clear();
  return arr.length > RATE_LIMIT;
}

function sendJson(res, status, body) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.end(JSON.stringify(body));
}

async function readBody(req) {
  if (req.body && typeof req.body === "object") return req.body; // Vercel pre-parses JSON
  if (typeof req.body === "string") return JSON.parse(req.body || "{}");
  const chunks = [];
  for await (const c of req) chunks.push(c);
  const raw = Buffer.concat(chunks).toString("utf8");
  return raw ? JSON.parse(raw) : {};
}

function sanitizeSession(s) {
  if (!s || typeof s !== "object") return {};
  const num = v => (Number.isFinite(Number(v)) && Number(v) > 0 && Number(v) < 100000 ? Math.round(Number(v)) : null);
  return {
    treesCount: num(s.treesCount),
    acresCount: num(s.acresCount),
    workersCount: num(s.workersCount),
    hasGenerator: !!s.hasGenerator,
    hasBattery: !!s.hasBattery,
    hasNets: !!s.hasNets
  };
}

module.exports = async function handler(req, res) {
  if (req.method !== "POST") return sendJson(res, 405, { error: "method_not_allowed" });

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return sendJson(res, 503, { error: "llm_not_configured" });

  const ip = (req.headers["x-forwarded-for"] || "").split(",")[0].trim() || (req.socket && req.socket.remoteAddress) || "unknown";
  if (rateLimited(ip)) return sendJson(res, 429, { error: "rate_limited" });

  let body;
  try {
    body = await readBody(req);
  } catch (e) {
    return sendJson(res, 400, { error: "invalid_json" });
  }

  const query = String(body.query || "").trim().slice(0, MAX_QUERY_CHARS);
  if (!query) return sendJson(res, 400, { error: "empty_query" });

  const history = (Array.isArray(body.history) ? body.history : [])
    .slice(-MAX_HISTORY_TURNS)
    .filter(h => h && (h.role === "user" || h.role === "model") && typeof h.text === "string")
    .map(h => ({ role: h.role, parts: [{ text: h.text.slice(0, 800) }] }));

  try {
    const catalog = await getCatalog();
    const systemPrompt = buildSystemPrompt({
      products: catalog.products,
      faqs: catalog.faqs,
      session: sanitizeSession(body.session)
    });

    const model = process.env.GEMINI_MODEL || "gemini-2.5-flash";
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), GEMINI_TIMEOUT_MS);

    let gRes;
    try {
      gRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
        method: "POST",
        signal: ctrl.signal,
        headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: systemPrompt }] },
          contents: [...history, { role: "user", parts: [{ text: query }] }],
          generationConfig: {
            temperature: 0.4,
            maxOutputTokens: 1024,
            responseMimeType: "application/json",
            responseSchema: RESPONSE_SCHEMA,
            thinkingConfig: { thinkingBudget: 0 } // speed: no hidden reasoning tokens
          }
        })
      });
    } finally {
      clearTimeout(timer);
    }

    if (!gRes.ok) {
      const detail = (await gRes.text()).slice(0, 300);
      console.error("Gemini error", gRes.status, detail);
      return sendJson(res, 502, { error: "llm_error", status: gRes.status });
    }

    const gJson = await gRes.json();
    const text = gJson?.candidates?.[0]?.content?.parts?.map(p => p.text || "").join("") || "";
    let out;
    try {
      out = JSON.parse(text);
    } catch (e) {
      return sendJson(res, 502, { error: "llm_bad_json" });
    }

    // Guardrails: only known product IDs, bounded lists, valid action
    const validIds = new Set(catalog.products.map(p => p.id));
    const productIds = (Array.isArray(out.product_ids) ? out.product_ids : [])
      .map(String).filter(id => validIds.has(id)).slice(0, 3);

    const allowedActions = ["none", "bundle", "calendar", "b2b"];
    const action = out.action && allowedActions.includes(out.action.type) ? out.action : { type: "none" };
    if (action.type === "bundle" && !(Number(action.trees) > 0)) action.trees = null;

    return sendJson(res, 200, {
      reply_html: String(out.reply_html || "").slice(0, 2500),
      product_ids: productIds,
      action,
      followups: (Array.isArray(out.followups) ? out.followups : []).map(String).map(s => s.slice(0, 60)).slice(0, 3),
      needs_clarification: !!out.needs_clarification,
      source: "llm"
    });
  } catch (err) {
    const aborted = err && err.name === "AbortError";
    console.error("Advisor error", aborted ? "timeout" : err);
    return sendJson(res, aborted ? 504 : 500, { error: aborted ? "llm_timeout" : "server_error" });
  }
};
