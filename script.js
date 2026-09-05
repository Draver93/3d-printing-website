const app = document.getElementById("app");
let currentLang = ["en", "ru", "sah"].includes(localStorage.getItem("lang")) ? localStorage.getItem("lang") : "en";
let translations = {};

const NAV_SECTIONS = ["home", "gallery", "news", "faq", "catalog", "track"];
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
  const res = await fetch(path + "?v=" + Date.now());
  return res.json();
}

function setNavActive(id) {
  document.querySelectorAll(".main-nav a, .mobile-nav a").forEach((a) => {
    a.classList.toggle("active", a.dataset.page === id);
  });
}

function updateActiveNav() {
  if (currentView !== "home") {
    setNavActive(currentView);
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

function switchView(view) {
  const homeView = document.getElementById("view-home");
  const catalogView = document.getElementById("view-catalog");
  const trackView = document.getElementById("view-track");
  if (!homeView || !catalogView || !trackView) return;
  homeView.classList.toggle("active", view === "home");
  catalogView.classList.toggle("active", view === "catalog");
  trackView.classList.toggle("active", view === "track");
  currentView = view === "catalog" || view === "track" ? view : "home";
  if (currentView !== "home") {
    setNavActive(currentView);
    if (window.scrollY) window.scrollTo(0, 0);
  } else {
    updateActiveNav();
  }
}

function applyHash() {
  const hash = (location.hash || "").replace("#", "");
  if (hash === "catalog") { switchView("catalog"); return; }
  if (hash === "track") { switchView("track"); return; }
  if (hash === "catalog-request") {
    switchView("catalog");
    const el = document.getElementById("catalogRequest");
    if (el) el.scrollIntoView();
    return;
  }
  switchView("home");
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

function initGalleryPaging(gallery) {
  const grid = document.getElementById("galleryGrid");
  const prevBtn = document.getElementById("galleryPrev");
  const nextBtn = document.getElementById("galleryNext");
  const info = document.getElementById("galleryPageInfo");
  if (!grid || !prevBtn || !nextBtn || !info) return;

  const PER_PAGE = 6;
  let page = 0;
  const pages = Math.max(1, Math.ceil(gallery.length / PER_PAGE));

  function cardHTML(item) {
    return `
      <div class="gallery-card">
        ${item.image ? `<img src="${item.image}" alt="${item.title}" loading="lazy">` : '<div class="gallery-photo-placeholder">🖼</div>'}
        <div class="info"><h3>${item.title}</h3><p>${item.description}</p></div>
      </div>`;
  }

  function render() {
    grid.innerHTML = gallery.slice(page * PER_PAGE, (page + 1) * PER_PAGE).map(cardHTML).join("");
    prevBtn.disabled = page === 0;
    nextBtn.disabled = page >= pages - 1;
    info.textContent = `${page + 1} / ${pages}`;
  }

  prevBtn.addEventListener("click", () => { page = Math.max(0, page - 1); render(); });
  nextBtn.addEventListener("click", () => { page = Math.min(pages - 1, page + 1); render(); });

  render();
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

function escHtml(s) {
  return String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function initCatalogWorkbench(catalog, social) {
  const list = document.getElementById("catalogList");
  const search = document.getElementById("catalogSearch");
  const treeWrap = document.getElementById("catalogTree");
  const empty = document.getElementById("catalogEmpty");
  const preview3d = document.getElementById("preview3d");
  const details = document.getElementById("previewDetails");
  const crumbsEl = document.getElementById("catalogCrumbs");
  const countEl = document.getElementById("catalogCount");
  const sortEl = document.getElementById("catalogSort");
  if (!list || !search || !treeWrap || !empty || !preview3d || !details || !crumbsEl || !countEl || !sortEl) return;

  const CAT_SEP = " > ";
  const SORT_ORDER = { pop: 0, "price-asc": 0, "price-desc": 0 };

  let query = "";
  let activePath = "";
  let sortMode = "pop";
  let selectedName = "";
  let currentItem = null;
  const openSet = new Set();

  const fmt = (n) => (Number(n) || 0).toLocaleString("ru-RU");

  const tree = { name: "", count: 0, children: new Map() };
  for (const item of catalog) {
    const segs = (item.category || "").split(CAT_SEP).map((s) => s.trim()).filter(Boolean);
    let node = tree;
    for (const seg of segs) {
      if (!node.children.has(seg)) node.children.set(seg, { name: seg, count: 0, children: new Map() });
      node = node.children.get(seg);
      node.count++;
    }
  }
  tree.count = catalog.length;

  function nodeHtml(node, path) {
    let html = "";
    const children = [...node.children.entries()].sort((a, b) => a[0].localeCompare(b[0]));
    for (const [name, child] of children) {
      const full = path ? path + CAT_SEP + name : name;
      const hasChildren = child.children.size > 0;
      const isOpen = openSet.has(full);
      html += `
        <li class="cat-tree-item">
          <div class="cat-tree-row">
            <button type="button" class="tree-toggle ${hasChildren ? (isOpen ? "open" : "") : "leaf"}" data-toggle="${escHtml(full)}" aria-label="${escHtml(name)}">${hasChildren ? "▸" : ""}</button>
            <button type="button" class="tree-link ${full === activePath ? "active" : ""}" data-cat="${escHtml(full)}">
              <span class="tree-name">${escHtml(name)}</span>
              <span class="tree-count">${child.count}</span>
            </button>
          </div>
          ${hasChildren && isOpen ? `<ul class="tree-sub">${nodeHtml(child, full)}</ul>` : ""}
        </li>`;
    }
    return html;
  }

  function renderTree() {
    treeWrap.innerHTML = `
      <ul class="cat-tree">
        <li class="cat-tree-item">
          <div class="cat-tree-row">
            <button type="button" class="tree-link root ${activePath === "" ? "active" : ""}" data-cat="">
              <span class="tree-name">${escHtml(t("catalog.all"))}</span>
              <span class="tree-count">${tree.count}</span>
            </button>
          </div>
        </li>
        ${nodeHtml(tree, "")}
      </ul>`;
  }

  function itemMatches(item) {
    const cat = item.category || "";
    if (activePath && !(cat === activePath || cat.startsWith(activePath + CAT_SEP))) return false;
    const q = query.toLowerCase();
    return !q || (item.name + " " + (item.description || "") + " " + cat).toLowerCase().includes(q);
  }

  function currentItems() {
    const items = catalog.filter(itemMatches);
    if (sortMode === "price-asc") items.sort((a, b) => (Number(a.pricePrint) || 0) - (Number(b.pricePrint) || 0));
    else if (sortMode === "price-desc") items.sort((a, b) => (Number(b.pricePrint) || 0) - (Number(a.pricePrint) || 0));
    return items;
  }

  function renderCrumbs() {
    const parts = activePath ? activePath.split(CAT_SEP) : [];
    let html = `<button type="button" class="crumb-link" data-crumb="">${escHtml(t("catalog.all"))}</button>`;
    let acc = "";
    parts.forEach((p, i) => {
      acc = acc ? acc + CAT_SEP + p : p;
      html += `<span class="crumb-sep">/</span>`;
      if (i === parts.length - 1) html += `<span class="crumb-current">${escHtml(p)}</span>`;
      else html += `<button type="button" class="crumb-link" data-crumb="${escHtml(acc)}">${escHtml(p)}</button>`;
    });
    crumbsEl.innerHTML = html;
  }

  function renderToolbar(items) {
    renderCrumbs();
    countEl.textContent = t("catalog.found").replace("{n}", String(items.length));
  }

  function rowHTML(item, i) {
    return `
      <button type="button" class="catalog-list-row" data-i="${i}">
        ${item.image ? `<img class="catalog-list-img" src="${item.image}" alt="">` : `<span class="catalog-list-icon">${item.icon || "🛒"}</span>`}
        <span class="catalog-list-name">
          <strong>${escHtml(item.name)}</strong>
          <small>${escHtml(item.category || "")}</small>
        </span>
        <span class="catalog-list-price">${fmt(item.pricePrint)} ₽</span>
      </button>`;
  }

  function render3d(item) {
    if (item.model) {
      preview3d.innerHTML = `
        <model-viewer src="${item.model}" alt="${escHtml(item.name)}" camera-controls auto-rotate shadow-intensity="1" exposure="1.1"
          style="width:100%;height:100%"></model-viewer>`;
    } else {
      preview3d.innerHTML = `<div class="catalog-3d-placeholder"><span class="catalog-3d-emoji">🧊</span><span>${t("catalog.no3d")}</span></div>`;
    }
  }

  function renderDetails(item) {
    details.innerHTML = `
      <div class="details-head">
        <h3>${escHtml(item.name)}</h3>
        ${item.category ? `<span class="details-cat">${escHtml(item.category)}</span>` : ""}
      </div>
      <p class="details-desc">${escHtml(item.description)}</p>
      <div class="details-prices">
        <div class="cat-price-box"><span>${t("catalog.printPrice")}</span><strong>${fmt(item.pricePrint)} ₽</strong></div>
        <div class="cat-price-box"><span>${t("catalog.modelPrice")}</span><strong>${fmt(item.priceModel)} ₽</strong></div>
      </div>
      <div class="details-actions">
        <button type="button" class="btn-order" data-order="print">🖨 ${t("catalog.print")}</button>
        <button type="button" class="btn-buy" data-order="buy">💾 ${t("catalog.buy")}</button>
      </div>`;
  }

  function selectItem(item) {
    selectedName = item.name;
    currentItem = item;
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
    renderToolbar(items);

    if (items.length === 0) {
      preview3d.innerHTML = `<div class="catalog-3d-placeholder"><span class="catalog-3d-emoji">🧊</span><span>${t("catalog.select")}</span></div>`;
      details.innerHTML = `<div class="catalog-select-hint">${t("catalog.select")}</div>`;
      selectedName = "";
      return;
    }

    const keep = items.findIndex((i) => i.name === selectedName);
    selectItem(items[keep >= 0 ? keep : 0]);
  }

  function selectPath(path) {
    activePath = path;
    if (path) {
      const parts = path.split(CAT_SEP);
      for (let i = parts.length; i >= 1; i--) openSet.add(parts.slice(0, i).join(CAT_SEP));
    }
    renderTree();
    renderList();
  }

  list.addEventListener("click", (e) => {
    const row = e.target.closest(".catalog-list-row");
    if (!row) return;
    const items = currentItems();
    const item = items[Number(row.dataset.i)];
    if (item) selectItem(item);
  });

  treeWrap.addEventListener("click", (e) => {
    const toggle = e.target.closest(".tree-toggle");
    if (toggle) {
      const p = toggle.dataset.toggle;
      if (openSet.has(p)) openSet.delete(p);
      else openSet.add(p);
      renderTree();
      return;
    }
    const link = e.target.closest(".tree-link");
    if (link) selectPath(link.dataset.cat || "");
  });

  crumbsEl.addEventListener("click", (e) => {
    const crumb = e.target.closest(".crumb-link");
    if (!crumb) return;
    selectPath(crumb.dataset.crumb || "");
  });

  sortEl.addEventListener("change", () => {
    sortMode = sortEl.value in SORT_ORDER ? sortEl.value : "pop";
    renderList();
  });

  details.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-order]");
    if (!btn || !currentItem) return;
    const type = btn.dataset.order;
    const item = currentItem;
    window.openOrderModal({
      type,
      name: item.name,
      price: type === "print" ? item.pricePrint : item.priceModel,
    });
  });

  search.addEventListener("input", () => {
    query = search.value.trim();
    renderList();
  });

  renderTree();
  renderList();
}

function generateRequestId() {
  const d = new Date();
  const ym = String(d.getFullYear()).slice(2) + String(d.getMonth() + 1).padStart(2, "0");
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let suffix = "";
  for (let i = 0; i < 4; i++) suffix += chars[Math.floor(Math.random() * chars.length)];
  return `SP-${ym}-${suffix}`;
}

function initOrderModal(email, social) {
  initOrderModal._email = email;
  initOrderModal._social = social;
  if (document.getElementById("orderModal")) return;

  const modal = document.createElement("div");
  modal.id = "orderModal";
  modal.className = "order-modal";
  modal.hidden = true;
  modal.setAttribute("role", "dialog");
  modal.setAttribute("aria-modal", "true");
  modal.innerHTML = `
    <div class="order-modal-backdrop" data-order-close></div>
    <div class="order-modal-card">
      <button class="order-modal-close" data-order-close aria-label="Close">✕</button>
      <div class="order-modal-body" id="orderModalBody"></div>
    </div>`;
  document.body.appendChild(modal);

  function close() {
    modal.hidden = true;
    document.body.classList.remove("modal-open");
  }

  modal.querySelectorAll("[data-order-close]").forEach((el) => {
    el.addEventListener("click", close);
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !modal.hidden) close();
  });
  window.addEventListener("hashchange", () => {
    if (!modal.hidden) close();
  }, { passive: true });

  window._orderModalClose = close;
}

window.openOrderModal = function (context) {
  const email = initOrderModal._email;
  const social = initOrderModal._social;
  const modal = document.getElementById("orderModal");
  const body = document.getElementById("orderModalBody");
  if (!modal || !body) return;

  const fmt = (n) => (Number(n) || 0).toLocaleString("ru-RU");
  const purpose = context.type === "print" ? t("catalog.print") : context.type === "buy" ? t("catalog.buy") : t("catalog.requestTitle");
  const title = context.name ? `${purpose}: ${context.name}` : purpose;

  const itemCard = context.name ? `
    <div class="order-item-card">
      <strong>${escHtml(context.name)}</strong>
      ${context.price ? `<span class="order-item-price">${fmt(context.price)} ₽</span>` : ""}
    </div>` : "";

  body.innerHTML = `
    <h3 class="order-title">${escHtml(title)}</h3>
    ${itemCard}
    <form id="orderForm" novalidate>
      <input type="text" name="_honey" style="display:none" tabindex="-1" autocomplete="off">
      <div class="order-field">
        <label for="orderName">${t("catalog.reqName")}</label>
        <input id="orderName" name="name" type="text" required>
      </div>
      <div class="order-field">
        <label for="orderContact">${t("catalog.reqContact")}</label>
        <input id="orderContact" name="contact" type="text" placeholder="${t("catalog.reqContactPlaceholder")}" required>
      </div>
      <div class="order-field">
        <label for="orderMessage">${t("catalog.orderMessage")}</label>
        <textarea id="orderMessage" name="message" rows="2" placeholder="${t("catalog.orderMessagePlaceholder")}"></textarea>
      </div>
      <button type="submit" class="btn-primary order-submit" id="orderSubmit">${t("catalog.reqSend")}</button>
      <div class="request-status" id="orderStatus" hidden></div>
    </form>`;

  const form = body.querySelector("#orderForm");
  const statusEl = body.querySelector("#orderStatus");
  const submitBtn = body.querySelector("#orderSubmit");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const name = form.name.value.trim();
    const contact = form.contact.value.trim();
    const message = form.message.value.trim();

    if (!name || !contact) {
      statusEl.hidden = false;
      statusEl.className = "request-status error";
      statusEl.textContent = t("request.required");
      return;
    }

    const requestId = generateRequestId();
    try { localStorage.setItem("lastRequestId", requestId); } catch (err) {}

    const purposeLabel = context.type === "print" ? "Order print" : context.type === "buy" ? "Buy model" : "Custom request";

    const waLines = [
      purposeLabel + (context.name ? ": " + context.name : ""),
      context.price ? "Price: " + fmt(context.price) + " ₽" : "",
      "Request ID: " + requestId,
      "Name: " + name,
      "Contact: " + contact,
      message ? "Message: " + message : "",
    ].filter(Boolean).join("\n");

    const waLink = `${social.whatsapp}?text=${encodeURIComponent(waLines)}`;
    const handoff = `<a class="handoff" href="${waLink}" target="_blank">📲 ${t("catalog.reqWhatsapp")}</a>`;

    statusEl.hidden = false;
    statusEl.className = "request-status success";
    statusEl.innerHTML = `
      <div class="request-id-block">
        <div class="request-id-label">${t("catalog.reqIdLabel")}</div>
        <div class="request-id-field">
          <span class="request-id-value">${requestId}</span>
          <button type="button" class="request-id-copy" data-copy-id="${requestId}">${t("catalog.reqIdCopy")}</button>
        </div>
        <div class="request-id-hint">${t("catalog.reqIdHint").replace("{track}", '<a href="#track">').replace("{/track}", "</a>")}</div>
      </div>
      ${t("catalog.reqSuccess")} ${handoff}`;
    submitBtn.disabled = true;
    submitBtn.textContent = t("catalog.reqSending");

    const idCopy = statusEl.querySelector("[data-copy-id]");
    if (idCopy) idCopy.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(idCopy.dataset.copyId);
        idCopy.textContent = t("catalog.reqIdCopied");
        setTimeout(() => { idCopy.textContent = t("catalog.reqIdCopy"); }, 2000);
      } catch (err) {
        const range = document.createRange();
        range.selectNodeContents(statusEl.querySelector(".request-id-value"));
        const sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(range);
      }
    });

    if (email) {
      try {
        const res = await fetch("https://formsubmit.co/ajax/" + email, {
          method: "POST",
          headers: { "Content-Type": "application/json", Accept: "application/json" },
          body: JSON.stringify({
            request_id: requestId,
            purpose: purposeLabel,
            item: context.name || "",
            price: context.price || "",
            name, contact, message,
            _subject: `Request ${requestId} - Suntar-Plastic (${name})`,
            _captcha: "false",
            _honey: form.querySelector('[name="_honey"]').value,
            _template: "table",
          }),
        });
        const data = await res.json().catch(() => ({}));
        if (!(res.ok && data.success !== false)) {
          statusEl.className = "request-status error";
          statusEl.innerHTML = `${t("catalog.reqError")} ${handoff}`;
        }
      } catch (err) {
        statusEl.className = "request-status error";
        statusEl.innerHTML = `${t("catalog.reqError")} ${handoff}`;
      }
    }

    submitBtn.disabled = false;
    submitBtn.textContent = t("catalog.reqSend");
  });

  modal.hidden = false;
  document.body.classList.add("modal-open");
  body.querySelector("#orderName").focus({ preventScroll: true });
}

