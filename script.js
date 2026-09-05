const app = document.getElementById("app");
let currentLang = ["en", "ru", "sah"].includes(localStorage.getItem("lang")) ? localStorage.getItem("lang") : "en";
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
    el.textContent = t(el.getAttribute("data-i18n"));
  });
}

function updateLangButton() {
  document.getElementById("langToggle").textContent = currentLang.toUpperCase() + " ▾";
}

function buildLangDropdown() {
  const dropdown = document.getElementById("langDropdown");
  const langs = ["ru", "en", "sah"];
  const names = { ru: "Русский", en: "English", sah: "Саха тыла" };
  dropdown.innerHTML = langs.map((l) =>
    `<button data-lang="${l}" style="${l === currentLang ? "color:#fff;font-weight:700" : ""}">${names[l]}</button>`
  ).join("");
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

function ratingStars(n) {
  return Array.from({ length: 5 }, (_, i) => (i < n ? "★" : "☆")).join("");
}

function initMap() {
  if (!window.L) return;
  const el = document.getElementById("map-container");
  if (!el) return;
  const map = L.map("map-container").setView([62.18, 117.63], 6);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "&copy; OpenStreetMap"
  }).addTo(map);
  L.marker([62.18, 117.63]).addTo(map).bindPopup("Suntar, Yakutia");
}

function initPricing(pricing) {
  const calcBtn = document.getElementById("calcBtn");
  const weightInput = document.getElementById("weightInput");
  const materialSelect = document.getElementById("materialSelect");
  const modelingNo = document.getElementById("modelingNo");
  const modelingYes = document.getElementById("modelingYes");
  const result = document.getElementById("pricingResult");
  const totalEl = document.getElementById("pricingTotal");
  let needsModeling = false;

  modelingNo.onclick = () => { needsModeling = false; modelingNo.classList.add("active"); modelingYes.classList.remove("active"); };
  modelingYes.onclick = () => { needsModeling = true; modelingYes.classList.add("active"); modelingNo.classList.remove("active"); };

  calcBtn.onclick = () => {
    const weight = Math.max(1, parseInt(weightInput.value) || 50);
    const pricePerGram = parseInt(materialSelect.value);
    const materialCost = weight * pricePerGram;
    const total = pricing.basePrice + materialCost + (needsModeling ? pricing.modelingFee : 0);
    totalEl.innerHTML = `<span class="price-total-label">${t("pricing.totalLabel")}</span>` +
      `<span class="price-value">${total.toLocaleString("ru-RU")} ₽</span>` +
      `<span class="price-breakdown">${pricing.basePrice.toLocaleString("ru-RU")} ₽ ${t("pricing.oneTime")}` +
      ` + ${materialCost.toLocaleString("ru-RU")} ₽ (${weight} g \u00d7 ${pricePerGram} ₽ ${t("pricing.perGram")})` +
      (needsModeling ? ` + ${pricing.modelingFee.toLocaleString("ru-RU")} ₽ ${t("pricing.modeling")}` : "") +
      `</span>`;
    result.classList.add("has-result");
  };
}

function initRequestForm(email) {
  const form = document.getElementById("requestForm");
  if (!form) return;
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const status = document.getElementById("reqStatus");
    const btn = document.getElementById("reqSubmit");
    const name = form.name.value.trim();
    const contact = form.contact.value.trim();
    const message = form.message.value.trim();
    const honey = form.querySelector('[name="_honey"]').value;

    if (!name || !contact || !message) {
      status.hidden = false;
      status.className = "request-status error";
      status.textContent = t("request.required");
      return;
    }

    status.hidden = false;
    if (!email) {
      status.className = "request-status error";
      status.textContent = t("request.error");
      return;
    }

    btn.disabled = true;
    btn.textContent = t("request.sending");
    try {
      const res = await fetch("https://formsubmit.co/ajax/" + email, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          name,
          contact,
          message,
          _subject: `New request - Suntar-Plastic (${name})`,
          _captcha: "false",
          _honey: honey,
          _template: "table",
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success !== false) {
        status.className = "request-status success";
        status.textContent = t("request.success");
        form.reset();
      } else {
        status.className = "request-status error";
        status.textContent = t("request.error");
      }
    } catch (err) {
      status.className = "request-status error";
      status.textContent = t("request.error");
    }
    btn.disabled = false;
    btn.textContent = t("request.send");
  });
}

function updateThemeBtn(btn) {
  btn.textContent = document.body.classList.contains("dark") ? "☀" : "🌙";
}

/* ===== PAGE RENDERERS ===== */

