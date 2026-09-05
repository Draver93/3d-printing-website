const GITHUB_API = "https://api.github.com";

const SCHEMAS = {
  services: { path: "data/services.json", label: "Services", array: true,
    fields: [
      { key: "title", label: "Title", type: "text" },
      { key: "description", label: "Description", type: "textarea" },
      { key: "icon", label: "Icon (emoji)", type: "text" },
      { key: "link", label: "Link (optional)", type: "text" },
    ] },
  gallery: { path: "data/gallery.json", label: "Gallery", array: true,
    fields: [
      { key: "title", label: "Title", type: "text" },
      { key: "description", label: "Description", type: "textarea" },
      { key: "image", label: "Image URL", type: "text" },
    ] },
  catalog: { path: "data/catalog.json", label: "Catalog (ready-to-print)", array: true,
    fields: [
      { key: "name", label: "Name", type: "text" },
      { key: "description", label: "Description", type: "textarea" },
      { key: "category", label: "Category", type: "text" },
      { key: "pricePrint", label: "Print price (₽)", type: "number" },
      { key: "priceModel", label: "Model price (₽)", type: "number" },
      { key: "model", label: "3D model file (GLB/GLTF URL)", type: "text" },
      { key: "icon", label: "Icon (emoji)", type: "text" },
      { key: "image", label: "Image URL (optional)", type: "text" },
    ] },
  news: { path: "data/news.json", label: "News & Tips", array: true,
    fields: [
      { key: "title", label: "Title", type: "text" },
      { key: "description", label: "Description", type: "textarea" },
      { key: "date", label: "Date", type: "date" },
    ] },
  testimonials: { path: "data/testimonials.json", label: "Testimonials", array: true,
    fields: [
      { key: "name", label: "Name", type: "text" },
      { key: "location", label: "Location", type: "text" },
      { key: "rating", label: "Rating (1-5)", type: "number", min: 1, max: 5 },
      { key: "text", label: "Review Text", type: "textarea" },
    ] },
  materials: { path: "data/materials.json", label: "Materials", array: true,
    fields: [
      { key: "name", label: "Name", type: "text" },
      { key: "icon", label: "Icon", type: "text" },
      { key: "strength", label: "Strength", type: "number", min: 1, max: 5 },
      { key: "heatResistance", label: "Heat Res.", type: "number", min: 1, max: 5 },
      { key: "flexibility", label: "Flexibility", type: "number", min: 1, max: 5 },
      { key: "bestFor", label: "Best for", type: "text" },
      { key: "recommended", label: "Recommended", type: "checkbox" },
    ] },
  pricing: { path: "data/pricing.json", label: "Pricing", array: false,
    fields: [
      { key: "basePrice", label: "Base price", type: "number" },
      { key: "modelingFee", label: "Modeling fee", type: "number" },
    ],
    nested: [
      { key: "materials", label: "Material prices", fields: [
        { key: "name", label: "Material", type: "text" },
        { key: "pricePerGram", label: "Price/gram", type: "number" },
      ] },
      { key: "notes", label: "Notes", simpleText: true },
    ] },
  faq: { path: "data/faq.json", label: "FAQ", array: true,
    fields: [
      { key: "question", label: "Question", type: "textarea" },
      { key: "answer", label: "Answer", type: "textarea" },
    ] },
  promo: { path: "data/promo.json", label: "Promo", array: false,
    fields: [
      { key: "active", label: "Active", type: "checkbox" },
      { key: "text", label: "Promo text", type: "text" },
      { key: "endDate", label: "End date", type: "date" },
    ] },
  social: { path: "data/social.json", label: "Social Links", array: false,
    fields: [
      { key: "whatsapp", label: "WhatsApp URL", type: "text" },
      { key: "instagram", label: "Instagram URL", type: "text" },
      { key: "telegram", label: "Telegram URL", type: "text" },
      { key: "contactEmail", label: "Contact email (for form)", type: "text" },
    ] },
};

let currentType = null;
let loadedData = {};

