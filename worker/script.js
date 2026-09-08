/* Suntar-Plastic — request handler for Cloudflare Workers (free tier)
 * Paste this file into your dashboard-created Worker (Edit code → Deploy).
 *
 * Secrets in Settings → Variables and Secrets (type: Secret):
 *   TELEGRAM_TOKEN   call bot token from @BotFather
 *   TELEGRAM_CHAT_ID call chat id (via @userinfobot)
 *   TURNSTILE_SECRET optional — only if the CAPTCHA is enabled on the site
 *
 * This worker has NO database: it validates the form and forwards it to
 * your Telegram chat (files attached directly). Honeypot + optional
 * Turnstile handle spam.
 */
"use strict";

const ALLOWED_EXT = ["stl", "obj", "3mf", "step", "stp", "png", "jpg", "jpeg", "webp"];
const MAX_TOTAL = 25 * 1024 * 1024; // total upload cap
const MAX_FILES = 8;                // max files per request

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

async function tgSendMessage(env, text) {
  const res = await fetch(`https://api.telegram.org/bot${env.TELEGRAM_TOKEN}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: env.TELEGRAM_CHAT_ID, text, parse_mode: "HTML", disable_web_page_preview: true }),
  });
  return res.ok;
}

async function tgSendDocument(env, bytes, name) {
  const fd = new FormData();
  fd.set("chat_id", env.TELEGRAM_CHAT_ID);
  fd.set("document", new File([bytes], sanitizeName(name)));
  const res = await fetch(`https://api.telegram.org/bot${env.TELEGRAM_TOKEN}/sendDocument`, {
    method: "POST",
    body: fd,
  });
  return res.ok;
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (request.method === "OPTIONS") return json({ ok: true }, 204);
    if (url.pathname !== "/api/request" || request.method !== "POST") {
      return json({ error: "notfound" }, 404);
    }

    if (!env.TELEGRAM_TOKEN || !env.TELEGRAM_CHAT_ID) {
      return json({ error: "config" }, 500); // lets the site fall back to a soft message
    }

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
    const names = files.map((f) => f.name);

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

    const msgOk = await tgSendMessage(env, lines).catch(() => false);
    let filesOk = true;
    for (const f of files) {
      filesOk = (await tgSendDocument(env, f.buf, f.name).catch(() => false)) && filesOk;
    }

    if (!msgOk) return json({ error: "telegram" }, 502);

    return json({ ok: true, id });
  },
};