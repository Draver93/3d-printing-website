const app = document.getElementById("app");
let currentLang = ["en", "ru", "sah"].includes(localStorage.getItem("lang")) ? localStorage.getItem("lang") : "en";
let translations = {};

const NAV_SECTIONS = ["home", "services", "catalog", "gallery", "news", "faq"];
const SCROLL_ORDER = ["home", "services", "catalog", "process", "stats", "why", "materials", "pricing", "gallery", "testimonials", "faq", "sizes", "map", "contact"];

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

function updateActiveNav() {
  let current = "home";
  for (const id of SCROLL_ORDER) {
    const el = document.getElementById(id);
    if (!el) continue;
    if (el.getBoundingClientRect().top <= 140) {
      if (NAV_SECTIONS.includes(id)) current = id;
    }
  }
  document.querySelectorAll(".main-nav a").forEach((a) => {
    a.classList.toggle("active", a.dataset.page === current);
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

function initTestimonials() {
  const carousel = document.getElementById("testimonialsCarousel");
  const track = document.getElementById("testimonialTrack");
  if (!carousel || !track) return;

  const slides = Array.from(track.children);
  const total = slides.length;
  const dotsWrap = document.getElementById("testimonialDots");
  const prevBtn = carousel.querySelector(".carousel-prev");
  const nextBtn = carousel.querySelector(".carousel-next");

  if (total <= 1) {
    prevBtn.style.display = "none";
    nextBtn.style.display = "none";
    return;
  }

  let index = 0;
  let timer = null;
  const INTERVAL = 4000;

  function perView() {
    return Math.max(1, Math.round(track.clientWidth / (slides[0].offsetWidth || 1)));
  }

  function maxStep() {
    return Math.max(1, total - perView());
  }

  function updateDots() {
    const d = dotsWrap.querySelectorAll(".dot");
    d.forEach((el, j) => el.classList.toggle("active", j === index));
  }

  function buildDots() {
    dotsWrap.innerHTML = Array.from({ length: maxStep() }, (_, i) => `<span class="dot" data-i="${i}"></span>`).join("");
    dotsWrap.querySelectorAll(".dot").forEach((d) => d.addEventListener("click", () => { go(parseInt(d.dataset.i)); start(); }));
    updateDots();
  }

  function apply() {
    track.style.transform = `translateX(-${index * (100 / perView())}%)`;
    updateDots();
  }

  function go(i) {
    index = ((i % maxStep()) + maxStep()) % maxStep();
    apply();
  }

  function nextSlide() { go(index + 1); }
  function prevSlide() { go(index - 1); }

  function start() { stop(); timer = setInterval(nextSlide, INTERVAL); }
  function stop() { if (timer) { clearInterval(timer); timer = null; } }

  if (total <= perView()) {
    prevBtn.style.display = "none";
    nextBtn.style.display = "none";
    return;
  }

  buildDots();
  go(0);
  start();

  carousel.addEventListener("mouseenter", stop);
  carousel.addEventListener("mouseleave", start);

  prevBtn.addEventListener("click", () => { prevSlide(); start(); });
  nextBtn.addEventListener("click", () => { nextSlide(); start(); });

  window.addEventListener("resize", () => {
    index = Math.min(index, Math.max(0, total - perView()));
    buildDots();
    apply();
  });

  let touchStartX = null;
  carousel.addEventListener("touchstart", (e) => { touchStartX = e.touches[0].clientX; }, { passive: true });
  carousel.addEventListener("touchend", (e) => {
    if (touchStartX === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX;
    if (Math.abs(dx) > 40) (dx < 0 ? nextSlide() : prevSlide());
    touchStartX = null;
    start();
  }, { passive: true });
}

function initCatalog(catalog, social) {
  const grid = document.getElementById("catalogGrid");
  const search = document.getElementById("catalogSearch");
  const chipsWrap = document.getElementById("catalogChips");
  const empty = document.getElementById("catalogEmpty");
  const modal = document.getElementById("catalogModal");
  const content = document.getElementById("modalContent");
  if (!grid || !search || !chipsWrap || !modal) return;

  let query = "";
  let activeCat = "";

  const fmt = (n) => (Number(n) || 0).toLocaleString("ru-RU");

  const cats = ["", ...new Set(catalog.map((i) => i.category).filter(Boolean))];
  chipsWrap.innerHTML = cats.map((c) =>
    `<button type="button" class="chip${c === activeCat ? " active" : ""}" data-cat="${c}">${c === "" ? t("catalog.all") : c}</button>`
  ).join("");

  function currentItems() {
    const q = query.toLowerCase();
    return catalog.filter((i) =>
      (activeCat === "" || (i.category || "") === activeCat) &&
      (!q || (i.name + " " + (i.description || "") + " " + (i.category || "")).toLowerCase().includes(q))
    );
  }

  function cardHTML(item) {
    return `
      <div class="catalog-card" data-name="${item.name}" role="button" tabindex="0" aria-label="${item.name}">
        ${item.image ? `<img class="catalog-photo" src="${item.image}" alt="${item.name}">` : `<div class="catalog-icon">${item.icon || "🛒"}</div>`}
        <h3>${item.name}</h3>
        <span class="catalog-cat">${item.category || ""}</span>
        <div class="catalog-price">${t("catalog.printPrice")}: ${fmt(item.pricePrint)} ₽</div>
      </div>`;
  }

  function renderGrid() {
    const list = currentItems();
    empty.hidden = list.length > 0;
    grid.innerHTML = list.map(cardHTML).join("");
    grid.querySelectorAll(".catalog-card").forEach((card) => {
      card.addEventListener("click", () => {
        const item = currentItems().find((i) => i.name === card.dataset.name);
        if (item) openModal(item);
      });
      card.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); card.click(); }
      });
    });
  }

  function openModal(item) {
    content.innerHTML = `
      <div class="modal-body">
        ${item.image ? `<img class="modal-image" src="${item.image}" alt="${item.name}">` : `<div class="modal-icon">${item.icon || "🛒"}</div>`}
        <h3>${item.name}</h3>
        ${item.category ? `<div class="modal-cat">${item.category}</div>` : ""}
        <p class="modal-desc">${item.description}</p>
        <div class="modal-prices">
          <div class="modal-price"><span>${t("catalog.printPrice")}</span><strong>${fmt(item.pricePrint)} ₽</strong></div>
          <div class="modal-price"><span>${t("catalog.modelPrice")}</span><strong>${fmt(item.priceModel)} ₽</strong></div>
        </div>
        <div class="modal-actions">
          <a class="btn-order" href="${social.whatsapp}?text=${encodeURIComponent("Hi, I want to order a print of: " + item.name + " (with delivery)")}" target="_blank">🖨 ${t("catalog.print")}</a>
          <a class="btn-buy" href="${social.whatsapp}?text=${encodeURIComponent("Hi, I want to buy the 3D model: " + item.name)}" target="_blank">💾 ${t("catalog.buy")}</a>
        </div>
      </div>`;
    modal.classList.add("open");
    document.body.style.overflow = "hidden";
  }

  function closeModal() {
    modal.classList.remove("open");
    document.body.style.overflow = "";
  }

  chipsWrap.addEventListener("click", (e) => {
    const chip = e.target.closest(".chip");
    if (!chip) return;
    activeCat = chip.dataset.cat;
    chipsWrap.querySelectorAll(".chip").forEach((c) => c.classList.toggle("active", c === chip));
    renderGrid();
  });

  search.addEventListener("input", () => {
    query = search.value.trim();
    renderGrid();
  });

  document.getElementById("modalClose").addEventListener("click", closeModal);
  modal.addEventListener("click", (e) => { if (e.target === modal) closeModal(); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeModal(); });

  renderGrid();
}

