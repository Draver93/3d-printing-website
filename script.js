let currentLang = localStorage.getItem("lang") || "en";
let translations = {};

async function loadLang(lang) {
  const res = await fetch(`i18n/${lang}.json`);
  translations = await res.json();
  currentLang = lang;
  localStorage.setItem("lang", lang);
  document.documentElement.lang = lang;
  applyTranslations();
  updateLangButton();
}

function t(key) {
  return key.split(".").reduce((o, k) => (o && o[k]) || "", translations) || key;
}

function applyTranslations() {
  document.querySelectorAll("[data-i18n]").forEach((el) => {
    const key = el.getAttribute("data-i18n");
    el.textContent = t(key);
  });
}

function updateLangButton() {
  const btn = document.getElementById("langToggle");
  btn.textContent = currentLang.toUpperCase() + " ▾";
}

function buildLangDropdown() {
  const dropdown = document.getElementById("langDropdown");
  const langs = ["en", "ru", "pl", "de"];
  const names = { en: "English", ru: "Русский", pl: "Polski", de: "Deutsch" };
  dropdown.innerHTML = langs
    .map(
      (l) =>
        `<button data-lang="${l}" style="${l === currentLang ? "color:#fff;font-weight:700" : ""}">${names[l]}</button>`
    )
    .join("");
}

async function loadJSON(path) {
  const res = await fetch(path);
  return res.json();
}

function setActiveNav(page) {
  document.querySelectorAll(".main-nav a").forEach((a) => {
    a.classList.toggle("active", a.dataset.page === page);
  });
}

/* ===== PAGE RENDERERS ===== */

async function renderHome() {
  const services = await loadJSON("data/services.json");
  const gallery = await loadJSON("data/gallery.json");
  const news = await loadJSON("data/news.json");
  const social = await loadJSON("data/social.json");

  app.innerHTML = `
    <div class="hero">
      <div class="hero-text">
        <h1>${t("hero.title")} <span>${t("hero.titleHighlight")}</span></h1>
        <p>${t("hero.subtitle")}</p>
        <div class="hero-actions">
          <a href="${social.whatsapp}" target="_blank" class="btn-primary">${t("hero.cta")}</a>
          <a href="#services" class="btn-secondary">${t("hero.secondary")}</a>
        </div>
      </div>
      <div class="hero-visual">
        <div class="hero-icon">🖨</div>
      </div>
    </div>

    <div class="services-section">
      <h2 class="section-title">${t("services.title")}</h2>
      <p class="section-subtitle">${t("services.subtitle")}</p>
      <div class="service-grid">
        ${services.map((s, i) => `
          <div class="service-card">
            <div class="icon">${s.icon || ["⚙", "🔧", "🎁", "📐"][i] || "📦"}</div>
            <h3>${s.title}</h3>
            <p>${s.description}</p>
          </div>
        `).join("")}
      </div>
    </div>

    <div class="process-section">
      <h2 class="section-title">${t("process.title")}</h2>
      <p class="section-subtitle">${t("process.subtitle")}</p>
      <div class="process-grid">
        ${[1, 2, 3, 4].map((i) => `
          <div class="process-step">
            <div class="num">${i}</div>
            <h4>${t(`process.step${i}.title`)}</h4>
            <p>${t(`process.step${i}.desc`)}</p>
          </div>
        `).join("")}
      </div>
    </div>

    <div class="stats-bar">
      ${[1, 2, 3, 4].map((i) => `
        <div class="stat-item">
          <div class="value">${t(`stats.stat${i}.value`)}</div>
          <div class="label">${t(`stats.stat${i}.label`)}</div>
        </div>
      `).join("")}
    </div>

    <div class="why-section">
      <h2 class="section-title">${t("why.title")}</h2>
      <p class="section-subtitle">${t("why.subtitle")}</p>
      <div class="why-grid">
        ${[1, 2, 3].map((i) => `
          <div class="why-card">
            <div class="icon">${["⚡", "💰", "🤝"][i - 1]}</div>
            <h4>${t(`why.point${i}.title`)}</h4>
            <p>${t(`why.point${i}.desc`)}</p>
          </div>
        `).join("")}
      </div>
    </div>

    <div class="contact-section">
      <div class="cta-box">
        <h2>${t("cta.title")}</h2>
        <p>${t("cta.subtitle")}</p>
        <a href="${social.whatsapp}" target="_blank" class="btn-whatsapp">💬 WhatsApp</a>
      </div>
    </div>
  `;
}