function updateThemeBtn(btn) {
  btn.textContent = document.body.classList.contains("dark") ? "☀" : "🌙";
}

/* ===== SINGLE-PAGE RENDERER ===== */

function initRequestTracker(requests) {
  const form = document.getElementById("trackForm");
  const input = document.getElementById("trackInput");
  const result = document.getElementById("trackResult");
  if (!form || !input || !result) return;

  try {
    const last = localStorage.getItem("lastRequestId");
    if (last) input.value = last;
  } catch (err) {}

  const STATUS_STEPS = ["received", "printing", "ready", "done"];

  function renderStatus(item) {
    const cancelled = item.status === "cancelled" || item.status === "declined";
    const step = STATUS_STEPS.indexOf(item.status);
    const stepsHtml = STATUS_STEPS.map((s, i) => {
      const active = !cancelled && step >= i;
      return `<div class="track-step ${active ? "active" : ""}"><span class="track-step-icon">${active ? "✓" : ""}</span><span>${t("track.status." + s)}</span></div>`;
    }).join("");

    result.className = "track-result " + (cancelled ? "track-cancelled" : "");
    result.innerHTML = `
      ${cancelled
        ? `<div class="track-cancelled-badge">${t("track.status." + item.status)}</div>`
        : `<div class="track-steps">${stepsHtml}</div>`}
      <div class="track-date">${t("track.updated")}: ${item.updatedAt || "—"}</div>
      ${item.note ? `<div class="track-note">${item.note}</div>` : ""}
    `;
    result.hidden = false;
  }

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const id = input.value.trim().toUpperCase();
    if (!id) return;
    const item = (requests || []).find((r) => String(r.id || "").trim().toUpperCase() === id);
    if (!item) {
      result.className = "track-result track-error";
      result.innerHTML = `<div class="track-error-text">${t("track.notFound")}</div>`;
      result.hidden = false;
      return;
    }
    renderStatus(item);
  });
}