async function renderHome() {
  const services = await loadJSON("data/services.json");
  const social = await loadJSON("data/social.json");
  const promo = await loadJSON("data/promo.json");
  const materials = await loadJSON("data/materials.json");
  const pricing = await loadJSON("data/pricing.json");
  const faq = await loadJSON("data/faq.json");
  const testimonials = await loadJSON("data/testimonials.json");

  const promoHtml = promo.active
    ? `<div class="promo-banner" id="promoBanner"><span>${promo.text}</span><button class="promo-close" onclick="document.getElementById('promoBanner').style.display='none'">✕</button></div>`
    : "";

  app.innerHTML = `
    ${promoHtml}

    <div class="hero">
      <div class="hero-text">
        <h1>${t("hero.title")} <span>${t("hero.titleHighlight")}</span></h1>
        <p>${t("hero.subtitle")}</p>
        <div class="hero-actions">
          <a href="${social.whatsapp}" target="_blank" class="btn-primary">${t("hero.cta")}</a>
          <a href="#services" class="btn-secondary">${t("hero.secondary")}</a>
        </div>
      </div>
      <div class="hero-visual"><div class="hero-icon">🖨</div></div>
    </div>

    <div class="services-section">
      <h2 class="section-title">${t("services.title")}</h2>
      <p class="section-subtitle">${t("services.subtitle")}</p>
      <div class="service-grid">
        ${services.map((s, i) => `
          <div class="service-card">
            <div class="icon">${s.icon || ["⚙", "🔧", "🎁", "📐"][i]}</div>
            <h3>${s.title}</h3>
            <p>${s.description}</p>
            <a href="${social.whatsapp}?text=${encodeURIComponent("Hi, I need: " + s.title)}" target="_blank" class="card-cta">${t("nav.quote")}</a>
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
            <h4>${t("process.step" + i + ".title")}</h4>
            <p>${t("process.step" + i + ".desc")}</p>
          </div>
        `).join("")}
      </div>
    </div>

    <div class="stats-bar">
      ${[1, 2, 3, 4].map((i) => `
        <div class="stat-item">
          <div class="value">${t("stats.stat" + i + ".value")}</div>
          <div class="label">${t("stats.stat" + i + ".label")}</div>
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
            <h4>${t("why.point" + i + ".title")}</h4>
            <p>${t("why.point" + i + ".desc")}</p>
          </div>
        `).join("")}
      </div>
    </div>

    <div class="materials-section">
      <h2 class="section-title">${t("materials.title")}</h2>
      <p class="section-subtitle">${t("materials.subtitle")}</p>
      <div class="materials-grid">
        ${materials.map((m) => `
          <div class="material-card ${m.recommended ? "recommended" : ""}">
            <div class="material-header">
              <span class="material-icon">${m.icon}</span>
              <h3>${m.name}</h3>
              ${m.recommended ? `<span class="badge-rec">${t("materials.recommended")}</span>` : ""}
            </div>
            <div class="material-bars">
              <div class="bar-row"><span>${t("materials.strength")}</span><div class="bar"><div class="bar-fill" style="width:${m.strength * 20}%"></div></div></div>
              <div class="bar-row"><span>${t("materials.heatResistance")}</span><div class="bar"><div class="bar-fill" style="width:${m.heatResistance * 20}%"></div></div></div>
              <div class="bar-row"><span>${t("materials.flexibility")}</span><div class="bar"><div class="bar-fill" style="width:${m.flexibility * 20}%"></div></div></div>
            </div>
            <p class="material-best">${t("materials.bestFor")}: ${m.bestFor}</p>
          </div>
        `).join("")}
      </div>
    </div>

    <div class="pricing-section">
      <h2 class="section-title">${t("pricing.title")}</h2>
      <p class="section-subtitle">${t("pricing.subtitle")}</p>
      <div class="pricing-box">
        <div class="pricing-form">
          <div class="pricing-field">
            <label>${t("pricing.weightLabel")}</label>
            <input type="number" id="weightInput" value="50" min="1" max="5000">
          </div>
          <div class="pricing-field">
            <label>${t("pricing.materialLabel")}</label>
            <select id="materialSelect">
              ${pricing.materials.map((m) => `<option value="${m.pricePerGram}">${m.name}</option>`).join("")}
            </select>
          </div>
          <div class="pricing-field">
            <label>${t("pricing.modelingLabel")}</label>
            <div class="pricing-toggle">
              <button type="button" id="modelingNo" class="pricing-toggle-btn active">${t("pricing.no")}</button>
              <button type="button" id="modelingYes" class="pricing-toggle-btn">${t("pricing.yes")}</button>
            </div>
          </div>
          <button type="button" class="btn-primary" id="calcBtn">${t("pricing.estimateBtn")}</button>
        </div>
        <div class="pricing-result" id="pricingResult">
          <div class="pricing-result-title">${t("pricing.resultTitle")}</div>
          <div class="pricing-total" id="pricingTotal"><span class="price-hint">${t("pricing.hint")}</span></div>
        </div>
      </div>
      <div class="pricing-notes">
        <h4>${t("pricing.notesTitle")}</h4>
        <ul>${pricing.notes.map((n) => `<li>${n}</li>`).join("")}</ul>
      </div>
    </div>

    <div class="testimonials-section">
      <h2 class="section-title">${t("testimonials.title")}</h2>
      <p class="section-subtitle">${t("testimonials.subtitle")}</p>
      <div class="testimonials-grid">
        ${testimonials.map((r) => `
          <div class="testimonial-card">
            <div class="testimonial-rating">${ratingStars(r.rating)}</div>
            <p class="testimonial-text">"${r.text}"</p>
            <div class="testimonial-author">${r.name} · ${r.location}</div>
          </div>
        `).join("")}
      </div>
    </div>

    <div class="faq-section">
      <h2 class="section-title">${t("faq.title")}</h2>
      <p class="section-subtitle">${t("faq.subtitle")}</p>
      <div class="faq-list">
        ${faq.map((item) => `
          <div class="faq-item">
            <button class="faq-question" onclick="this.parentElement.classList.toggle('open')">
              <span>${item.question}</span><span class="faq-arrow">▸</span>
            </button>
            <div class="faq-answer"><p>${item.answer}</p></div>
          </div>
        `).join("")}
      </div>
    </div>

    <div class="size-ref-section">
      <h2 class="section-title">${t("fileRef.title")}</h2>
      <p class="section-subtitle">${t("fileRef.subtitle")}</p>
      <div class="size-ref-grid">
        <div class="size-ref-card"><div class="size-icon">📱</div><div class="size-label">${t("fileRef.small")}</div><div class="size-desc">${t("fileRef.smallSize")}</div></div>
        <div class="size-ref-card"><div class="size-icon">📦</div><div class="size-label">${t("fileRef.medium")}</div><div class="size-desc">${t("fileRef.mediumSize")}</div></div>
        <div class="size-ref-card"><div class="size-icon">🎁</div><div class="size-label">${t("fileRef.large")}</div><div class="size-desc">${t("fileRef.largeSize")}</div></div>
      </div>
    </div>

    <div class="map-section">
      <h2 class="section-title">${t("map.title")}</h2>
      <p class="section-subtitle">${t("map.subtitle")}</p>
      <div id="map-container" class="map-container"></div>
    </div>

    <div class="contact-section">
      <div class="cta-box">
        <h2>${t("cta.title")}</h2>
        <p>${t("cta.subtitle")}</p>
        <a href="${social.whatsapp}" target="_blank" class="btn-whatsapp">💬 WhatsApp</a>
      </div>

      <div class="request-card">
        <h2>${t("request.title")}</h2>
        <p>${t("request.subtitle")}</p>
        <form id="requestForm" class="request-form" novalidate>
          <div class="request-field">
            <label for="reqName">${t("request.name")}</label>
            <input id="reqName" name="name" type="text" required>
          </div>
          <div class="request-field">
            <label for="reqContact">${t("request.contact")}</label>
            <input id="reqContact" name="contact" type="text" required>
          </div>
          <div class="request-field">
            <label for="reqMessage">${t("request.message")}</label>
            <textarea id="reqMessage" name="message" rows="4" required></textarea>
          </div>
          <input type="text" name="_honey" style="display:none" tabindex="-1" autocomplete="off">
          <button type="submit" class="btn-primary" id="reqSubmit">${t("request.send")}</button>
          <div class="request-status" id="reqStatus" hidden></div>
        </form>
      </div>
    </div>
  `;

  setTimeout(initMap, 100);
  initPricing(pricing);
  initRequestForm(social.contactEmail);
}