function getConfig() {
  return {
    token: document.getElementById("tokenInput").value.trim(),
    repo: document.getElementById("repoInput").value.trim(),
    branch: document.getElementById("branchInput").value.trim() || "main",
  };
}

function setStatus(msg, type) {
  const bar = document.getElementById("statusBar");
  bar.textContent = msg;
  bar.className = "status-bar " + type;
}

async function fetchFile(path) {
  const { token, repo, branch } = getConfig();
  const url = `${GITHUB_API}/repos/${repo}/contents/${path}?ref=${branch}`;
  const headers = token ? { Authorization: `token ${token}` } : {};
  const res = await fetch(url, { headers });
  if (!res.ok) throw new Error(`Failed to load ${path}: ${res.status}`);
  const data = await res.json();
  return { sha: data.sha, content: decodeURIComponent(escape(atob(data.content))) };
}

async function pushFile(path, content, sha, message) {
  const { token, repo, branch } = getConfig();
  if (!token) throw new Error("GitHub token required");
  const url = `${GITHUB_API}/repos/${repo}/contents/${path}`;
  const body = { message, content: btoa(unescape(encodeURIComponent(content))), branch };
  if (sha) body.sha = sha;
  const res = await fetch(url, {
    method: "PUT",
    headers: { Authorization: `token ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.message || `Failed to push ${path}`);
  }
  return res.json();
}

function escapeHtml(str) {
  return String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function fieldInput(field, value) {
  value = value ?? "";
  switch (field.type) {
    case "textarea": return `<textarea name="${field.key}" spellcheck="false">${escapeHtml(value)}</textarea>`;
    case "checkbox": return `<input type="checkbox" name="${field.key}" ${value ? "checked" : ""}>`;
    case "date": return `<input type="date" name="${field.key}" value="${value}">`;
    case "number": return `<input type="number" name="${field.key}" value="${value}" ${field.min ? `min="${field.min}"` : ""} ${field.max ? `max="${field.max}"` : ""}>`;
    default: return `<input type="text" name="${field.key}" value="${escapeHtml(value)}">`;
  }
}

function renderItemCard(index, fields, item, schema) {
  return `
    <div class="item-card" data-index="${index}">
      <div class="item-header">
        <h3>${escapeHtml(schema.label)} #${index + 1}</h3>
        <button class="btn-remove" data-remove="${index}">Remove</button>
      </div>
      <div class="item-fields">
        ${fields.map((f) => `<div class="form-field"><label>${f.label}</label>${fieldInput(f, item[f.key])}</div>`).join("")}
      </div>
    </div>
  `;
}

function buildSimpleObjectForm(schema, data) {
  return `
    <div class="form-section-title">${schema.label}</div>
    <div class="simple-object-form">
      ${schema.fields.map((f) => `<div class="form-field"><label>${f.label}</label>${fieldInput(f, data[f.key])}</div>`).join("")}
      ${(schema.nested || []).map((n) => `
        <div class="nested-section">
          <h3>${n.label}</h3>
          ${n.simpleText ? `
            <div data-ns-key="${n.key}">
              ${(data[n.key] || []).map((v, i) => `
                <div class="list-item-row">
                  <input type="text" value="${escapeHtml(v)}">
                  <button class="btn-remove" data-simple-remove>✕</button>
                </div>
              `).join("")}
            </div>
            <button class="btn-add" data-add-simple="${n.key}">+ Add</button>
          ` : `
            <div data-nn-key="${n.key}">
              ${(data[n.key] || []).map((item, i) => `
                <div class="item-row">
                  ${n.fields.map((f) => `<div class="form-field"><label>${f.label}</label>${fieldInput(f, item[f.key])}</div>`).join("")}
                  <button class="btn-remove" data-nested-remove>Remove</button>
                </div>
              `).join("")}
            </div>
            <button class="btn-add" data-add-nested="${n.key}">+ Add ${n.label} item</button>
          `}
        </div>
      `).join("")}
    </div>
  `;
}

function buildArrayListForm(schema, data) {
  return `
    <div class="form-section-title">${schema.label} (${data.length})</div>
    <div data-array-list="1">
      ${data.map((item, i) => renderItemCard(i, schema.fields, item, schema)).join("")}
    </div>
    <button class="btn-add" data-add-item="1">+ Add ${schema.label} item</button>
  `;
}

function renderForm(type) {
  const schema = SCHEMAS[type];
  if (!schema) return;
  const panel = document.getElementById("formPanel");
  const data = loadedData[type] || {};
  currentType = type;
  panel.innerHTML = schema.array
    ? buildArrayListForm(schema, data)
    : buildSimpleObjectForm(schema, data);
}

/* ===== COLLECTORS (read current DOM back into loadedData) ===== */

function collectCurrent() {
  if (!currentType) return;
  const schema = SCHEMAS[currentType];
  const panel = document.getElementById("formPanel");
  let data;
  if (schema.array) {
    data = Array.from(panel.querySelectorAll("[data-array-list] .item-card")).map((card) => {
      const item = {};
      schema.fields.forEach((f) => {
        const input = card.querySelector(`[name="${f.key}"]`);
        if (!input) return;
        item[f.key] = f.type === "checkbox" ? input.checked : f.type === "number" ? parseFloat(input.value) || 0 : input.value;
      });
      return item;
    });
  } else {
    data = {};
    schema.fields.forEach((f) => {
      const input = panel.querySelector(`[name="${f.key}"]`);
      if (!input) return;
      data[f.key] = f.type === "checkbox" ? input.checked : f.type === "number" ? parseFloat(input.value) || 0 : input.value;
    });
    (schema.nested || []).forEach((n) => {
      if (n.simpleText) {
        data[n.key] = Array.from(panel.querySelectorAll(`[data-ns-key="${n.key}"] .list-item-row input`)).map((i) => i.value);
      } else {
        data[n.key] = Array.from(panel.querySelectorAll(`[data-nn-key="${n.key}"] .item-row`)).map((row) => {
          const item = {};
          n.fields.forEach((f) => {
            const input = row.querySelector(`[name="${f.key}"]`);
            if (!input) return;
            item[f.key] = f.type === "checkbox" ? input.checked : f.type === "number" ? parseFloat(input.value) || 0 : input.value;
          });
          return item;
        });
      }
    });
  }
  loadedData[currentType] = data;
}

/* ===== TABS ===== */

function buildTabs() {
  const bar = document.getElementById("tabBar");
  const types = Object.keys(SCHEMAS);
  bar.innerHTML = types.map((t) => {
    const s = SCHEMAS[t];
    const count = Array.isArray(loadedData[t]) ? ` (${loadedData[t].length})` : "";
    const label = s.label + count;
    return `<button class="tab ${t === currentType ? "active" : ""}" data-type="${t}">${label}</button>`;
  }).join("");
}

function bindTabs() {
  document.getElementById("tabBar").addEventListener("click", (e) => {
    const btn = e.target.closest(".tab");
    if (!btn) return;
    collectCurrent();
    currentType = btn.dataset.type;
    buildTabs();
    renderForm(currentType);
  });
}

function bindFormEvents() {
  const panel = document.getElementById("formPanel");
  panel.addEventListener("click", (e) => {
    const schema = SCHEMAS[currentType];
    if (!schema) return;

    if (e.target.matches("[data-add-item]")) {
      const empty = {};
      schema.fields.forEach((f) => { empty[f.key] = f.type === "checkbox" ? false : f.type === "number" ? 0 : ""; });
      const list = panel.querySelector("[data-array-list]");
      const index = list.children.length;
      list.insertAdjacentHTML("beforeend", renderItemCard(index, schema.fields, empty, schema));
      return;
    }
    if (e.target.matches("[data-remove]")) {
      e.target.closest(".item-card").remove();
      return;
    }
    if (e.target.matches("[data-simple-remove]")) {
      e.target.closest(".list-item-row").remove();
      return;
    }
    if (e.target.matches("[data-add-simple]")) {
      const container = panel.querySelector(`[data-ns-key="${e.target.dataset.addSimple}"]`);
      container.insertAdjacentHTML("beforeend", `<div class="list-item-row"><input type="text" value=""><button class="btn-remove" data-simple-remove>✕</button></div>`);
      return;
    }
    if (e.target.matches("[data-nested-remove]")) {
      e.target.closest(".item-row").remove();
      return;
    }
    if (e.target.matches("[data-add-nested]")) {
      const n = schema.nested.find((x) => x.key === e.target.dataset.addNested);
      const container = panel.querySelector(`[data-nn-key="${e.target.dataset.addNested}"]`);
      const empty = {};
      n.fields.forEach((f) => { empty[f.key] = f.type === "checkbox" ? false : f.type === "number" ? 0 : ""; });
      container.insertAdjacentHTML("beforeend", `
        <div class="item-row">
          ${n.fields.map((f) => `<div class="form-field"><label>${f.label}</label>${fieldInput(f, empty[f.key])}</div>`).join("")}
          <button class="btn-remove" data-nested-remove>Remove</button>
        </div>
      `);
    }
  });
}

/* ===== LOAD ALL / SAVE ALL ===== */

async function loadAll() {
  const { repo } = getConfig();
  if (!repo) return setStatus("Enter your repo (owner/repo)", "error");
  setStatus("Loading all files...", "info");
  document.getElementById("loadBtn").disabled = true;

  loadedData = {};
  let loaded = 0;
  for (const [type, schema] of Object.entries(SCHEMAS)) {
    try {
      const { content } = await fetchFile(schema.path);
      loadedData[type] = JSON.parse(content);
      loaded++;
    } catch (e) {
      console.warn(e);
      loadedData[type] = null;
    }
  }

  document.getElementById("loadBtn").disabled = false;
  currentType = Object.keys(SCHEMAS)[0];
  buildTabs();
  renderForm(currentType);
  setStatus(`Loaded ${loaded}/${Object.keys(SCHEMAS).length} files`, loaded === Object.keys(SCHEMAS).length ? "success" : "info");
}

async function saveAll() {
  const { token } = getConfig();
  if (!token) return setStatus("GitHub token required to push", "error");
  collectCurrent();

  setStatus("Saving all files...", "info");
  document.getElementById("saveBtn").disabled = true;
  let pushed = 0;
  let failed = 0;

  for (const [type, schema] of Object.entries(SCHEMAS)) {
    const data = loadedData[type];
    if (data === null || data === undefined) continue;
    const content = JSON.stringify(data, null, 2);
    try {
      await pushFile(schema.path, content, null, `Update ${schema.label} via admin`);
      pushed++;
    } catch (e) {
      console.error(e);
      failed++;
    }
  }

  document.getElementById("saveBtn").disabled = false;
  if (failed === 0) {
    setStatus(`Saved ${pushed}/${Object.keys(SCHEMAS).length} files and pushed to GitHub`, "success");
  } else {
    setStatus(`Pushed ${pushed}, failed ${failed}`, failed > 0 ? "error" : "success");
  }
}

/* ===== INIT ===== */
document.getElementById("loadBtn").addEventListener("click", loadAll);
document.getElementById("saveBtn").addEventListener("click", saveAll);
bindTabs();
bindFormEvents();

const savedToken = localStorage.getItem("gh_token");
const savedRepo = localStorage.getItem("gh_repo");
if (savedToken) document.getElementById("tokenInput").value = savedToken;
if (savedRepo) document.getElementById("repoInput").value = savedRepo;

["tokenInput", "repoInput"].forEach((id) => {
  document.getElementById(id).addEventListener("change", (e) => {
    if (id === "tokenInput") localStorage.setItem("gh_token", e.target.value);
    if (id === "repoInput") localStorage.setItem("gh_repo", e.target.value);
  });
});
