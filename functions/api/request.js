const ALLOWED_EXT = ["stl", "obj", "3mf", "step", "stp", "png", "jpg", "jpeg", "webp"];
const MAX_TOTAL = 25 * 1024 * 1024;
const MAX_FILES = 8;

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
}

function genId() {
  const d = new Date();
  const ym = String(d.getFullYear()).slice(2) + String(d.getMonth() + 1).padStart(2, "0");
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let suffix = "";
  for (let i = 0; i < 4; i++) suffix += chars[Math.floor(Math.random() * chars.length)];
  return `SP-${ym}-${suffix}`;
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

async function notifyTelegram(env, r) {
  const origin = String(env.SITE_ORIGIN || "").replace(/\/+$/, "");
  const lines = [
    "🖨 <b>" + esc(r.purpose) + "</b>",
    `ID заявки: <code>${esc(r.id)}</code>`,
    r.item ? "Модель: " + esc(r.item) : "",
    r.price ? "Цена: " + r.price + " ₽" : "",
    "Имя: " + esc(r.name),
    "Контакт: " + esc(r.contact),
    r.email ? "Email: " + esc(r.email) : "",
    r.message ? "Сообщение:\n" + esc(r.message) : "",
  ].filter(Boolean).join("\n");

  let text = lines;
  if (r.files.length) {
    const links = r.files
      .map((f, i) => {
        const u = `${origin}/api/file?req=${encodeURIComponent(r.id)}&dl=${encodeURIComponent(r.dlToken)}&f=${encodeURIComponent(f)}`;
        return `${i + 1}. <a href="${u}">${esc(f)}</a>`;
      })
      .join("\n");
    text += "\n\n📎 Файлы:\n" + links;
  }
  if (origin) text += "\n\nТрек: " + origin + "/#track";

  const token = env.TELEGRAM_TOKEN;
  const chat = env.TELEGRAM_CHAT_ID;
  if (!token || !chat) return;

  try {
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chat,
        text,
        parse_mode: "HTML",
        disable_web_page_preview: true,
      }),
    });
  } catch (err) {
    console.error("telegram failed", err);
  }
}

export const onRequestPost = async ({ request, env }) => {
  const url = new URL(request.url);
  if (url.pathname !== "/api/request") return json({ error: "notfound" }, 404);

  const fb = await request.formData();

  if (fb.get("_honey")) return json({ error: "spam" }, 400);

  const name = String(fb.get("name") || "").trim();
  const contact = String(fb.get("contact") || "").trim();
  if (!name || !contact) return json({ error: "required" }, 422);

  const email = String(fb.get("email") || "").trim();
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json({ error: "email" }, 422);

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
  const dlToken = crypto.randomUUID();
  const names = files.map((f) => f.name);
  const created = Date.now();

  const errors = await Promise.allSettled(
    files.map((f) => env.R2.put(`requests/${id}/${f.name}`, f.buf, { httpMetadata: { contentType: "application/octet-stream" } }))
  );
  if (files.length && errors.some((e) => e.status === "rejected")) {
    return json({ error: "storage" }, 500);
  }

  await env.DB.prepare(
    `INSERT INTO requests (id, created_at, updated_at, purpose, item, price, name, contact, email, message, status, note, files, dl_token)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'received', '', ?, ?)`
  )
    .bind(id, created, created, purpose, item, price, name, contact, email, message, JSON.stringify(names), dlToken)
    .run();

  await notifyTelegram(env, { id, purpose, item, price, name, contact, email, message, files: names, dlToken });

  return json({ ok: true, id, requestedAt: created });
};