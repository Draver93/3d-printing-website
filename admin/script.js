const GITHUB_API = "https://api.github.com";

const JSON_FILES = [
  "data/services.json",
  "data/gallery.json",
  "data/news.json",
  "data/social.json",
  "data/materials.json",
  "data/pricing.json",
  "data/faq.json",
  "data/testimonials.json",
  "data/promo.json",
  "i18n/en.json",
  "i18n/ru.json",
  "i18n/pl.json",
  "i18n/de.json",
];

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
  const body = {
    message,
    content: btoa(unescape(encodeURIComponent(content))),
    branch,
  };
  if (sha) body.sha = sha;
  const res = await fetch(url, {
    method: "PUT",
    headers: {
      Authorization: `token ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.message || `Failed to push ${path}`);
  }
  return res.json();
}

async function loadAll() {
  const { repo } = getConfig();
  if (!repo) return setStatus("Enter your repo (owner/repo)", "error");
  setStatus("Loading files...", "info");
  const grid = document.getElementById("editorGrid");
  grid.innerHTML = "";
  let loaded = 0;
  for (const path of JSON_FILES) {
    try {
      const { sha, content } = await fetchFile(path);
      const card = document.createElement("div");
      card.className = "editor-card";
      card.dataset.path = path;
      card.dataset.sha = sha;
      card.innerHTML = `
        <div class="editor-card-header">
          <h3>${path.split("/").pop()}</h3>
          <span class="badge">${path.split("/")[0]}</span>
        </div>
        <textarea spellcheck="false">${formatJson(content)}</textarea>
      `;
      grid.appendChild(card);
      loaded++;
    } catch (e) {
      console.warn(e);
    }
  }
  setStatus(`Loaded ${loaded}/${JSON_FILES.length} files`, loaded === JSON_FILES.length ? "success" : "info");
}

async function pushAll() {
  const { token } = getConfig();
  if (!token) return setStatus("GitHub token required to push", "error");
  const cards = document.querySelectorAll(".editor-card");
  if (!cards.length) return setStatus("No files loaded", "error");
  setStatus("Pushing changes...", "info");
  document.getElementById("pushBtn").disabled = true;
  let pushed = 0;
  let failed = 0;
  for (const card of cards) {
    const path = card.dataset.path;
    const sha = card.dataset.sha;
    const content = card.querySelector("textarea").value;
    try { JSON.parse(content); } catch (e) {
      setStatus(`Invalid JSON in ${path}: ${e.message}`, "error");
      failed++;
      continue;
    }
    try {
      await pushFile(path, content, sha, `Update ${path}`);
      pushed++;
    } catch (e) {
      console.error(e);
      failed++;
    }
  }
  document.getElementById("pushBtn").disabled = false;
  if (failed === 0) {
    setStatus(`All ${pushed} files pushed successfully!`, "success");
  } else {
    setStatus(`Pushed ${pushed}, failed ${failed}`, "error");
  }
}

function formatJson(str) {
  try { return JSON.stringify(JSON.parse(str), null, 2); } catch { return str; }
}

document.getElementById("loadBtn").addEventListener("click", loadAll);
document.getElementById("pushBtn").addEventListener("click", pushAll);

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