async function renderSite() {
  const social = await loadJSON("data/social.json");
  const promo = await loadJSON("data/promo.json");
  const materials = await loadJSON("data/materials.json");
  const faq = await loadJSON("data/faq.json");
  const testimonials = await loadJSON("data/testimonials.json");
  const gallery = await loadJSON("data/gallery.json");
  const catalog = await loadJSON("data/catalog.json");
  const news = await loadJSON("data/news.json");
  const requests = await loadJSON("data/requests.json");

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
      <div class="gallery-grid" id="galleryGrid"></div>
      <div class="gallery-pager">
        <button type="button" class="gallery-page-btn" id="galleryPrev" aria-label="${t("gallery.prev")}">❮</button>
        <span class="gallery-page-info" id="galleryPageInfo"></span>
        <button type="button" class="gallery-page-btn" id="galleryNext" aria-label="${t("gallery.next")}">❯</button>
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
                    <p class="news-excerpt">${item.description}</p>
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
          <nav class="catalog-tree" id="catalogTree" aria-label="${t("catalog.title")}"></nav>
        </aside>

        <div class="catalog-stage">
          <div class="catalog-toolbar">
            <nav class="catalog-crumbs" id="catalogCrumbs"></nav>
            <span class="catalog-count" id="catalogCount"></span>
            <span class="catalog-sort-label">${t("catalog.sort")}</span>
            <select class="catalog-sort" id="catalogSort">
              <option value="pop">${t("catalog.sortPopular")}</option>
              <option value="price-asc">${t("catalog.sortPriceAsc")}</option>
              <option value="price-desc">${t("catalog.sortPriceDesc")}</option>
            </select>
          </div>
          <div class="catalog-list" id="catalogList"></div>
          <div class="catalog-empty" id="catalogEmpty" hidden>${t("catalog.empty")}</div>
        </div>

        <aside class="catalog-details">
          <div class="catalog-3d" id="preview3d">
            <div class="catalog-3d-placeholder"><span class="catalog-3d-emoji">🧊</span><span>${t("catalog.select")}</span></div>
          </div>
          <div class="catalog-details-body" id="previewDetails">
            <div class="catalog-select-hint">${t("catalog.select")}</div>
          </div>
        </aside>
      </section>

      <section class="catalog-request" id="catalogRequest">
        <div class="request-promo">
          <div class="request-promo-text">
            <h3>${t("catalog.requestTitle")}</h3>
            <p>${t("catalog.requestSubtitle")}</p>
          </div>
          <button type="button" class="btn-primary" id="openCustomRequest">${t("catalog.orderStart")}</button>
        </div>
      </section>
    </div>

    <div class="view" id="view-track">
      <section class="track-section" id="track">
        <h2 class="section-title">${t("track.title")}</h2>
        <p class="section-subtitle">${t("track.subtitle")}</p>
        <div class="track-box">
          <form id="trackForm" class="track-form" novalidate>
            <input type="text" id="trackInput" placeholder="${t("track.inputPlaceholder")}" autocomplete="off" inputmode="text">
            <button type="submit" class="btn-primary">${t("track.button")}</button>
          </form>
          <div class="track-result" id="trackResult" hidden></div>
        </div>
      </section>
    </div>

    </div>
  `;

  setTimeout(initMap, 100);
  window.newsData = news;
  initGalleryPaging(gallery);
  initNewsCarousel();
  initNewsModal();
  initTestimonials();
  initCatalogWorkbench(catalog, social);
  initOrderModal(social.contactEmail, social);
  initRequestTracker(requests);

  const customBtn = document.getElementById("openCustomRequest");
  if (customBtn) customBtn.addEventListener("click", () => window.openOrderModal({ type: "custom" }));

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

function initMobileNav() {
  const toggle = document.getElementById("navToggle");
  const drawer = document.getElementById("mobileNav");
  if (!toggle || !drawer) return;

  const links = NAV_SECTIONS.map((id) => {
    const label = `nav.${id}`;
    const href = id === "catalog" || id === "home" ? `#${id}` : `#${id}`;
    return `<a href="${href}" data-page="${id}" data-i18n="${label}">${t(label)}</a>`;
  }).join("");

  const cta = `<a href="#catalog-request" class="btn-cta mobile-cta" data-i18n="nav.quote">${t("nav.quote")}</a>`;
  drawer.innerHTML = links + cta;
  applyTranslations();

  function open() {
    drawer.hidden = false;
    toggle.setAttribute("aria-expanded", "true");
    toggle.textContent = "✕";
    document.body.classList.add("nav-open");
  }

  function close() {
    drawer.hidden = true;
    toggle.setAttribute("aria-expanded", "false");
    toggle.textContent = "☰";
    document.body.classList.remove("nav-open");
  }

  toggle.addEventListener("click", () => {
    if (drawer.hidden) open();
    else close();
  });

  drawer.addEventListener("click", (e) => {
    if (e.target.closest("a")) close();
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") close();
  });
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
  initMobileNav();
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