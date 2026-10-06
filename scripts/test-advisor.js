/**
 * DP AGRON - Advisor regression tests
 * Usage:
 *   node scripts/test-advisor.js                       (calls the handler directly, uses .env.local)
 *   node scripts/test-advisor.js https://site.vercel.app (calls a deployed /api/advisor)
 */
const fs = require("fs");
const path = require("path");

for (const envFile of [".env.local", ".env"]) {
  const p = path.join(__dirname, "..", envFile);
  if (!fs.existsSync(p)) continue;
  for (const line of fs.readFileSync(p, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}

const baseUrl = process.argv[2];
const tests = JSON.parse(fs.readFileSync(path.join(__dirname, "advisor-tests.json"), "utf8"));

async function callDirect(query) {
  const handler = require("../api/advisor.js");
  return new Promise((resolve) => {
    const res = {
      statusCode: 200, headers: {},
      setHeader(k, v) { this.headers[k] = v; },
      end(body) { resolve({ status: this.statusCode, body: JSON.parse(body) }); }
    };
    handler({ method: "POST", headers: {}, socket: {}, body: { query } }, res);
  });
}

async function callRemote(query) {
  const r = await fetch(`${baseUrl.replace(/\/$/, "")}/api/advisor`, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ query })
  });
  return { status: r.status, body: await r.json() };
}

(async () => {
  let pass = 0;
  for (const t of tests) {
    const started = Date.now();
    const { status, body } = baseUrl ? await callRemote(t.q) : await callDirect(t.q);
    const ms = Date.now() - started;
    const errs = [];
    if (status !== 200) errs.push(`HTTP ${status} ${body.error || ""}`);
    else {
      const a = body.action || {};
      const e = t.expect;
      if (e.action && a.type !== e.action) errs.push(`action=${a.type} (expected ${e.action})`);
      if (e.anyAction && !e.anyAction.includes(a.type)) errs.push(`action=${a.type} (expected one of ${e.anyAction})`);
      if (e.topic && a.topic !== e.topic) errs.push(`topic=${a.topic} (expected ${e.topic})`);
      if (e.trees && Number(a.trees) !== e.trees) errs.push(`trees=${a.trees} (expected ${e.trees})`);
      if (e.minProducts && body.product_ids.length < e.minProducts) errs.push(`products=${body.product_ids.length}`);
      if (e.maxProducts != null && body.product_ids.length > e.maxProducts) errs.push(`products=${body.product_ids.length}`);
      if (/€|ευρώ/i.test(body.reply_html)) errs.push("mentions a price in text");
    }
    const ok = errs.length === 0;
    if (ok) pass++;
    console.log(`${ok ? "PASS" : "FAIL"}  ${String(ms).padStart(5)}ms  ${t.q}${ok ? "" : "\n        -> " + errs.join("; ")}`);
    if (status === 503) { console.log("\nGEMINI_API_KEY is not set in .env.local - stopping."); process.exit(1); }
    await new Promise(r => setTimeout(r, 400)); // stay under free-tier rate limits
  }
  console.log(`\n${pass}/${tests.length} passed`);
  process.exit(pass === tests.length ? 0 : 1);
})();
