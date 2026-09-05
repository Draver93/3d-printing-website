const app = document.getElementById("app");
let currentLang = ["en", "ru", "sah"].includes(localStorage.getItem("lang")) ? localStorage.getItem("lang") : "en";
let translations = {};

const NAV_SECTIONS = ["home", "catalog", "gallery", "news", "faq"];
const SCROLL_ORDER = ["home", "stats", "gallery", "process", "news", "testimonials", "faq", "map", "contact"];
let currentView = "home";

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

function setNavActive(id) {
  document.querySelectorAll(".main-nav a").forEach((a) => {
    a.classList.toggle("active", a.dataset.page === id);
  });
}

function updateActiveNav() {
  if (currentView === "catalog") {
    setNavActive("catalog");
    return;
  }
  let current = "home";
  for (const id of SCROLL_ORDER) {
    const el = document.getElementById(id);
    if (!el) continue;
    if (el.getBoundingClientRect().top <= 140) {
      if (NAV_SECTIONS.includes(id)) current = id;
    }
  }
  setNavActive(current);
}

function switchView(showCatalog) {
  const homeView = document.getElementById("view-home");
  const catalogView = document.getElementById("view-catalog");
  if (!homeView || !catalogView) return;
  homeView.classList.toggle("active", !showCatalog);
  catalogView.classList.toggle("active", showCatalog);
  currentView = showCatalog ? "catalog" : "home";
  if (showCatalog) {
    setNavActive("catalog");
    if (window.scrollY) window.scrollTo(0, 0);
  } else {
    updateActiveNav();
  }
}

function applyHash() {
  const hash = (location.hash || "").replace("#", "");
  if (hash === "catalog") { switchView(true); return; }
  if (hash === "catalog-request") {
    switchView(true);
    const el = document.getElementById("catalogRequest");
    if (el) el.scrollIntoView();
    return;
  }
  switchView(false);
  if (hash) {
    const el = document.getElementById(hash);
    if (el) { el.scrollIntoView(); return; }
  }
  if (location.hash) history.replaceState(null, "", location.pathname + location.search);
}

function ratingStars(n) {
  return Array.from({ length: 5 }, (_, i) => (i < n ? "★" : "☆")).join("");
}

function initMap() {
  if (!window.L) return;
  const el = document.getElementById("map-container");
  if (!el) return;
  const map = L.map("map-container", { scrollWheelZoom: false }).setView([62.18, 117.63], 6);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "&copy; OpenStreetMap"
  }).addTo(map);
  L.marker([62.18, 117.63]).addTo(map).bindPopup("Suntar, Yakutia");
  map.on("wheel", (e) => {
    if (!e.originalEvent.ctrlKey) return;
    e.originalEvent.preventDefault();
    if (e.originalEvent.deltaY < 0) map.zoomIn();
    else map.zoomOut();
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

function initNewsCarousel() {
  const carousel = document.getElementById("newsCarousel");
  const track = document.getElementById("newsTrack");
  if (!carousel || !track) return;

  const slides = Array.from(track.children);
  const total = slides.length;
  const dotsWrap = document.getElementById("newsDots");
  const prevBtn = carousel.querySelector(".carousel-prev");
  const nextBtn = carousel.querySelector(".carousel-next");

  if (total <= 1) {
    if (prevBtn) prevBtn.style.display = "none";
    if (nextBtn) nextBtn.style.display = "none";
    return;
  }

  let index = 0;
  let timer = null;
  const INTERVAL = 5000;

  function buildDots() {
    dotsWrap.innerHTML = Array.from({ length: total }, (_, i) => `<span class="dot" data-i="${i}"></span>`).join("");
    dotsWrap.querySelectorAll(".dot").forEach((d) => d.addEventListener("click", () => { go(parseInt(d.dataset.i)); start(); }));
    updateDots();
  }

  function updateDots() {
    dotsWrap.querySelectorAll(".dot").forEach((el, j) => el.classList.toggle("active", j === index));
  }

  function apply() {
    track.style.transform = `translateX(-${index * 100}%)`;
    updateDots();
  }

  function go(i) {
    index = ((i % total) + total) % total;
    apply();
  }

  function nextSlide() { go(index + 1); }
  function prevSlide() { go(index - 1); }

  function start() { stop(); timer = setInterval(nextSlide, INTERVAL); }
  function stop() { if (timer) { clearInterval(timer); timer = null; } }

  buildDots();
  go(0);
  start();

  carousel.addEventListener("mouseenter", stop);
  carousel.addEventListener("mouseleave", start);

  prevBtn.addEventListener("click", () => { prevSlide(); start(); });
  nextBtn.addEventListener("click", () => { nextSlide(); start(); });

  let touchStartX = null;
  let swipeSuppress = false;
  carousel.addEventListener("touchstart", (e) => { touchStartX = e.touches[0].clientX; }, { passive: true });
  carousel.addEventListener("touchend", (e) => {
    if (touchStartX === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX;
    if (Math.abs(dx) > 40) {
      swipeSuppress = true;
      setTimeout(() => { swipeSuppress = false; }, 350);
      (dx < 0 ? nextSlide() : prevSlide());
    }
    touchStartX = null;
    start();
  }, { passive: true });

  track.querySelectorAll(".news-card").forEach((card) => {
    card.addEventListener("click", () => {
      if (swipeSuppress) return;
      openNewsModal(parseInt(card.dataset.newsIndex));
    });
    card.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        openNewsModal(parseInt(card.dataset.newsIndex));
      }
    });
  });
}

