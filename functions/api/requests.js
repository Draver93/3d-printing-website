function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
}

function isAuthed(env, request) {
  const token = env.API_TOKEN;
  return token && request.headers.get("Authorization") === "Bearer " + token;
}

export const onRequestGet = async ({ request, env }) => {
  if (!isAuthed(env, request)) return json({ error: "unauthorized" }, 401);
  const { results } = await env.DB.prepare(
    "SELECT id, status, note, created_at, updated_at, purpose, item, price, name, contact, email, message, files, dl_token FROM requests ORDER BY created_at DESC LIMIT 200"
  ).all();
  return json({ requests: results });
};

export const onRequestPatch = async ({ request, env }) => {
  if (!isAuthed(env, request)) return json({ error: "unauthorized" }, 401);

  const body = await request.json().catch(() => ({}));
  const id = String(body.id || "").trim().toUpperCase();
  const status = String(body.status || "");
  const note = String(body.note || "").slice(0, 1000);

  const allowed = ["received", "printing", "ready", "done", "cancelled", "declined"];
  if (!id || !allowed.includes(status)) return json({ error: "badstatus" }, 422);

  await env.DB.prepare("UPDATE requests SET status = ?, note = ?, updated_at = ? WHERE id = ?")
    .bind(status, note, Date.now(), id)
    .run();

  return json({ ok: true });
};