async function renderServices() {
  const data = await loadJSON("data/services.json");
  app.innerHTML = `
    <div style="padding:2rem 0">
      <h2 class="section-title">${t("services.title")}</h2>
      <p class="section-subtitle">${t("services.subtitle")}</p>
      <div class="service-grid">
        ${data.map((s, i) => `
          <div class="service-card">
            <div class="icon">${s.icon || ["⚙", "🔧", "🎁", "📐"][i] || "📦"}</div>
            <h3>${s.title}</h3>
            <p>${s.description}</p>
          </div>
        `).join("")}
      </div>
    </div>
  `;
}

async function renderGallery() {
  const data = await loadJSON("data/gallery.json");
  app.innerHTML = `
    <div class="gallery-section">
      <h2 class="section-title">${t("gallery.title")}</h2>
      <p class="section-subtitle">${t("gallery.subtitle")}</p>
      <div class="gallery-grid">
        ${data.map((item) => `
          <div class="gallery-card">
            ${item.image ? `<img src="${item.image}" alt="${item.title}">` : '<div style="height:180px;background:#e2e8f0"></div>'}
            <div class="info">
              <h3>${item.title}</h3>
              <p>${item.description}</p>
            </div>
          </div>
        `).join("")}
      </div>
    </div>
  `;
}

async function renderNews() {
  const data = await loadJSON("data/news.json");
  app.innerHTML = `
    <div class="news-section">
      <h2 class="section-title">${t("news.title")}</h2>
      <p class="section-subtitle">${t("news.subtitle")}</p>
      <div class="news-grid">
        ${data.map((item) => `
          <div class="news-card">
            <div class="date">${item.date}</div>
            <h3>${item.title}</h3>
            <p>${item.description}</p>
          </div>
        `).join("")}
      </div>
    </div>
  `;
}

async function renderFooter() {
  const social = await loadJSON("data/social.json");
  const links = [
    social.instagram ? `<a href="${social.instagram}" target="_blank">Instagram</a>` : "",
    social.telegram ? `<a href="${social.telegram}" target="_blank">Telegram</a>` : "",
    social.whatsapp ? `<a href="${social.whatsapp}" target="_blank">WhatsApp</a>` : "",
  ].filter(Boolean).join("");

  document.getElementById("footer").innerHTML = `
    <div class="footer-inner">
      <div class="footer-copy">&copy; 2026 3DPrint</div>
      <div class="footer-links">${links}</div>
    </div>
  `;
}

const pages = {
  home: renderHome,
  services: renderServices,
  gallery: renderGallery,
  news: renderNews,
  contact: renderHome,
};

async function navigate(page) {
  const render = pages[page];
  if (!render) return;
  setActiveNav(page);
  await render();
}

/* ===== INIT ===== */
document.addEventListener("DOMContentLoaded", async () => {
  buildLangDropdown();
  await loadLang(currentLang);

  const hash = location.hash.replace("#", "") || "home";
  navigate(hash);
  renderFooter();

  document.getElementById("langToggle").addEventListener("click", () => {
    document.getElementById("langDropdown").classList.toggle("open");
  });

  document.getElementById("langDropdown").addEventListener("click", async (e) => {
    if (e.target.dataset.lang) {
      await loadLang(e.target.dataset.lang);
      document.getElementById("langDropdown").classList.remove("open");
      const hash = location.hash.replace("#", "") || "home";
      navigate(hash);
    }
  });

  document.addEventListener("click", (e) => {
    if (!e.target.closest(".lang-switcher")) {
      document.getElementById("langDropdown").classList.remove("open");
    }
  });
});

window.addEventListener("hashchange", () => {
  const hash = location.hash.replace("#", "") || "home";
  navigate(hash);
});
