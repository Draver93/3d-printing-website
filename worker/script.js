/* Suntar-Plastic — request handler for Cloudflare Workers (free tier)
 * Paste this file into a dashboard-created Worker (Workers & Pages → Create → Worker → Edit code).
 *
 * Bindings required in the dashboard (Settings → Bindings):
 *   D1  → the "requests" database   (binding name: DB)
 * Runtime secrets (Settings → Variables and Secrets → Secret):
 *   TELEGRAM_TOKEN   bot token from @BotFather
 *   TELEGRAM_CHAT_ID your chat id (via @userinfobot)
 *   TURNSTILE_SECRET optional — only if you enable the CAPTCHA on the site
 *
 * Routes:
 *   POST   /api/request          new form submission (multipart: fields + files)
 *   GET    /api/track?id=SP-...  request status for the tracker page
 *   GET    /api/requests         admin list (Authorization: Bearer <API_TOKEN>)
 *   PATCH  /api/requests         update status (same auth)
 * There is NO file storage bucket: uploaded files are attached to your
 * Telegram chat directly.
 */
"use strict";

const ALLOWED_EXT = ["stl", "obj", "3mf", "step", "stp", "png", "jpg", "jpeg", "webp"];
const MAX_TOTAL = 25 * 1024 * 1024; // total upload cap
const MAX_FILES = 8;                // max files per request

// Spam guards
const RATE_WINDOW_SEC = 300;   // per-IP window
const RATE_MAX_PER_IP = 5;     // submissions per IP per window
const BURST_WINDOW_SEC = 60;   // global window
const BURST_MAX_GLOBAL = 30;   // submissions across all visitors per window

const STATUS_ALLOWED = ["received", "printing", "ready", "done", "cancelled", "declined"];

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET,POST,PATCH,OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  });
}

function esc(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function sanitizeName(name) {
  const base = String(name || "file").replace(/[\\/:\x00-\x1f]/g, "_").trim() || "file";
  return base.slice(0, 160);
}

function genId() {
  const d = new Date();
  const ym = String(d.getFullYear()).slice(2) + String(d.getMonth() + 1).padStart(2, "0");
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let suffix = "";
  for (let i = 0; i < 4; i++) suffix += chars[Math.floor(Math.random() * chars.length)];
  return `SP-${ym}-${suffix}`;
}

function clientIP(request) {
  return String(request.headers.get("CF-Connecting-IP") || request.headers.get("x-forwarded-for") || "").slice(0, 64);
}

async function verifyTurnstile(env, token) {
  const secret = env.TURNSTILE_SECRET;
  if (!secret) return true; // Turnstile not enabled on the server
  if (!token) return false;
  try {
    const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ secret, response: token }),
    });
    const data = await res.json().catch(() => ({}));
    return !!data.success;
  } catch (err) {
    return false;
  }
}

/* ---------- Telegram ---------- */

async function tgSendMessage(env, text) {
  const token = env.TELEGRAM_TOKEN;
  const chat = env.TELEGRAM_CHAT_ID;
  if (!token || !chat) return;
  try {
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chat, text, parse_mode: "HTML", disable_web_page_preview: true }),
    });
  } catch (err) {
    console.error("telegram message failed", err);
  }
}

async function tgSendDocument(env, bytes, name) {
  const token = env.TELEGRAM_TOKEN;
  const chat = env.TELEGRAM_CHAT_ID;
  if (!token || !chat) return;
  try {
    const fd = new FormData();
    fd.set("chat_id", chat);
    fd.set("document", new File([bytes], sanitizeName(name)));
    await fetch(`https://api.telegram.org/bot${token}/sendDocument`, { method: "POST", body: fd });
  } catch (err) {
    console.error("telegram file failed", err);
  }
}

/* ---------- Request submission ---------- */

