const GITHUB_API = "https://api.github.com";

const SCHEMAS = {
  services: {
    path: "data/services.json",
    label: "Services",
    array: true,
    fields: [
      { key: "title", label: "Title", type: "text" },
      { key: "description", label: "Description", type: "textarea" },
      { key: "icon", label: "Icon (emoji)", type: "text" },
      { key: "link", label: "Link (optional)", type: "text" },
    ],
  },
  gallery: {
    path: "data/gallery.json",
    label: "Gallery",
    array: true,
    fields: [
      { key: "title", label: "Title", type: "text" },
      { key: "description", label: "Description", type: "textarea" },
      { key: "image", label: "Image URL", type: "text" },
    ],
  },
  news: {
    path: "data/news.json",
    label: "News & Tips",
    array: true,
    fields: [
      { key: "title", label: "Title", type: "text" },
      { key: "description", label: "Description", type: "textarea" },
      { key: "date", label: "Date (YYYY-MM-DD)", type: "date" },
    ],
  },
  testimonials: {
    path: "data/testimonials.json",
    label: "Testimonials",
    array: true,
    fields: [
      { key: "name", label: "Name", type: "text" },
      { key: "location", label: "Location", type: "text" },
      { key: "rating", label: "Rating (1-5)", type: "number", min: 1, max: 5 },
      { key: "text", label: "Review Text", type: "textarea" },
    ],
  },
  materials: {
    path: "data/materials.json",
    label: "Materials",
    array: true,
    fields: [
      { key: "name", label: "Name", type: "text" },
      { key: "icon", label: "Icon (emoji)", type: "text" },
      { key: "strength", label: "Strength (1-5)", type: "number", min: 1, max: 5 },
      { key: "heatResistance", label: "Heat Resistance (1-5)", type: "number", min: 1, max: 5 },
      { key: "flexibility", label: "Flexibility (1-5)", type: "number", min: 1, max: 5 },
      { key: "bestFor", label: "Best for", type: "text" },
      { key: "recommended", label: "Recommended", type: "checkbox" },
    ],
  },
  pricing: {
    path: "data/pricing.json",
    label: "Pricing",
    array: false,
    fields: [
      { key: "basePrice", label: "Base price", type: "number" },
      { key: "modelingFee", label: "Modeling fee", type: "number" },
    ],
    nested: [
      {
        key: "materials",
        label: "Material prices (per gram)",
        fields: [
          { key: "name", label: "Material", type: "text" },
          { key: "pricePerGram", label: "Price per gram", type: "number" },
        ],
      },
      {
        key: "notes",
        label: "Notes",
        simpleText: true,
      },
    ],
  },
  faq: {
    path: "data/faq.json",
    label: "FAQ",
    array: true,
    fields: [
      { key: "question", label: "Question", type: "textarea" },
      { key: "answer", label: "Answer", type: "textarea" },
    ],
  },
  promo: {
    path: "data/promo.json",
    label: "Promo Banner",
    array: false,
    fields: [
      { key: "active", label: "Active", type: "checkbox" },
      { key: "text", label: "Promo text", type: "text" },
      { key: "endDate", label: "End date (YYYY-MM-DD)", type: "date" },
    ],
  },
  social: {
    path: "data/social.json",
    label: "Social Links",
    array: false,
    fields: [
      { key: "whatsapp", label: "WhatsApp URL", type: "text" },
      { key: "instagram", label: "Instagram URL", type: "text" },
      { key: "telegram", label: "Telegram URL", type: "text" },
    ],
  },
};

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
  return {
    sha: data.sha,
    content: decodeURIComponent(escape(atob(data.content))),
  };
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

/* ===== FORM BUILDERS ===== */

function fieldInput(field, value) {
  value = value ?? "";
  switch (field.type) {
    case "textarea":
      return `<textarea name="${field.key}" spellcheck="false">${escapeHtml(value)}</textarea>`;
    case "checkbox":
      return `<input type="checkbox" name="${field.key}" ${value ? "checked" : ""}>`;
    case "date":
      return `<input type="date" name="${field.key}" value="${value}">`;
    case "number":
      return `<input type="number" name="${field.key}" value="${value}" ${field.min ? `min="${field.min}"` : ""} ${field.max ? `max="${field.max}"` : ""}>`;
    default:
      return `<input type="text" name="${field.key}" value="${escapeHtml(value)}">`;
  }
}