function openNewsModal(index) {
  const modal = document.getElementById("newsModal");
  if (!modal) return;
  const item = window.newsData && window.newsData[index];
  if (!item) return;

  const cover = document.getElementById("newsModalCover");
  cover.innerHTML = item.image
    ? `<img src="${item.image}" alt="${item.title}">`
    : `<div class="news-cover-empty"><span>🖨</span></div>`;

  document.getElementById("newsModalDate").textContent = item.date;
  document.getElementById("newsModalTitle").textContent = item.title;
  document.getElementById("newsModalContent").innerHTML = (item.content || item.description || "")
    .split(/\n{2,}/)
    .map((para) => `<p>${para.trim()}</p>`)
    .join("");

  modal.hidden = false;
  document.body.classList.add("modal-open");
  document.getElementById("newsModalTitle").focus({ preventScroll: true });
}

function closeNewsModal() {
  const modal = document.getElementById("newsModal");
  if (!modal) return;
  modal.hidden = true;
  document.body.classList.remove("modal-open");
}

function initNewsModal() {
  const modal = document.getElementById("newsModal");
  if (!modal) return;
  modal.querySelectorAll("[data-news-close]").forEach((el) => {
    el.addEventListener("click", closeNewsModal);
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !modal.hidden) closeNewsModal();
  });
}