function updateThemeBtn(btn) {
  btn.textContent = document.body.classList.contains("dark") ? "☀" : "🌙";
}

/* ===== SINGLE-PAGE RENDERER ===== */

async function renderSite() {
  const services = await loadJSON("data/services.json");
  const social = await loadJSON("data/social.json");
  const promo = await loadJSON("data/promo.json");
  const materials = await loadJSON("data/materials.json");
  const pricing = await loadJSON("data/pricing.json");
  const faq = await loadJSON("data/faq.json");
  const testimonials = await loadJSON("data/testimonials.json");
  const gallery = await loadJSON("data/gallery.json");
  const catalog = await loadJSON("data/catalog.json");
  const news = await loadJSON("data/news.json");

  const promoHtml = promo.active
    ? `<div class="promo-banner" id="promoBanner"><span>${promo.text}</span><button class="promo-close" onclick="document.getElementById('promoBanner').style.display='none'">✕</button></div>`
    : "";

  app.innerHTML = `
    ${promoHtml}

    <div class="hero" id="home">
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

    <div class="services-section" id="services">
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

    <div class="process-section" id="process">
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

    <div class="stats-bar" id="stats">
      ${[1, 2, 3, 4].map((i) => `
        <div class="stat-item">
          <div class="value">${t("stats.stat" + i + ".value")}</div>
          <div class="label">${t("stats.stat" + i + ".label")}</div>
        </div>
      `).join("")}
    </div>

    <div class="why-section" id="why">
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

    <div class="materials-section" id="materials">
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

    <div class="pricing-section" id="pricing">
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

    <div class="gallery-section" id="gallery">
      <h2 class="section-title">${t("gallery.title")}</h2>
      <p class="section-subtitle">${t("gallery.subtitle")}</p>
      <div class="gallery-grid">
        ${gallery.map((item) => `
          <div class="gallery-card">
            ${item.image ? `<img src="${item.image}" alt="${item.title}">` : '<div class="gallery-photo-placeholder">🖼</div>'}
            <div class="info"><h3>${item.title}</h3><p>${item.description}</p></div>
          </div>
        `).join("")}
      </div>
    </div>

    <div class="catalog-section" id="catalog">
      <h2 class="section-title">${t("catalog.title")}</h2>
      <p class="section-subtitle">${t("catalog.subtitle")}</p>

      <div class="catalog-controls">
        <input type="search" id="catalogSearch" class="catalog-search" placeholder="${t("catalog.search")}">
        <div class="catalog-chips" id="catalogChips"></div>
      </div>

      <div class="catalog-grid" id="catalogGrid"></div>
      <div class="catalog-empty" id="catalogEmpty" hidden>${t("catalog.empty")}</div>
    </div>

    <div class="modal-overlay" id="catalogModal" hidden>
      <div class="modal-dialog">
        <button type="button" class="modal-close" id="modalClose" aria-label="${t("catalog.close")}">✕</button>
        <div id="modalContent"></div>
      </div>
    </div>

    <div class="testimonials-section" id="testimonials">
      <h2 class="section-title">${t("testimonials.title")}</h2>
      <p class="section-subtitle">${t("testimonials.subtitle")}</p>
      <div class="carousel" id="testimonialsCarousel">
        <button type="button" class="carousel-arrow carousel-prev" aria-label="${t("testimonials.prev")}">❮</button>
        <div class="carousel-viewport">
          <div class="carousel-track" id="testimonialTrack">
            ${testimonials.map((r) => `
              <div class="testimonial-slide">
                <div class="testimonial-card">
                  <div class="testimonial-rating">${ratingStars(r.rating)}</div>
                  <p class="testimonial-text">"${r.text}"</p>
                  <div class="testimonial-author">${r.name} · ${r.location}</div>
                </div>
              </div>
            `).join("")}
          </div>
        </div>
        <button type="button" class="carousel-arrow carousel-next" aria-label="${t("testimonials.next")}">❯</button>
        <div class="carousel-dots" id="testimonialDots"></div>
      </div>
    </div>

    <div class="faq-section" id="faq">
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

    <div class="size-ref-section" id="sizes">
      <h2 class="section-title">${t("fileRef.title")}</h2>
      <p class="section-subtitle">${t("fileRef.subtitle")}</p>
      <div class="size-ref-grid">
        <div class="size-ref-card"><div class="size-icon">📱</div><div class="size-label">${t("fileRef.small")}</div><div class="size-desc">${t("fileRef.smallSize")}</div></div>
        <div class="size-ref-card"><div class="size-icon">📦</div><div class="size-label">${t("fileRef.medium")}</div><div class="size-desc">${t("fileRef.mediumSize")}</div></div>
        <div class="size-ref-card"><div class="size-icon">🎁</div><div class="size-label">${t("fileRef.large")}</div><div class="size-desc">${t("fileRef.largeSize")}</div></div>
      </div>
    </div>

    <div class="map-section" id="map">
      <h2 class="section-title">${t("map.title")}</h2>
      <p class="section-subtitle">${t("map.subtitle")}</p>
      <div id="map-container" class="map-container"></div>
    </div>

    <div class="contact-section" id="contact">
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
          <div class="request-field full">
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
  initTestimonials();
  initCatalog(catalog, social);
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

  await renderSite();
  updateActiveNav();
  renderFooter();

  let ticking = false;
  window.addEventListener("scroll", () => {
    if (!ticking) {
      window.requestAnimationFrame(() => { updateActiveNav(); ticking = false; });
      ticking = true;
    }
  }, { passive: true });

  document.getElementById("langToggle").addEventListener("click", () => {
    document.getElementById("langDropdown").classList.toggle("open");
  });

  document.getElementById("langDropdown").addEventListener("click", async (e) => {
    if (e.target.dataset.lang) {
      await loadLang(e.target.dataset.lang);
      document.getElementById("langDropdown").classList.remove("open");
      await renderSite();
      updateActiveNav();
      renderFooter();
    }
  });

  document.addEventListener("click", (e) => {
    if (!e.target.closest(".lang-switcher")) {
      document.getElementById("langDropdown").classList.remove("open");
    }
  });
});