// End-to-end check against a tiny fake Supabase (auth + PostgREST), since CI/sandboxes often can't reach the real one.
// Run:  node tests/e2e-mock.mjs        (starts `next dev` on :3100 itself; needs Chromium via Playwright)
import http from "node:http";
import { spawn } from "node:child_process";
import { chromium } from "playwright";

const MOCK_PORT = 54321;
const APP = "http://localhost:3100";
const now = Date.now();
const iso = (ms) => new Date(ms).toISOString();

const words = [
  { id: "w1", text: "serendipity", translation: "serendipia", source_lang: "en", context: "She felt serendipity at the door!", url: "https://x.com/a",
    definition: { phonetic: "/ˌsɛɹ.ənˈdɪp.ɪ.ti/", pos: "noun", meaning: "Finding something good by chance." },
    box: 0, due: iso(now - 1000), reps: 0, lapses: 0, created_at: iso(now - 5000), updated_at: iso(now - 5000), deleted_at: null },
  { id: "w2", text: "ubiquitous", translation: "omnipresente", source_lang: "en", context: null, url: null, definition: null,
    box: 1, due: iso(now - 2000), reps: 2, lapses: 0, created_at: iso(now - 9000), updated_at: iso(now - 9000), deleted_at: null },
];
const logs = [{ reviewed_at: iso(now - 3600_000) }, { reviewed_at: iso(now - 86_400_000) }];
const writes = [];

const user = { id: "u1", aud: "authenticated", role: "authenticated", email: "test@example.com", app_metadata: {}, user_metadata: {}, created_at: iso(now) };
const b64 = (o) => Buffer.from(JSON.stringify(o)).toString("base64url");
const jwt = `${b64({ alg: "HS256", typ: "JWT" })}.${b64({ sub: "u1", role: "authenticated", exp: Math.floor(now / 1000) + 3600, aud: "authenticated" })}.sig`;

const mock = http.createServer((req, res) => {
  const url = new URL(req.url, "http://x");
  let body = "";
  req.on("data", (c) => (body += c));
  req.on("end", () => {
    res.setHeader("access-control-allow-origin", req.headers.origin ?? "*");
    res.setHeader("access-control-allow-headers", "*");
    res.setHeader("access-control-allow-methods", "*");
    res.setHeader("access-control-allow-credentials", "true");
    res.setHeader("access-control-expose-headers", "content-range");
    if (req.method === "OPTIONS") return res.writeHead(204).end();
    if (url.pathname === "/auth/v1/user") return res.writeHead(200, { "content-type": "application/json" }).end(JSON.stringify(user));
    const table = url.pathname.startsWith("/rest/v1/") ? url.pathname.slice(9) : null;
    if (!table) return res.writeHead(404).end("{}");
    if (req.method === "GET" || req.method === "HEAD") {
      let rows = table === "words" ? words.filter((w) => !w.deleted_at) : logs;
      // PostgREST sorts server-side; emulate the orderings the app asks for.
      if (table === "words" && url.searchParams.get("order") === "due.asc") rows = [...rows].sort((a, b) => new Date(a.due) - new Date(b.due));
      res.setHeader("content-range", `0-${Math.max(rows.length - 1, 0)}/${rows.length}`);
      res.setHeader("content-type", url.pathname.endsWith("export") ? "text/csv" : "application/json");
      return res.writeHead(200).end(req.method === "HEAD" ? undefined : JSON.stringify(rows));
    }
    writes.push({ method: req.method, table, query: url.search, body: body ? JSON.parse(body) : null });
    if (req.method === "PATCH" && table === "words") {
      const id = new URLSearchParams(url.search).get("id")?.replace("eq.", "");
      Object.assign(words.find((w) => w.id === id) ?? {}, JSON.parse(body));
    }
    return res.writeHead(204).end();
  });
}).listen(MOCK_PORT);