function initCatalogWorkbench(catalog, social) {
  const list = document.getElementById("catalogList");
  const search = document.getElementById("catalogSearch");
  const chipsWrap = document.getElementById("catalogChips");
  const empty = document.getElementById("catalogEmpty");
  const preview3d = document.getElementById("preview3d");
  const details = document.getElementById("previewDetails");
  if (!list || !search || !chipsWrap || !preview3d || !details) return;

  let query = "";
  let activeCat = "";
  let selectedName = "";

  const fmt = (n) => (Number(n) || 0).toLocaleString("ru-RU");

  const cats = ["", ...new Set(catalog.map((i) => i.category).filter(Boolean))];
  chipsWrap.innerHTML = cats.map((c) =>
    `<button type="button" class="chip" data-cat="${c}">${c === "" ? t("catalog.all") : c}</button>`
  ).join("");

  function currentItems() {
    const q = query.toLowerCase();
    return catalog.filter((i) =>
      (activeCat === "" || (i.category || "") === activeCat) &&
      (!q || (i.name + " " + (i.description || "") + " " + (i.category || "")).toLowerCase().includes(q))
    );
  }

  function rowHTML(item, i) {
    return `
      <button type="button" class="catalog-list-row" data-i="${i}">
        ${item.image ? `<img class="catalog-list-img" src="${item.image}" alt="">` : `<span class="catalog-list-icon">${item.icon || "🛒"}</span>`}
        <span class="catalog-list-name">
          <strong>${item.name}</strong>
          <small>${item.category || ""}</small>
        </span>
        <span class="catalog-list-price">${fmt(item.pricePrint)} ₽</span>
      </button>`;
  }

  function render3d(item) {
    if (item.model) {
      preview3d.innerHTML = `
        <model-viewer src="${item.model}" alt="${item.name}" camera-controls auto-rotate shadow-intensity="1" exposure="1.1"
          style="width:100%;height:100%"></model-viewer>`;
    } else {
      preview3d.innerHTML = `<div class="catalog-3d-placeholder"><span class="catalog-3d-emoji">🧊</span><span>${t("catalog.no3d")}</span></div>`;
    }
  }

  function renderDetails(item) {
    details.innerHTML = `
      <div class="details-head">
        <h3>${item.name}</h3>
        ${item.category ? `<span class="details-cat">${item.category}</span>` : ""}
      </div>
      <p class="details-desc">${item.description}</p>
      <div class="details-prices">
        <div class="cat-price-box"><span>${t("catalog.printPrice")}</span><strong>${fmt(item.pricePrint)} ₽</strong></div>
        <div class="cat-price-box"><span>${t("catalog.modelPrice")}</span><strong>${fmt(item.priceModel)} ₽</strong></div>
      </div>
      <div class="details-actions">
        <a class="btn-order" href="${social.whatsapp}?text=${encodeURIComponent("Hi, I want to order a print of: " + item.name + " (with delivery)")}" target="_blank">🖨 ${t("catalog.print")}</a>
        <a class="btn-buy" href="${social.whatsapp}?text=${encodeURIComponent("Hi, I want to buy the 3D model: " + item.name)}" target="_blank">💾 ${t("catalog.buy")}</a>
      </div>`;
  }

  function selectItem(item) {
    selectedName = item.name;
    const items = currentItems();
    list.querySelectorAll(".catalog-list-row").forEach((row) => {
      row.classList.toggle("active", items[Number(row.dataset.i)] && items[Number(row.dataset.i)].name === item.name);
    });
    render3d(item);
    renderDetails(item);
  }

  function renderList() {
    const items = currentItems();
    empty.hidden = items.length > 0;
    list.innerHTML = items.map((item, i) => rowHTML(item, i)).join("");

    if (items.length === 0) {
      preview3d.innerHTML = `<div class="catalog-3d-placeholder"><span class="catalog-3d-emoji">🧊</span><span>${t("catalog.select")}</span></div>`;
      details.innerHTML = `<div class="catalog-select-hint">${t("catalog.select")}</div>`;
      selectedName = "";
      return;
    }

    const keep = items.findIndex((i) => i.name === selectedName);
    selectItem(items[keep >= 0 ? keep : 0]);
  }

  list.addEventListener("click", (e) => {
    const row = e.target.closest(".catalog-list-row");
    if (!row) return;
    const items = currentItems();
    const item = items[Number(row.dataset.i)];
    if (item) selectItem(item);
  });

  chipsWrap.addEventListener("click", (e) => {
    const chip = e.target.closest(".chip");
    if (!chip) return;
    activeCat = chip.dataset.cat;
    chipsWrap.querySelectorAll(".chip").forEach((c) => c.classList.toggle("active", c === chip));
    renderList();
  });

  search.addEventListener("input", () => {
    query = search.value.trim();
    renderList();
  });

  renderList();
}

