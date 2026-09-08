function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
}

export const onRequestGet = async ({ request, env }) => {
  const url = new URL(request.url);
  const id = (url.searchParams.get("id") || "").trim().toUpperCase();
  if (!id) return json({ found: false });

  const row = await env.DB.prepare(
    "SELECT id, status, note, created_at, updated_at, purpose, item FROM requests WHERE id = ?"
  )
    .bind(id)
    .first();

  if (!row) return json({ found: false });
  return json({ found: true, ...row });
};