const env = { ...process.env, NEXT_PUBLIC_SUPABASE_URL: `http://127.0.0.1:${MOCK_PORT}`, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_mock" };
const next = spawn("npx", ["next", "dev", "-p", "3100"], { env, stdio: "ignore" });

let failed = 0;
const check = (name, ok, extra = "") => { console.log(`${ok ? "PASS" : "FAIL"}  ${name} ${extra}`); if (!ok) failed++; };

try {
  for (let i = 0; i < 60; i++) { try { await fetch(`${APP}/login`); break; } catch { await new Promise((r) => setTimeout(r, 1000)); } }

  const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" });
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  page.setDefaultTimeout(60000);

  // 1) signed-out: / redirects to /login, login form is there
  await page.goto(`${APP}/`);
  check("signed-out / → /login", page.url().endsWith("/login"));
  check("login has Google button + email form", (await page.locator("text=Continuar con Google").count()) === 1 && (await page.locator("input[type=email]").count()) === 1);
  await page.screenshot({ path: "e2e-login.png" });

  // 2) fake a session cookie (what @supabase/ssr stores after login)
  const session = { access_token: jwt, refresh_token: "r", expires_in: 3600, expires_at: Math.floor(now / 1000) + 3600, token_type: "bearer", user };
  await ctx.addCookies([{ name: "sb-127-auth-token", value: "base64-" + Buffer.from(JSON.stringify(session)).toString("base64url"), url: APP }]);

  // 3) dashboard
  await page.goto(`${APP}/`);
  await page.waitForSelector(".stat");
  const stats = await page.locator(".stat").allInnerTexts();
  check("dashboard shows due / streak / today / total", stats.length === 4, JSON.stringify(stats.map((s) => s.replace(/\n/g, " "))));
  check("dashboard lists latest words", (await page.locator(".list .en").allInnerTexts()).includes("serendipity"));
  await page.screenshot({ path: "e2e-dashboard.png" });

  // 4) signed-in user is bounced away from /login
  await page.goto(`${APP}/login`);
  check("signed-in /login → /", new URL(page.url()).pathname === "/");

  // 5) review flow
  await page.goto(`${APP}/review`);
  await page.waitForSelector(".card .front");
  check("review shows first card (most overdue first)", (await page.textContent(".card .front")) === "ubiquitous");
  await page.keyboard.press("Space");
  check("space reveals translation", (await page.textContent(".card .back")) === "omnipresente");
  await page.keyboard.press("ArrowRight");
  await page.waitForFunction(() => document.querySelector(".card .front")?.textContent === "serendipity");
  const upd = writes.find((w) => w.method === "PATCH" && w.table === "words");
  check("answer updates the word (box 1→2, due ahead)", upd?.body.box === 2 && new Date(upd.body.due).getTime() > now + 86_400_000, JSON.stringify(upd?.body));
  check("answer inserts a review_log", writes.some((w) => w.method === "POST" && w.table === "review_logs" && w.body.known === true && w.body.word_id === "w2"));
  await page.keyboard.press("Space");
  check("card shows definition and highlighted context", (await page.locator(".card .def").count()) === 1 && (await page.locator(".card mark").innerText()) === "serendipity");
  await page.screenshot({ path: "e2e-review.png" });
  await page.keyboard.press("ArrowLeft"); // missed: card must come back
  await page.waitForTimeout(800);
  check("missed card returns to the queue", (await page.textContent(".card .front")) === "serendipity");

  // 6) library: search + soft delete + export
  await page.goto(`${APP}/library`);
  await page.waitForSelector(".list li");
  await page.fill("input[type=search]", "omni");
  check("library search filters", (await page.locator(".list li").count()) === 1);
  await page.fill("input[type=search]", "");
  page.once("dialog", (d) => d.accept());
  await page.locator(".list li", { hasText: "ubiquitous" }).locator("button.icon").click();
  await page.waitForFunction(() => document.querySelectorAll(".list li").length === 1);
  const del = writes.find((w) => w.method === "PATCH" && w.body?.deleted_at);
  check("delete is a soft delete (deleted_at set)", !!del && del.query.includes("id=eq.w2"), JSON.stringify(del?.body));
  const csv = await (await ctx.request.get(`${APP}/library/export`)).text();
  check("CSV export has BOM and rows", csv.startsWith("﻿") && csv.includes('"serendipity","serendipia"'));

  await browser.close();
} catch (e) {
  console.error("ERROR", e);
  failed++;
} finally {
  next.kill("SIGTERM");
  mock.close();
  process.exit(failed ? 1 : 0);
}