function initCatalogRequestForm(email, materials, social) {
  const form = document.getElementById("catalogRequestForm");
  if (!form) return;

  const materialSelect = document.getElementById("reqMaterial");
  const materialHint = document.getElementById("materialHint");
  const fileInput = document.getElementById("reqFiles");
  const fileList = document.getElementById("fileList");
  const status = document.getElementById("catalogReqStatus");
  const submitBtn = document.getElementById("catalogReqSubmit");
  let files = [];

  function updateMaterialHint() {
    const m = materials.find((x) => x.name === materialSelect.value);
    if (m && materialHint) materialHint.textContent = t("catalog.reqMaterialHint") + ": " + m.bestFor;
  }
  updateMaterialHint();
  materialSelect.addEventListener("change", updateMaterialHint);

  function renderFiles() {
    fileList.innerHTML = files.map((f, i) =>
      `<span class="file-chip">📎 ${f.name}<button type="button" data-f="${i}" aria-label="${t("catalog.reqRemove")}">✕</button></span>`
    ).join("");
    fileList.querySelectorAll("button").forEach((btn) => {
      btn.addEventListener("click", () => {
        files.splice(Number(btn.dataset.f), 1);
        renderFiles();
      });
    });
  }

  fileInput.addEventListener("change", () => {
    for (const f of fileInput.files) {
      if (!files.some((x) => x.name === f.name && x.size === f.size)) files.push(f);
    }
    fileInput.value = "";
    renderFiles();
  });

  function waText(values) {
    return [
      "New custom request",
      "Name: " + values.name,
      "Contact: " + values.contact,
      "For: " + (values.purpose || "-"),
      "Material: " + values.material,
      "Details:",
      values.description,
      "Files: " + (files.map((f) => f.name).join(", ") || "none"),
    ].join("\n");
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const name = form.name.value.trim();
    const contact = form.contact.value.trim();
    const description = form.description.value.trim();
    if (!name || !contact || !description) {
      status.hidden = false;
      status.className = "request-status error";
      status.textContent = t("request.required");
      return;
    }

    const waLink = `${social.whatsapp}?text=${encodeURIComponent(waText({ name, contact, purpose: form.purpose.value.trim(), material: materialSelect.value, description }))}`;
    const handoff = `<a class="handoff" href="${waLink}" target="_blank">📲 ${t("catalog.reqWhatsapp")}</a>`;

    status.hidden = false;
    status.className = "request-status success";
    status.innerHTML = `${t("catalog.reqSuccess")} ${handoff}`;
    submitBtn.disabled = true;
    submitBtn.textContent = t("catalog.reqSending");

    if (email) {
      try {
        const res = await fetch("https://formsubmit.co/ajax/" + email, {
          method: "POST",
          headers: { "Content-Type": "application/json", Accept: "application/json" },
          body: JSON.stringify({
            name,
            contact,
            purpose: form.purpose.value.trim(),
            material: materialSelect.value,
            description,
            files: files.map((f) => f.name).join(", "),
            _subject: `Custom model request - Suntar-Plastic (${name})`,
            _captcha: "false",
            _honey: form.querySelector('[name="_honey"]').value,
            _template: "table",
          }),
        });
        const data = await res.json().catch(() => ({}));
        if (!(res.ok && data.success !== false)) {
          status.className = "request-status error";
          status.innerHTML = `${t("catalog.reqError")} ${handoff}`;
        }
      } catch (err) {
        status.className = "request-status error";
        status.innerHTML = `${t("catalog.reqError")} ${handoff}`;
      }
    }

    submitBtn.disabled = false;
    submitBtn.textContent = t("catalog.reqSend");
    form.reset();
    files = [];
    renderFiles();
    updateMaterialHint();
  });
}

function updateThemeBtn(btn) {
  btn.textContent = document.body.classList.contains("dark") ? "☀" : "🌙";
}

/* ===== SINGLE-PAGE RENDERER ===== */