function renderItemCard(index, fields, item, itemType, removable = true) {
  const itemLabel = `${itemType.label} #${index + 1}`;
  return `
    <div class="item-card" data-index="${index}">
      <div class="item-header">
        <h3>${escapeHtml(itemLabel)}</h3>
        <button class="btn-remove" data-remove="${index}">Remove</button>
      </div>
      <div class="item-fields">
        ${fields.map((f) => `
          <div class="form-field">
            <label>${f.label}</label>
            ${fieldInput(f, item[f.key])}
          </div>
        `).join("")}
      </div>
    </div>
  `;
}

function escapeHtml(str) {
  return String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function buildSimpleObjectForm(schema, data) {
  return `
    <div class="form-section-title">${schema.label}</div>
    <div class="simple-object-form">
      ${schema.fields.map((f) => `
        <div class="form-field">
          <label>${f.label}</label>
          ${fieldInput(f, data[f.key])}
        </div>
      `).join("")}
      ${(schema.nested || []).map((n) => `
        <div class="nested-section">
          <h3>${n.label}</h3>
          ${n.simpleText ? `
            <div class="simple-list" data-list-key="${n.key}" data-list-simple="1">
              ${(data[n.key] || []).map((v, i) => `
                <div class="list-item-row" data-simple-index="${i}">
                  <input type="text" value="${escapeHtml(v)}">
                  <button class="btn-remove" data-simple-remove="${i}">✕</button>
                </div>
              `).join("")}
            </div>
            <button class="btn-add" data-add-simple="${n.key}">+ Add item</button>
          ` : `
            <div data-list-key="${n.key}">
              ${(data[n.key] || []).map((item, i) => `
                <div class="item-row" data-nested-index="${i}">
                  ${n.fields.map((f) => `
                    <div class="form-field">
                      <label>${f.label}</label>
                      ${fieldInput(f, item[f.key])}
                    </div>
                  `).join("")}
                  <button class="btn-remove" data-nested-remove="${i}">Remove</button>
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
    <div class="array-list" data-array-list="1">
      ${data.map((item, i) => renderItemCard(i, schema.fields, item, schema)).join("")}
    </div>
    <button class="btn-add" data-add-item="1">+ Add ${schema.label} item</button>
  `;
}

/* ===== SERIALIZERS ===== */

function collectSimpleObject(schema) {
  const panel = document.getElementById("formPanel");
  const obj = {};
  schema.fields.forEach((f) => {
    const input = panel.querySelector(`[name="${f.key}"]`);
    if (!input) return;
    obj[f.key] = f.type === "checkbox" ? input.checked : f.type === "number" ? parseFloat(input.value) || 0 : input.value;
  });
  (schema.nested || []).forEach((n) => {
    if (n.simpleText) {
      obj[n.key] = Array.from(panel.querySelectorAll(`[data-list-simple] .list-item-row input`)).map((i) => i.value);
    } else {
      obj[n.key] = Array.from(panel.querySelectorAll(`[data-list-key="${n.key}"] .item-row`)).map((row) => {
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
  return obj;
}

function collectArrayList(schema) {
  return Array.from(document.querySelectorAll(`[data-array-list] .item-card`)).map((card) => {
    const item = {};
    schema.fields.forEach((f) => {
      const input = card.querySelector(`[name="${f.key}"]`);
      if (!input) return;
      item[f.key] = f.type === "checkbox" ? input.checked : f.type === "number" ? parseFloat(input.value) || 0 : input.value;
    });
    return item;
  });
}

function renderForm(type, data) {
  const schema = SCHEMAS[type];
  if (!schema) return;
  const panel = document.getElementById("formPanel");
  panel.dataset.type = type;
  panel.dataset.schemaPath = schema.path;
  panel.dataset.schemaArray = schema.array ? "1" : "";
  panel.innerHTML = schema.array ? buildArrayListForm(schema, data) : buildSimpleObjectForm(schema, data);
}

function bindEventHandlers() {
  const panel = document.getElementById("formPanel");

  panel.addEventListener("click", (e) => {
    const type = panel.dataset.type;
    const schema = SCHEMAS[type];
    if (!schema) return;

    if (e.target.matches("[data-add-item]")) {
      const args = schema.fields.map((f) => ({ [f.key]: f.type === "checkbox" ? false : f.type === "number" ? 0 : "" }));
      const emptyItem = Object.assign({}, ...args);
      const list = panel.querySelector("[data-array-list]");
      const index = list.children.length;
      list.insertAdjacentHTML("beforeend", renderItemCard(index, schema.fields, emptyItem, schema));
      return;
    }

    if (e.target.matches("[data-remove]")) {
      e.target.closest(".item-card").remove();
      return;
    }

    if (e.target.matches("[data-add-simple]")) {
      const key = e.target.dataset.addSimple;
      const list = panel.querySelector(`[data-list-key="${key}"]`);
      list.insertAdjacentHTML("beforeend", `<div class="list-item-row"><input type="text" value=""><button class="btn-remove" data-simple-remove>✕</button></div>`);
      return;
    }

    if (e.target.matches("[data-simple-remove]")) {
      e.target.closest(".list-item-row").remove();
      return;
    }

    if (e.target.matches("[data-add-nested]")) {
      const key = e.target.dataset.addNested;
      const schema2 = SCHEMAS[panel.dataset.type];
      const nested = schema2.nested.find((n) => n.key === key);
      const container = panel.querySelector(`[data-list-key="${key}"]`);
      const args = nested.fields.map((f) => ({ [f.key]: f.type === "checkbox" ? false : f.type === "number" ? 0 : "" }));
      const emptyItem = Object.assign({}, ...args);
      const index = container.children.length;
      container.insertAdjacentHTML("beforeend", `
        <div class="item-row" data-nested-index="${index}">
          ${nested.fields.map((f) => `
            <div class="form-field">
              <label>${f.label}</label>
              ${fieldInput(f, emptyItem[f.key])}
            </div>
          `).join("")}
          <button class="btn-remove" data-nested-remove="${index}">Remove</button>
        </div>
      `);
      return;
    }

    if (e.target.matches("[data-nested-remove]")) {
      e.target.closest(".item-row").remove();
    }
  });
}

/* ===== LOAD / SAVE ===== */

let currentSha = null;

async function loadForm() {
  const type = document.getElementById("fileTypeSelect").value;
  const schema = SCHEMAS[type];
  const { repo } = getConfig();
  if (!repo) return setStatus("Enter your repo (owner/repo)", "error");
  setStatus("Loading...", "info");
  try {
    const { sha, content } = await fetchFile(schema.path);
    currentSha = sha;
    const data = JSON.parse(content);
    renderForm(type, data);
    setStatus(`Loaded ${schema.label}`, "success");
  } catch (e) {
    setStatus(e.message, "error");
  }
}

async function saveForm() {
  const type = document.getElementById("fileTypeSelect").value;
  const schema = SCHEMAS[type];
  const panel = document.getElementById("formPanel");
  const { token } = getConfig();
  if (!token) return setStatus("GitHub token required to push", "error");
  if (!panel.dataset.type) return setStatus("Load a file first", "error");

  let data;
  if (schema.array) {
    data = collectArrayList(schema);
  } else {
    data = collectSimpleObject(schema);
  }

  const content = JSON.stringify(data, null, 2);
  setStatus("Saving...", "info");
  document.getElementById("saveBtn").disabled = true;
  try {
    await pushFile(schema.path, content, currentSha, `Update ${schema.label} via admin`);
    setStatus(`Saved ${schema.label} and pushed to GitHub`, "success");
  } catch (e) {
    setStatus(e.message, "error");
  }
  document.getElementById("saveBtn").disabled = false;
}

/* ===== INIT ===== */
document.getElementById("loadBtn").addEventListener("click", loadForm);
document.getElementById("saveBtn").addEventListener("click", saveForm);
document.getElementById("fileTypeSelect").addEventListener("change", () => {
  document.getElementById("formPanel").innerHTML = "";
  currentSha = null;
});

bindEventHandlers();

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
