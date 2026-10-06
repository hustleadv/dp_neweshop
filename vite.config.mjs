/* ==========================================================================
   Vite dev config: serves /api/advisor locally using the same handler that
   runs on Vercel, so `npm run dev` works without the Vercel CLI.
   ========================================================================== */
import { defineConfig, loadEnv } from "vite";
import { createRequire } from "module";

const require = createRequire(import.meta.url);

function localApiPlugin() {
  return {
    name: "dp-agron-local-api",
    configureServer(server) {
      server.middlewares.use("/api/advisor", async (req, res) => {
        try {
          // Re-require on each call so edits to api/ apply without restarting Vite
          for (const key of Object.keys(require.cache)) {
            if (key.includes(`${"api"}`) && (key.endsWith("advisor.js") || key.includes("_lib"))) delete require.cache[key];
          }
          const handler = require("./api/advisor.js");
          await handler(req, res);
        } catch (err) {
          console.error("[local api] advisor failed:", err);
          res.statusCode = 500;
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify({ error: "local_api_error" }));
        }
      });
    }
  };
}

export default defineConfig(({ mode }) => {
  // Expose .env.local values (incl. non-VITE_ ones like GEMINI_API_KEY) to the local API only
  const env = loadEnv(mode, process.cwd(), "");
  for (const [k, v] of Object.entries(env)) {
    if (process.env[k] === undefined) process.env[k] = v;
  }
  return {
    plugins: [localApiPlugin()]
  };
});
