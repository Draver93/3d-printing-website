function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
}

function sanitizeName(name) {
  return String(name || "").replace(/[\\/:\x00-\x1f]/g, "_").slice(0, 160);
}

export const onRequestGet = async ({ request, env }) => {
  const url = new URL(request.url);
  const id = (url.searchParams.get("req") || "").trim().toUpperCase();
  const dl = url.searchParams.get("dl") || "";
  const name = sanitizeName(url.searchParams.get("f"));

  if (!id || !dl || !name) return json({ error: "missing" }, 400);

  const row = await env.DB.prepare("SELECT dl_token FROM requests WHERE id = ?").bind(id).first();
  if (!row || row.dl_token !== dl) return json({ error: "forbidden" }, 403);

  const obj = await env.R2.get(`requests/${id}/${name}`);
  if (!obj) return json({ error: "notfound" }, 404);

  const headers = new Headers();
  obj.writeHttpMetadata(headers);
  headers.set("Content-Type", "application/octet-stream");
  headers.set("Content-Disposition", `attachment; filename*=UTF-8''${encodeURIComponent(name)}`);
  return new Response(obj.body, { headers });
};