async function renderSite() {
  const social = await loadJSON("data/social.json");
  const promo = await loadJSON("data/promo.json");
  const materials = await loadJSON("data/materials.json");
  const faq = await loadJSON("data/faq.json");
  const testimonials = await loadJSON("data/testimonials.json");
  const gallery = await loadJSON("data/gallery.json");
  const catalog = await loadJSON("data/catalog.json");
  const news = await loadJSON("data/news.json");

  const promoHtml = promo.active
    ? `<div class="promo-banner" id="promoBanner"><span>${promo.text}</span><button class="promo-close" onclick="document.getElementById('promoBanner').style.display='none'">✕</button></div>`
    : "";

  app.innerHTML = `
    <div class="views">

    <div class="view active" id="view-home">
    ${promoHtml}

    <div class="hero" id="home">
      <div class="hero-text">
        <h1>${t("hero.title")} <span>${t("hero.titleHighlight")}</span></h1>
        <p>${t("hero.subtitle")}</p>
      </div>
      <div class="hero-visual"><div class="hero-icon">🖨</div></div>
    </div>

    <div class="stats-bar" id="stats">
      ${[1, 2, 3, 4].map((i) => `
        <div class="stat-item">
          <div class="value">${t("stats.stat" + i + ".value")}</div>
          <div class="label">${t("stats.stat" + i + ".label")}</div>
        </div>
      `).join("")}
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

    <div class="request-band">
      <h2>${t("ctaCatalog.title")}</h2>
      <p>${t("ctaCatalog.text")}</p>
      <a href="#catalog-request" class="btn-primary btn-band">${t("ctaCatalog.button")}</a>
    </div>

    <div class="news-section" id="news">
      <h2 class="section-title">${t("news.title")}</h2>
      <p class="section-subtitle">${t("news.subtitle")}</p>
      <div class="carousel news-carousel" id="newsCarousel">
        <button type="button" class="carousel-arrow carousel-prev" aria-label="${t("news.prev")}">❮</button>
        <div class="carousel-viewport">
          <div class="carousel-track" id="newsTrack">
            ${news.map((item, i) => `
              <div class="news-slide">
                <article class="news-card" role="button" tabindex="0" aria-label="${t("news.readArticle")}: ${item.title}" data-news-index="${i}">
                  ${item.image ? `<div class="news-cover"><img src="${item.image}" alt="${item.title}" loading="lazy"></div>` : `<div class="news-cover news-cover-empty"><span>🖨</span></div>`}
                  <div class="news-body">
                    <div class="date">${item.date}</div>
                    <h3>${item.title}</h3>
                    <p>${item.description}</p>
                    <span class="news-read-more">${t("news.readMore")} →</span>
                  </div>
                </article>
              </div>
            `).join("")}
          </div>
        </div>
        <button type="button" class="carousel-arrow carousel-next" aria-label="${t("news.next")}">❯</button>
        <div class="carousel-dots" id="newsDots"></div>
      </div>
      <div class="news-modal" id="newsModal" hidden>
        <div class="news-modal-backdrop" data-news-close></div>
        <div class="news-modal-card" role="dialog" aria-modal="true" aria-labelledby="newsModalTitle">
          <button type="button" class="news-modal-close" data-news-close aria-label="${t("news.close")}">✕</button>
          <div class="news-modal-cover" id="newsModalCover"></div>
          <div class="news-modal-head">
            <div class="date" id="newsModalDate"></div>
            <h3 id="newsModalTitle"></h3>
          </div>
          <div class="news-modal-content" id="newsModalContent"></div>
        </div>
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

    <div class="map-section" id="map">
      <h2 class="section-title">${t("map.title")}</h2>
      <p class="section-subtitle">${t("map.subtitle")}</p>
      <div id="map-container" class="map-container"></div>
    </div>

    <div class="contact-section" id="contact">
      <div class="social-box">
        <h2>${t("cta.title")}</h2>
        <p>${t("cta.subtitle")}</p>
        <div class="social-row">
          ${social.instagram ? `<a href="${social.instagram}" target="_blank" rel="noopener" class="social-link"><span class="social-ico">📷</span>Instagram</a>` : ""}
          ${social.telegram ? `<a href="${social.telegram}" target="_blank" rel="noopener" class="social-link"><span class="social-ico">✈</span>Telegram</a>` : ""}
          ${social.whatsapp ? `<a href="${social.whatsapp}" target="_blank" rel="noopener" class="social-link"><span class="social-ico">💬</span>WhatsApp</a>` : ""}
        </div>
      </div>
    </div>
    </div>

    <div class="view" id="view-catalog">
      <section class="catalog-workbench">
        <aside class="catalog-sidebar">
          <div class="catalog-sidebar-head">
            <h2>${t("catalog.title")}</h2>
            <p>${t("catalog.subtitle")}</p>
          </div>
          <input type="search" id="catalogSearch" class="catalog-search" placeholder="${t("catalog.search")}">
          <div class="catalog-chips" id="catalogChips"></div>
          <div class="catalog-list" id="catalogList"></div>
          <div class="catalog-empty" id="catalogEmpty" hidden>${t("catalog.empty")}</div>
        </aside>

        <div class="catalog-stage">
          <div class="catalog-3d" id="preview3d">
            <div class="catalog-3d-placeholder"><span class="catalog-3d-emoji">🧊</span><span>${t("catalog.select")}</span></div>
          </div>
        </div>

        <aside class="catalog-details" id="previewDetails">
          <div class="catalog-select-hint">${t("catalog.select")}</div>
        </aside>
      </section>

      <section class="catalog-request" id="catalogRequest">
        <h2 class="section-title">${t("catalog.requestTitle")}</h2>
        <p class="section-subtitle">${t("catalog.requestSubtitle")}</p>
        <div class="catalog-request-card">
          <form id="catalogRequestForm" class="request-form" novalidate>
            <div class="request-field">
              <label for="reqNameInput">${t("catalog.reqName")}</label>
              <input id="reqNameInput" name="name" type="text" required>
            </div>
            <div class="request-field">
              <label for="reqContactInput">${t("catalog.reqContact")}</label>
              <input id="reqContactInput" name="contact" type="text" placeholder="${t("catalog.reqContactPlaceholder")}" required>
            </div>
            <div class="request-field">
              <label for="reqPurpose">${t("catalog.reqPurpose")}</label>
              <input id="reqPurpose" name="purpose" type="text" placeholder="${t("catalog.reqPurposePlaceholder")}">
            </div>
            <div class="request-field">
              <label for="reqMaterial">${t("catalog.reqMaterial")}</label>
              <select id="reqMaterial" name="material">
                ${materials.map((m) => `<option value="${m.name}">${m.icon} ${m.name}</option>`).join("")}
              </select>
              <div class="material-hint" id="materialHint"></div>
              <details class="material-guide">
                <summary>${t("catalog.materialGuide")}</summary>
                ${materials.map((m) => `<div class="material-guide-row"><strong>${m.icon} ${m.name}</strong><span>${m.bestFor}</span></div>`).join("")}
              </details>
            </div>
            <div class="request-field full">
              <label for="reqDescription">${t("catalog.reqDescription")}</label>
              <textarea id="reqDescription" name="description" rows="5" placeholder="${t("catalog.reqDescriptionPlaceholder")}" required></textarea>
            </div>
            <div class="request-field full">
              <label for="reqFiles">${t("catalog.reqAttachments")}</label>
              <input type="file" id="reqFiles" name="files" multiple accept=".stl,.obj,.3mf,.step,.stp,.png,.jpg,.jpeg,.webp">
              <div class="file-list" id="fileList"></div>
              <div class="material-hint">${t("catalog.reqAttachmentsHint")}</div>
            </div>
            <input type="text" name="_honey" style="display:none" tabindex="-1" autocomplete="off">
            <button type="submit" class="btn-primary" id="catalogReqSubmit">${t("catalog.reqSend")}</button>
            <div class="request-status" id="catalogReqStatus" hidden></div>
          </form>
        </div>
      </section>
    </div>

    </div>
  `;

  setTimeout(initMap, 100);
  window.newsData = news;
  initNewsCarousel();
  initNewsModal();
  initTestimonials();
  initCatalogWorkbench(catalog, social);
  initCatalogRequestForm(social.contactEmail, materials, social);
  applyHash();
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
  renderFooter();
  window.addEventListener("hashchange", applyHash);

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
      applyHash();
      renderFooter();
    }
  });

  document.addEventListener("click", (e) => {
    if (!e.target.closest(".lang-switcher")) {
      document.getElementById("langDropdown").classList.remove("open");
    }
  });
});