async function handleRequest(request, env) {
  const ip = clientIP(request);
  const now = Math.floor(Date.now() / 1000);

  // Global burst guard — hard ceiling so a scripted flood can't spam Telegram
  const burst = await env.DB.prepare(
    "SELECT COUNT(*) AS c FROM requests WHERE created_at >= ?"
  ).bind((now - BURST_WINDOW_SEC) * 1000).first();
  if (burst && Number(burst.c) > BURST_MAX_GLOBAL) return json({ error: "toofast" }, 429);

  // Per-IP rate limit (counts every attempt)
  await env.DB.prepare("INSERT INTO rate (ip, req_at) VALUES (?, ?)").bind(ip || "unknown", now).run();
  await env.DB.prepare("DELETE FROM rate WHERE req_at < ?").bind(now - RATE_WINDOW_SEC).run();
  const mine = await env.DB.prepare(
    "SELECT COUNT(*) AS c FROM rate WHERE ip = ? AND req_at >= ?"
  ).bind(ip || "unknown", now - RATE_WINDOW_SEC).first();
  if (mine && Number(mine.c) > RATE_MAX_PER_IP) return json({ error: "toofast" }, 429);

  const fb = await request.formData();

  // Honeypot — real humans never see this field
  if (fb.get("_honey")) return json({ error: "spam" }, 400);

  // Optional Turnstile CAPTCHA
  if (!(await verifyTurnstile(env, String(fb.get("cf-turnstile-response") || "")))) {
    return json({ error: "captcha" }, 403);
  }

  const name = String(fb.get("name") || "").trim();
  const contact = String(fb.get("contact") || "").trim();
  if (!name || !contact) return json({ error: "required" }, 422);

  const purpose = String(fb.get("purpose") || "Custom request").slice(0, 200);
  const item = String(fb.get("item") || "").slice(0, 200);
  const price = Number(fb.get("price")) || 0;
  const message = String(fb.get("message") || "").slice(0, 4000);

  // Collect + validate files
  const files = [];
  let total = 0;
  for (const [, value] of fb.entries()) {
    if (typeof value !== "object" || value === null || typeof value.arrayBuffer !== "function") continue;
    const ext = String(value.name || "").split(".").pop().toLowerCase();
    if (!ALLOWED_EXT.includes(ext)) return json({ error: "type" }, 422);
    if (total + value.size > MAX_TOTAL) return json({ error: "size" }, 422);
    if (files.length >= MAX_FILES) return json({ error: "count" }, 422);
    files.push({ buf: await value.arrayBuffer(), name: sanitizeName(value.name) });
    total += value.size;
  }

  const id = genId();
  const created = Date.now();
  const names = files.map((f) => f.name);

  await env.DB.prepare(
    `INSERT INTO requests (id, created_at, updated_at, purpose, item, price, name, contact, message, status, note, files)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'received', '', ?)`
  )
    .bind(id, created, created, purpose, item, price, name, contact, message, JSON.stringify(names))
    .run();

  // Notify owner: text card, then each file as an attachment
  const lines = [
    "🖨 <b>" + esc(purpose) + "</b>",
    `ID заявки: <code>${esc(id)}</code>`,
    item ? "Модель: " + esc(item) : "",
    price ? "Цена: " + price + " ₽" : "",
    "Имя: " + esc(name),
    "Контакт: " + esc(contact),
    message ? "Сообщение:\n" + esc(message) : "",
    names.length ? "Файлы: " + names.map(esc).join(", ") : "",
  ].filter(Boolean).join("\n");

  await tgSendMessage(env, lines);
  for (const f of files) await tgSendDocument(env, f.buf, f.name);

  return json({ ok: true, id, requestedAt: created });
}

/* ---------- Tracking ---------- */

async function handleTrack(request, env) {
  const url = new URL(request.url);
  const id = (url.searchParams.get("id") || "").trim().toUpperCase();
  if (!id) return json({ found: false });

  const row = await env.DB.prepare(
    "SELECT id, status, note, created_at, updated_at, purpose, item FROM requests WHERE id = ?"
  ).bind(id).first();

  if (!row) return json({ found: false });
  return json({ found: true, ...row });
}

/* ---------- Admin ---------- */

function isAuthed(env, request) {
  const token = env.API_TOKEN;
  return token && request.headers.get("Authorization") === "Bearer " + token;
}

async function handleRequests(request, env) {
  if (!isAuthed(env, request)) return json({ error: "unauthorized" }, 401);

  if (request.method === "GET") {
    const { results } = await env.DB.prepare(
      "SELECT id, status, note, created_at, updated_at, purpose, item, price, name, contact, message, files FROM requests ORDER BY created_at DESC LIMIT 200"
    ).all();
    return json({ requests: results });
  }

  if (request.method === "PATCH") {
    const body = await request.json().catch(() => ({}));
    const id = String(body.id || "").trim().toUpperCase();
    const status = String(body.status || "");
    const note = String(body.note || "").slice(0, 1000);
    if (!id || !STATUS_ALLOWED.includes(status)) return json({ error: "badstatus" }, 422);
    await env.DB.prepare("UPDATE requests SET status = ?, note = ?, updated_at = ? WHERE id = ?")
      .bind(status, note, Date.now(), id)
      .run();
    return json({ ok: true });
  }

  return json({ error: "method" }, 405);
}

/* ---------- Router ---------- */

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;

    if (request.method === "OPTIONS") return json({ ok: true }, 204);

    if (path === "/api/request" && request.method === "POST") return handleRequest(request, env);
    if (path === "/api/track" && request.method === "GET") return handleTrack(request, env);
    if (path === "/api/requests" && (request.method === "GET" || request.method === "PATCH")) {
      return handleRequests(request, env);
    }

    return json({ error: "notfound" }, 404);
  },
};