async function renderServices() {
  const data = await loadJSON("data/services.json");
  const social = await loadJSON("data/social.json");
  app.innerHTML = `
    <div style="padding:2rem 0">
      <h2 class="section-title">${t("services.title")}</h2>
      <p class="section-subtitle">${t("services.subtitle")}</p>
      <div class="service-grid">
        ${data.map((s, i) => `
          <div class="service-card">
            <div class="icon">${s.icon || ["⚙", "🔧", "🎁", "📐"][i]}</div>
            <h3>${s.title}</h3>
            <p>${s.description}</p>
            <a href="${social.whatsapp}?text=${encodeURIComponent("Hi, I need help with: " + s.title)}" target="_blank" class="card-cta">${t("nav.quote")}</a>
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
            <div class="info"><h3>${item.title}</h3><p>${item.description}</p></div>
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
      <div class="footer-copy">&copy; 2026 Suntar-Plastic</div>
      <div class="footer-links">${links}</div>
    </div>
  `;
}

const pages = { home: renderHome, services: renderServices, gallery: renderGallery, news: renderNews, contact: renderHome };

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

  const savedTheme = localStorage.getItem("theme") || "light";
  if (savedTheme === "dark") document.body.classList.add("dark");
  const themeBtn = document.getElementById("themeToggle");
  updateThemeBtn(themeBtn);
  themeBtn.addEventListener("click", () => {
    document.body.classList.toggle("dark");
    localStorage.setItem("theme", document.body.classList.contains("dark") ? "dark" : "light");
    updateThemeBtn(themeBtn);
  });

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
      navigate(location.hash.replace("#", "") || "home");
    }
  });

  document.addEventListener("click", (e) => {
    if (!e.target.closest(".lang-switcher")) {
      document.getElementById("langDropdown").classList.remove("open");
    }
  });
});

window.addEventListener("hashchange", () => {
  navigate(location.hash.replace("#", "") || "home");
});
