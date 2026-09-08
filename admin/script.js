"use strict";

/* Suntar-Plastic — админ-панель. Простое управление контентом сайта. */

const GITHUB_API = "https://api.github.com";
const LANGS = ["ru", "en", "sah"];
const LANG_NAMES = { ru: "Русский", en: "English", sah: "Саха тыла" };

/* ===== Разделы навигации ===== */

const NAV = [
  { section: "Каталог и работы", items: [
    { type: "catalog", label: "Каталог моделей" },
    { type: "gallery", label: "Галерея работ" },
  ] },
  { section: "Контент сайта", items: [
    { type: "news", label: "Новости и советы" },
    { type: "testimonials", label: "Отзывы" },
    { type: "faq", label: "Вопросы и ответы" },
    { type: "promo", label: "Акция" },
  ] },
  { section: "Работа с заявками", items: [
    { type: "requests", label: "Заявки клиентов" },
    { type: "cloudRequests", label: "Новые заявки (Cloudflare)" },
  ] },
  { section: "Контакты", items: [
    { type: "social", label: "Соцсети и email" },
  ] },
  { section: "Тексты сайта", items: [
    { type: "i18n", label: "Тексты и переводы" },
  ] },
  { section: "Система", items: [
    { type: "connection", label: "Подключение к GitHub" },
  ] },
];

/* ===== Схемы данных ===== */

const SCHEMAS = {
  catalog: { path: "data/catalog.json", label: "Каталог моделей", array: true, fields: [
    { key: "name", label: "Название", type: "text", required: true, placeholder: "Например: Подставка для телефона" },
    { key: "category", label: "Категория", type: "text", required: true, placeholder: "Например: Дом > Декор", hint: "Путь по каталогу, уровни разделяйте знаком «>»" },
    { key: "description", label: "Описание", type: "textarea" },
    { key: "pricePrint", label: "Цена печати (₽)", type: "number" },
    { key: "priceModel", label: "Цена 3D-модели (₽)", type: "number" },
    { key: "model", label: "3D-модель для просмотра", type: "model", hint: "Файл .glb или .gltf. Посетители смогут посмотреть модель в 3D" },
    { key: "image", label: "Фото", type: "image", hint: "Обычная фотография модели (необязательно)" },
    { key: "icon", label: "Иконка (эмодзи)", type: "text", placeholder: "Например: 📱" },
  ] },
  gallery: { path: "data/gallery.json", label: "Галерея работ", array: true, fields: [
    { key: "title", label: "Название", type: "text", required: true },
    { key: "description", label: "Описание", type: "textarea" },
    { key: "image", label: "Фото", type: "image" },
  ] },
  news: { path: "data/news.json", label: "Новости и советы", array: true, fields: [
    { key: "title", label: "Заголовок", type: "text", required: true },
    { key: "description", label: "Короткое описание (анонс)", type: "textarea" },
    { key: "content", label: "Полный текст статьи", type: "textarea", hint: "Новые абзацы отделяйте пустой строкой" },
    { key: "image", label: "Изображение", type: "image" },
    { key: "date", label: "Дата публикации", type: "date", required: true },
  ] },
  testimonials: { path: "data/testimonials.json", label: "Отзывы", array: true, fields: [
    { key: "name", label: "Имя", type: "text", required: true },
    { key: "location", label: "Населённый пункт", type: "text", placeholder: "Например: с. Сунтар" },
    { key: "rating", label: "Оценка (1–5)", type: "number", min: 1, max: 5 },
    { key: "text", label: "Текст отзыва", type: "textarea", required: true },
  ] },
  faq: { path: "data/faq.json", label: "Вопросы и ответы", array: true, fields: [
    { key: "question", label: "Вопрос", type: "textarea", required: true },
    { key: "answer", label: "Ответ", type: "textarea", required: true },
  ] },
  promo: { path: "data/promo.json", label: "Акция", array: false, fields: [
    { key: "active", label: "Акция включена", type: "checkbox" },
    { key: "text", label: "Текст акции", type: "text" },
    { key: "endDate", label: "Дата окончания", type: "date" },
  ], nested: [] },
  requests: { path: "data/requests.json", label: "Заявки клиентов", array: true, fields: [
    { key: "id", label: "ID заявки", type: "text", required: true, placeholder: "SP-2608-XXXX" },
    { key: "name", label: "Имя клиента", type: "text" },
    { key: "status", label: "Статус", type: "select", options: ["received", "printing", "ready", "done", "cancelled", "declined"], optionLabels: { received: "Получена", printing: "Печатается", ready: "Готова к выдаче", done: "Выполнена", cancelled: "Отменена", declined: "Отклонена" } },
    { key: "updatedAt", label: "Дата обновления", type: "date" },
    { key: "note", label: "Примечание (видит клиент)", type: "textarea", hint: "Например: «Можно забрать с 10 до 18»" },
  ] },
  social: { path: "data/social.json", label: "Контакты и соцсети", array: false, fields: [
    { key: "whatsapp", label: "WhatsApp (ссылка для чата)", type: "text", placeholder: "https://wa.me/79XXXXXXXXX" },
    { key: "instagram", label: "Instagram", type: "text" },
    { key: "telegram", label: "Telegram", type: "text" },
    { key: "contactEmail", label: "Email для форм на сайте", type: "text" },
  ], nested: [] },
};

/* ===== Подписи для текстов сайта (переводов) ===== */

const I18N_GROUP_LABELS = {
  nav: "Меню", hero: "Главный экран", process: "Как это работает", stats: "Цифры на сайте",
  faq: "Блок «Вопросы и ответы»",
  track: "Отслеживание заявки", testimonials: "Блок «Отзывы»",
  gallery: "Блок «Галерея»", catalog: "Каталог (кнопки и подписи)", news: "Блок «Новости»",
  ctaCatalog: "Блок «Заказать модель»", cta: "Блок «Мы в соцсетях»", map: "Блок «Карта»",
  request: "Форма заявки",
};

const I18N_LABELS = {
  "nav.home": "Пункт меню «Главная»",
  "nav.catalog": "Пункт меню «Каталог»",
  "nav.gallery": "Пункт меню «Галерея»",
  "nav.news": "Пункт меню «Новости»",
  "nav.faq": "Пункт меню «Частые вопросы»",
  "nav.track": "Пункт меню «Отследить заявку»",
  "nav.quote": "Кнопка «Заказать модель»",
  "hero.title": "Заголовок (первая часть)",
  "hero.titleHighlight": "Заголовок (выделенная часть)",
  "hero.subtitle": "Подзаголовок",
  "process.title": "Заголовок блока",
  "process.subtitle": "Подзаголовок блока",
  "process.step1.title": "Шаг 1 — заголовок",
  "process.step1.desc": "Шаг 1 — описание",
  "process.step2.title": "Шаг 2 — заголовок",
  "process.step2.desc": "Шаг 2 — описание",
  "process.step3.title": "Шаг 3 — заголовок",
  "process.step3.desc": "Шаг 3 — описание",
  "process.step4.title": "Шаг 4 — заголовок",
  "process.step4.desc": "Шаг 4 — описание",
  "stats.stat1.value": "Цифра 1",
  "stats.stat1.label": "Подпись к цифре 1",
  "stats.stat2.value": "Цифра 2",
  "stats.stat2.label": "Подпись к цифре 2",
  "stats.stat3.value": "Цифра 3",
  "stats.stat3.label": "Подпись к цифре 3",
  "stats.stat4.value": "Цифра 4",
  "stats.stat4.label": "Подпись к цифре 4",
  "faq.title": "Заголовок блока",
  "faq.subtitle": "Подзаголовок блока",
  "track.title": "Заголовок блока",
  "track.subtitle": "Подзаголовок блока",
  "track.inputPlaceholder": "Поле ввода ID (пример)",
  "track.button": "Кнопка «Проверить»",
  "track.searching": "Сообщение «ищем заявку»",
  "track.updated": "Подпись «Обновлено»",
  "track.notFound": "Сообщение «не найдено»",
  "track.status.received": "Статус: получена",
  "track.status.printing": "Статус: печатается",
  "track.status.ready": "Статус: готова к выдаче",
  "track.status.done": "Статус: выполнена",
  "track.status.cancelled": "Статус: отменена",
  "track.status.declined": "Статус: отклонена",
  "testimonials.title": "Заголовок блока",
  "testimonials.subtitle": "Подзаголовок блока",
  "testimonials.prev": "Кнопка «Предыдущий отзыв»",
  "testimonials.next": "Кнопка «Следующий отзыв»",
  "gallery.title": "Заголовок блока",
  "gallery.subtitle": "Подзаголовок блока",
  "gallery.prev": "Кнопка «Предыдущие фото»",
  "gallery.next": "Кнопка «Следующие фото»",
  "catalog.title": "Заголовок блока",
  "catalog.subtitle": "Подзаголовок блока",
  "catalog.search": "Поле поиска (подсказка)",
  "catalog.categories": "Кнопка «Категории»",
  "catalog.all": "Пункт «Все»",
  "catalog.print": "Кнопка «Заказать печать»",
  "catalog.buy": "Кнопка «Купить модель»",
  "catalog.printPrice": "Подпись «Печать»",
  "catalog.modelPrice": "Подпись «3D-модель»",
  "catalog.select": "Подсказка «Выберите модель»",
  "catalog.no3d": "Подсказка «нет 3D-предпросмотра»",
  "catalog.empty": "Сообщение «ничего не найдено»",
  "catalog.requestTitle": "Заголовок «Заказать свою модель»",
  "catalog.requestSubtitle": "Подзаголовок «Заказать свою модель»",
  "catalog.reqName": "Поле «Ваше имя»",
  "catalog.reqContact": "Поле «Контакт»",
  "catalog.reqContactPlaceholder": "Поле «Контакт» (пример)",
  "catalog.reqPurpose": "Поле «Для чего нужна деталь»",
  "catalog.reqPurposePlaceholder": "Поле «Для чего» (пример)",
  "catalog.reqMaterial": "Поле «Материал»",
  "catalog.reqMaterialHint": "Подсказка к материалу",
  "catalog.materialGuide": "Ссылка «Какой материал подойдёт»",
  "catalog.reqDescription": "Поле «Описание заявки»",
  "catalog.reqDescriptionPlaceholder": "Поле «Описание» (пример)",
  "catalog.reqAttachments": "Подпись «Файлы»",
  "catalog.reqAttachmentsHint": "Подсказка про файлы",
  "catalog.reqRemove": "Кнопка «Убрать файл»",
  "catalog.reqSend": "Кнопка «Отправить»",
  "catalog.reqSent": "Кнопка «Отправлено»",
  "catalog.reqSending": "Кнопка «Отправляем...»",
  "catalog.reqApiError": "Предупреждение при сбое отправки",
  "catalog.reqIdLabel": "Подпись «ID заявки»",
  "catalog.reqIdCopy": "Кнопка «Копировать»",
  "catalog.reqIdCopied": "Кнопка «Скопировано»",
  "catalog.reqIdHint": "Подсказка «Сохраните этот ID»",
  "catalog.orderStart": "Кнопка «Начать заявку»",
  "catalog.orderMessage": "Поле «Сообщение»",
  "catalog.orderMessagePlaceholder": "Поле «Сообщение» (пример)",
  "catalog.found": "Подпись «Найдено: {n}»",
  "catalog.sort": "Подпись «Сортировка»",
  "catalog.sortPopular": "Сортировка «По популярности»",
  "catalog.sortPriceAsc": "Сортировка «Цена: по возрастанию»",
  "catalog.sortPriceDesc": "Сортировка «Цена: по убыванию»",
  "news.title": "Заголовок блока",
  "news.subtitle": "Подзаголовок блока",
  "news.prev": "Кнопка «Предыдущая статья»",
  "news.next": "Кнопка «Следующая статья»",
  "news.readMore": "Ссылка «Читать далее»",
  "news.readArticle": "Кнопка «Открыть статью»",
  "news.close": "Кнопка «Закрыть»",
  "ctaCatalog.title": "Заголовок блока",
  "ctaCatalog.text": "Текст блока",
  "ctaCatalog.button": "Кнопка блока",
  "cta.title": "Заголовок блока",
  "cta.subtitle": "Подзаголовок блока",
  "map.title": "Заголовок блока",
  "map.subtitle": "Подзаголовок блока",
  "request.required": "Сообщение «Заполните все поля»",
};

/* ===== Состояние ===== */

let currentType = null;
let loadedData = {};
let dirty = new Set();
let pendingUploads = new Map();
let i18nEdits = { ru: null, en: null, sah: null };
let i18nLang = "ru";

/* ===== Утилиты ===== */

const $ = (sel, root) => (root || document).querySelector(sel);

function esc(str) {
  return String(str ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;")
    .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function toB64(str) {
  return btoa(unescape(encodeURIComponent(str)));
}

function flatten(obj, prefix, out) {
  for (const key of Object.keys(obj)) {
    const p = prefix ? prefix + "." + key : key;
    if (obj[key] && typeof obj[key] === "object") flatten(obj[key], p, out);
    else out[p] = obj[key];
  }
  return out;
}

function hydrate(map) {
  const root = {};
  for (const path of Object.keys(map)) {
    const parts = path.split(".");
    let node = root;
    for (let i = 0; i < parts.length - 1; i++) {
      node[parts[i]] = node[parts[i]] || {};
      node = node[parts[i]];
    }
    node[parts[parts.length - 1]] = map[path];
  }
  return root;
}

function extFrom(name) {
  const m = /\.([a-zA-Z0-9]+)$/.exec(name || "");
  return m ? m[1].toLowerCase() : "bin";
}

function siteBase() {
  const repo = getConfig().repo;
  if (!repo || !repo.includes("/")) return "";
  const [owner, name] = repo.split("/");
  return `https://${owner}.github.io/${name}/`;
}

function ruError(msg) {
  const m = String(msg || "");
  if (/not found/i.test(m) || /404/i.test(m)) return "Репозиторий или файл не найден. Проверьте имя репозитория и токен.";
  if (/Bad credentials|Credentials|401|403/i.test(m)) return "Неверный токен или нет прав на запись. Проверьте токен во вкладке «Подключение».";
  if (/was pushed|422|failed to update/i.test(m)) return "В репозиторий только что внесли изменения. Нажмите «Загрузить заново» и попробуйте ещё раз.";
  return m;
}

/* ===== Настройки (токен, репозиторий) ===== */

function getConfig() {
  const panel = document.getElementById("formPanel");
  const val = (id, fb) => {
    const el = panel ? panel.querySelector("#" + id) : null;
    return el ? el.value.trim() : fb;
  };
  return {
    token: val("connToken", localStorage.getItem("gh_token") || ""),
    repo: val("connRepo", localStorage.getItem("gh_repo") || ""),
    branch: val("connBranch", localStorage.getItem("gh_branch") || "main") || "main",
  };
}

function saveConfig() {
  const { token, repo, branch } = getConfig();
  localStorage.setItem("gh_token", token);
  localStorage.setItem("gh_repo", repo);
  localStorage.setItem("gh_branch", branch);
}

/* ===== GitHub API ===== */

async function gitApi(path, opts) {
  const { token } = getConfig();
  const headers = { Accept: "application/vnd.github+json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  if (opts && opts.body) headers["Content-Type"] = "application/json";
  const res = await fetch(`${GITHUB_API}/${path}`, Object.assign({}, opts, { headers }));
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) throw new Error((data && (data.message || data.error)) || `HTTP ${res.status}`);
  return data;
}

async function getFile(path) {
  const { repo, branch } = getConfig();
  const data = await gitApi(`repos/${repo}/contents/${path}?ref=${branch}`);
  return { sha: data.sha, content: decodeURIComponent(escape(atob(data.content))) };
}

/* Публикация всех изменений одним коммитом (без поштучных сохранений). */
async function commitBatch(files, message) {
  const { repo, branch } = getConfig();
  const head = await gitApi(`repos/${repo}/git/ref/heads/${branch}`);
  const base = await gitApi(`repos/${repo}/git/commits/${head.object.sha}`);

  const blobs = {};
  for (const path of Object.keys(files)) {
    const blob = await gitApi(`repos/${repo}/git/blobs`, {
      method: "POST",
      body: JSON.stringify({ content: files[path], encoding: "base64" }),
    });
    blobs[path] = blob.sha;
  }

  const tree = await gitApi(`repos/${repo}/git/trees`, {
    method: "POST",
    body: JSON.stringify({
      base_tree: base.tree.sha,
      tree: Object.keys(files).map((path) => ({ path, mode: "100644", type: "blob", sha: blobs[path] })),
    }),
  });

  const commit = await gitApi(`repos/${repo}/git/commits`, {
    method: "POST",
    body: JSON.stringify({ message, tree: tree.sha, parents: [head.object.sha] }),
  });

  await gitApi(`repos/${repo}/git/refs/heads/${branch}`, {
    method: "PATCH",
    body: JSON.stringify({ sha: commit.sha, force: false }),
  });
  return commit.sha;
}

/* ===== Сборка полей форм ===== */

function fieldInput(field, value) {
  value = value ?? "";
  switch (field.type) {
    case "textarea":
      return `<textarea name="${field.key}" spellcheck="false" placeholder="${field.placeholder || ""}">${esc(value)}</textarea>`;
    case "checkbox":
      return `<input type="checkbox" name="${field.key}" ${value ? "checked" : ""}>`;
    case "date":
      return `<input type="date" name="${field.key}" value="${esc(value)}">`;
    case "number":
      return `<input type="number" name="${field.key}" value="${value}" step="any" ${field.min != null ? `min="${field.min}"` : ""} ${field.max != null ? `max="${field.max}"` : ""}>`;
    case "select":
      return `<select name="${field.key}">${(field.options || []).map((o) =>
        `<option value="${esc(o)}" ${String(value) === o ? "selected" : ""}>${field.optionLabels && field.optionLabels[o] ? esc(field.optionLabels[o]) : esc(o)}</option>`).join("")}</select>`;
    case "image":
    case "model":
      return `
        <input type="text" name="${field.key}" value="${esc(value)}" data-upload-target>
        <div class="upload-slot" data-is="${field.type}" data-upload-key="${field.key}">
          <input type="file" class="upload-input" hidden ${field.type === "image" ? 'accept="image/*"' : 'accept=".glb,.gltf,.stl"'} data-ref="">
          <div class="upload-preview"></div>
          <div class="upload-actions">
            <button type="button" class="btn-upload" data-upload-pick>Загрузить файл</button>
            <button type="button" class="btn-clear" data-upload-clear>Убрать</button>
          </div>
          <div class="upload-state" data-upload-state></div>
        </div>`;
    default:
      return `<input type="text" name="${field.key}" value="${esc(value)}" placeholder="${field.placeholder || ""}" spellcheck="false">`;
  }
}

function renderSlotPreview(slot) {
  const text = slot.parentElement.querySelector("[data-upload-target]");
  const kind = slot.dataset.is;
  const value = text ? text.value : "";
  const box = slot.querySelector(".upload-preview");
  const fileInput = slot.querySelector(".upload-input");
  if (value) {
    if (kind === "image") {
      box.innerHTML = `<img src="${esc(value.indexOf("http") === 0 ? value : siteBase() + value)}" alt="">`;
    } else {
      box.innerHTML = `<span class="ph">📄 ${esc(value)}</span>`;
    }
  } else {
    box.innerHTML = `<span class="ph">Файл не загружен</span>`;
  }
  const state = slot.querySelector("[data-upload-state]");
  if (fileInput && fileInput.dataset.ref && pendingUploads.has(fileInput.dataset.ref)) {
    state.textContent = "Будет загружен: " + (fileInput.dataset.path || "");
    state.className = "upload-state ok";
  } else {
    state.textContent = "";
    state.className = "upload-state";
  }
}

/* ===== Рендер разделов ===== */

function renderSidebar() {
  const bar = document.getElementById("sidebar");
  bar.innerHTML = NAV.map((group) => `
    <div class="nav-group">
      <div class="nav-group-title">${group.section}</div>
      ${group.items.map((it) => {
        const s = SCHEMAS[it.type];
        let count = "";
        if (s && Array.isArray(loadedData[it.type])) {
          count = `<span class="nav-count">${loadedData[it.type].length}</span>`;
        }
        const badge = dirty.has(it.type) ? `<span class="dirty-dot" title="Есть несохранённые изменения"></span>` : "";
        return `<button class="nav-item ${currentType === it.type ? "active" : ""}" data-type="${it.type}"><span class="nav-label">${it.label}</span>${badge}${count}</button>`;
      }).join("")}
    </div>`).join("");
}

function pageHead(title, sub) {
  document.getElementById("pageTitle").textContent = title;
  document.getElementById("pageSub").textContent = sub || "";
}

function renderForm() {
  const panel = document.getElementById("formPanel");
  if (currentType === "connection") { renderConnection(); return; }
  if (currentType === "i18n") { renderI18n(); return; }
  if (currentType === "cloudRequests") { renderCloudRequests(); return; }

  const schema = SCHEMAS[currentType];
  if (!schema) return;
  const data = loadedData[currentType];
  panel.innerHTML = schema.array ? buildArray(schema, data) : buildObject(schema, data);
  panel.querySelectorAll(".upload-slot").forEach((slot) => renderSlotPreview(slot));
  pageHead(schema.label, publishHint(schema));
}

function publishHint(schema) {
  if (schema.array) return `Элементов: ${(loadedData[currentType] || []).length}. Нажмите «Опубликовать всё», чтобы сохранить изменения на сайте.`;
  return "Заполните поля и нажмите «Опубликовать всё».";
}

function cardTools(schema, i, data) {
  const count = data.length;
  return `
    <div class="item-tools">
      <button type="button" class="icon-btn" data-dup="${i}" title="Скопировать элемент">⧉</button>
      <button type="button" class="icon-btn" data-move="up" data-index="${i}" title="Выше в списке" ${i === 0 ? "disabled" : ""}>▲</button>
      <button type="button" class="icon-btn" data-move="down" data-index="${i}" title="Ниже в списке" ${i === count - 1 ? "disabled" : ""}>▼</button>
      <button type="button" class="btn-remove" data-remove="${i}">Удалить</button>
    </div>`;
}

function itemFields(schema, item) {
  return schema.fields.map((f) => `
    <div class="form-field" data-kind="${f.type}">
      <label>${f.label}${f.required ? ' <i class="req">*</i>' : ""}</label>
      ${fieldInput(f, item[f.key])}
      ${f.hint ? `<div class="field-hint">${f.hint}</div>` : ""}
    </div>`).join("");
}

function buildArray(schema, data) {
  if (!Array.isArray(data)) data = [];
  const body = data.map((item, i) => `
    <div class="item-card" data-index="${i}">
      <div class="item-header">
        <h3>${esc(schema.label)} №${i + 1}</h3>
        ${cardTools(schema, i, data)}
      </div>
      <div class="item-fields">${itemFields(schema, item)}</div>
    </div>`).join("");
  return `
    <div class="array-list" data-array-list="1">
      ${body || `<div class="empty-hint">Список пуст. Добавьте первый элемент.</div>`}
    </div>
    <button class="btn-add" data-add-item="1">+ Добавить ${schema.label.toLowerCase()}</button>`;
}

function buildObject(schema, data) {
  const nested = (schema.nested || []).map((n) => {
    if (n.simpleText) {
      return `
        <div class="nested-section">
          <h3>${n.label}</h3>
          <div data-ns-key="${n.key}">
            ${(data[n.key] || []).map((v, i) => `<div class="list-item-row"><input type="text" value="${esc(v)}" data-ns-value><button type="button" class="btn-remove btn-sm" data-simple-remove>✕</button></div>`).join("")}
          </div>
          <button class="btn-add btn-sm" data-add-simple="${n.key}">+ Добавить пункт</button>
        </div>`;
    }
    return `
      <div class="nested-section">
        <h3>${n.label}</h3>
        <div data-nn-key="${n.key}">
          ${(data[n.key] || []).map((item, i) => `
            <div class="nested-row">
              ${n.fields.map((f) => `<div class="form-field"><label>${f.label}</label>${fieldInput(f, item[f.key])}</div>`).join("")}
              <button type="button" class="btn-remove btn-sm" data-nested-remove>Удалить</button>
            </div>`).join("")}
        </div>
        <button class="btn-add btn-sm" data-add-nested="${n.key}">+ Добавить ${n.label.toLowerCase()} · элемент</button>
      </div>`;
  }).join("");

  return `
    <div class="simple-object-form">
      <div class="item-fields">${itemFields(schema, data)}</div>
      ${nested}
    </div>`;
}

/* ===== Вкладка «Подключение к GitHub» ===== */

function renderConnection() {
  const c = getConfig();
  const panel = document.getElementById("formPanel");
  panel.innerHTML = `
    <div class="connection-form">
      <h3>Подключение к GitHub</h3>
      <p class="conn-hint">Сайт публикуется через ваш аккаунт GitHub. Настройте один раз — дальше достаточно нажимать «Опубликовать всё».</p>

      <div class="form-field">
        <label>Личный токен GitHub <i class="req">*</i></label>
        <input type="password" id="connToken" value="${esc(c.token)}" autocomplete="off" spellcheck="false" placeholder="ghp_... или github_pat_...">
        <div class="field-hint">Создание: GitHub → Settings → Developer settings → Personal access tokens → Generate new token → отметить право <b>Contents: Read and write</b>. Токен хранится только в этом браузере.</div>
      </div>

      <div class="form-field">
        <label>Репозиторий (владелец / название) <i class="req">*</i></label>
        <input type="text" id="connRepo" value="${esc(c.repo)}" placeholder="Например: Draver93/3d-printing-website" spellcheck="false">
      </div>

      <div class="form-field">
        <label>Ветка</label>
        <input type="text" id="connBranch" value="${esc(c.branch || "main")}" placeholder="main" spellcheck="false">
      </div>

      <div class="conn-actions">
        <button class="btn-secondary" id="connTest">Проверить подключение</button>
        <button class="btn-primary" id="connLoad">Сохранить и загрузить данные</button>
      </div>
      ${c.repo ? `<p class="conn-site">Сайт: <a href="${siteBase()}" target="_blank" rel="noopener">${siteBase()}</a></p>` : ""}
    </div>`;
  pageHead("Подключение к GitHub", "Одноразовая настройка доступа к сайту.");

  $("#connTest").addEventListener("click", async () => {
    const { repo } = getConfig();
    if (!repo) return setStatus("Введите репозиторий (владелец/название).", "error");
    setStatus("Проверяем подключение...", "info");
    try {
      await gitApi(`repos/${repo}`);
      saveConfig();
      setStatus("Подключение работает — репозиторий найден. Нажмите «Сохранить и загрузить данные».", "success");
    } catch (e) {
      setStatus(ruError(e.message), "error");
    }
  });

  $("#connLoad").addEventListener("click", () => {
    saveConfig();
    loadAll();
  });
}

/* ===== Вкладка «Тексты сайта» ===== */

function i18nRow(key, value) {
  const label = I18N_LABELS[key] || key;
  const autoRows = Math.max(2, Math.min(7, Math.ceil(String(value || "").length / 80)));
  return `
    <div class="i18n-row" data-key="${key}">
      <label title="${esc(key)}">${esc(label)}</label>
      <span class="i18n-key">${esc(key)}</span>
      <textarea data-i18n-value rows="${autoRows}" spellcheck="false">${esc(value || "")}</textarea>
    </div>
    ${String(value || "").includes("{") ? `<div class="i18n-note" data-key="${key}">⚠ Фигурные скобки {…} — это подстановки сайта. Не удаляйте и не меняйте их.</div>` : ""}`;
}

function renderI18n() {
  const panel = document.getElementById("formPanel");
  const base = i18nEdits.en || {};
  const data = i18nEdits[i18nLang] || {};
  const order = Object.keys(base);

  const sections = {};
  for (const key of order) {
    if (!(key in data)) continue;
    const sec = key.split(".")[0];
    (sections[sec] = sections[sec] || []).push(key);
  }

  const query = ($("#i18nSearch") && $("#i18nSearch").value.trim().toLowerCase()) || "";
  let groupsHtml = "";
  for (const sec of Object.keys(sections)) {
    const keys = sections[sec].filter((k) => {
      if (!query) return true;
      const label = (I18N_LABELS[k] || k).toLowerCase();
      const val = String(data[k] || "").toLowerCase();
      return label.includes(query) || val.includes(query) || k.includes(query);
    });
    if (!keys.length) continue;
    groupsHtml += `
      <section class="i18n-group">
        <h3>${esc(I18N_GROUP_LABELS[sec] || sec)} <span class="i18n-group-n">${keys.length}</span></h3>
        ${keys.map((k) => i18nRow(k, data[k], order)).join("")}
      </section>`;
  }

  panel.innerHTML = `
    <div class="i18n-toolbar">
      <div class="lang-tabs">
        ${LANGS.map((l) => `<button class="lang-tab ${l === i18nLang ? "active" : ""}" data-lang="${l}">${LANG_NAMES[l]}</button>`).join("")}
      </div>
      <input type="search" id="i18nSearch" class="i18n-search" placeholder="Поиск по тексту на сайте..." value="${esc(query)}" autocomplete="off">
    </div>
    <div class="i18n-list">${groupsHtml || `<div class="empty-hint">Ничего не найдено.</div>`}</div>`;
  pageHead("Тексты и переводы", "Все надписи сайта на трёх языках. Измените и нажмите «Опубликовать всё».");
}

/* ===== Вкладка «Новые заявки (Cloudflare)» ===== */

const CLOUD_STATUS_LABELS = { received: "Получена", printing: "Печатается", ready: "Готова к выдаче", done: "Выполнена", cancelled: "Отменена", declined: "Отклонена" };

function cloudListHtml(rows, token) {
  return rows.map((r) => {
    let files = [];
    try { files = JSON.parse(r.files || "[]"); } catch (e) {}
    return `
      <div class="cloud-card" data-id="${esc(r.id)}">
        <div class="cloud-head">
          <strong>${esc(r.id)}</strong>
          <span class="cloud-date">${r.created_at ? new Date(r.created_at).toLocaleString("ru-RU") : ""}</span>
        </div>
        <div class="cloud-line">${esc(r.purpose || "")}${r.item ? " · " + esc(r.item) : ""}${r.price ? " · " + r.price + " ₽" : ""}</div>
        <div class="cloud-line">${esc(r.name || "")} · ${esc(r.contact || "")}${r.email ? " · " + esc(r.email) : ""}</div>
        ${r.message ? `<div class="cloud-line cloud-message">${esc(r.message)}</div>` : ""}
        ${files.length ? `<div class="cloud-line cloud-files">📎 ${files.map((f) => `<a href="/api/file?req=${encodeURIComponent(r.id)}&dl=${encodeURIComponent(r.dl_token || "")}&f=${encodeURIComponent(f)}" target="_blank" rel="noopener">${esc(f)}</a>`).join(" · ")}</div>` : ""}
        <div class="cloud-edit">
          <select data-status>${Object.keys(CLOUD_STATUS_LABELS).map((s) => `<option value="${s}" ${s === r.status ? "selected" : ""}>${CLOUD_STATUS_LABELS[s]}</option>`).join("")}</select>
          <input type="text" data-note value="${esc(r.note || "")}" placeholder="Примечание (видит клиент)">
          <button class="btn-primary" data-save>Сохранить</button>
        </div>
      </div>`;
  }).join("") || `<div class="empty-hint">Заявок пока нет.</div>`;
}

function bindCloudList(rows, token) {
  document.querySelectorAll("[data-save]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const card = btn.closest(".cloud-card");
      const id = card.dataset.id;
      const status = card.querySelector("[data-status]").value;
      const note = card.querySelector("[data-note]").value.trim();
      btn.disabled = true;
      try {
        const res = await fetch("/api/requests", {
          method: "PATCH",
          headers: { "Content-Type": "application/json", Authorization: "Bearer " + token },
          body: JSON.stringify({ id, status, note }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || res.status);
        btn.textContent = "✓";
        setStatus("Статус заявки " + id + " обновлён.", "success");
      } catch (e) {
        btn.disabled = false;
        setStatus("Ошибка обновления: " + e.message, "error");
      }
    });
  });
}

function renderCloudRequests() {
  const panel = document.getElementById("formPanel");
  const token = localStorage.getItem("api_token") || "";
  panel.innerHTML = `
    <div class="connection-form">
      <h3>Заявки (Cloudflare)</h3>
      <p class="conn-hint">Заявки с формы сайта хранятся в Cloudflare D1 и приходят вам в Telegram со ссылками на файлы. Здесь можно посмотреть все заявки и менять статус — его видит клиент на странице отслеживания.</p>
      <div class="form-field">
        <label>Ключ доступа (API_TOKEN)</label>
        <input type="password" id="cloudToken" value="${esc(token)}" autocomplete="off" spellcheck="false" placeholder="тот же ключ, что задан секретом API_TOKEN на Cloudflare">
        <div class="field-hint">Задайте его на Cloudflare: <b>wrangler pages secret put API_TOKEN</b> (или в настройках Pages → Settings → Variables).</div>
      </div>
      <div class="conn-actions">
        <button class="btn-primary" id="cloudLoad">Загрузить заявки</button>
      </div>
    </div>
    <div class="cloud-list" id="cloudList"></div>`;
  pageHead("Новые заявки (Cloudflare)", "Форма сайта: файлы, статусы, трекинг.");

  $("#cloudLoad").addEventListener("click", async () => {
    const tk = $("#cloudToken").value.trim();
    localStorage.setItem("api_token", tk);
    if (!tk) return setStatus("Введите ключ доступа.", "error");
    setStatus("Загружаем заявки...", "info");
    try {
      const res = await fetch("/api/requests", { headers: { Authorization: "Bearer " + tk } });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (res.status === 401) return setStatus("Неверный ключ доступа (401). Проверьте API_TOKEN.", "error");
        return setStatus("Ошибка: " + (data.error || res.status), "error");
      }
      $("#cloudList").innerHTML = cloudListHtml(data.requests || [], tk);
      bindCloudList(data.requests || [], tk);
      setStatus("Заявок: " + (data.requests || []).length + ".", "success");
    } catch (e) {
      setStatus("Не удалось связаться с сервером. Вкладка заработает после переезда сайта на Cloudflare Pages.", "error");
    }
  });
}

/* ===== Сбор данных из форм ===== */

function collectCurrent() {
  if (!currentType || currentType === "connection" || currentType === "i18n") return;
  const schema = SCHEMAS[currentType];
  const panel = document.getElementById("formPanel");
  if (!schema || !panel) return;
  let data;

  if (schema.array) {
    data = Array.from(panel.querySelectorAll("[data-array-list] .item-card")).map((card) => {
      const item = {};
      schema.fields.forEach((f) => {
        const input = card.querySelector(`[name="${f.key}"]`);
        if (!input) return;
        item[f.key] = f.type === "checkbox" ? input.checked
          : f.type === "number" ? (input.value === "" ? 0 : parseFloat(input.value) || 0)
          : input.value;
      });
      return item;
    });
  } else {
    data = {};
    schema.fields.forEach((f) => {
      const input = panel.querySelector(`[name="${f.key}"]`);
      if (!input) return;
      data[f.key] = f.type === "checkbox" ? input.checked
        : f.type === "number" ? (parseFloat(input.value) || 0)
        : input.value;
    });
    (schema.nested || []).forEach((n) => {
      if (n.simpleText) {
        data[n.key] = Array.from(panel.querySelectorAll(`[data-ns-key="${n.key}"] [data-ns-value]`)).map((i) => i.value);
      } else {
        data[n.key] = Array.from(panel.querySelectorAll(`[data-nn-key="${n.key}"] .nested-row`)).map((row) => {
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

function validateType(type) {
  const schema = SCHEMAS[type];
  const data = loadedData[type];
  const errors = [];
  if (!data) return errors;
  const check = (item, index) => {
    schema.fields.filter((f) => f.required && f.type !== "checkbox").forEach((f) => {
      if (String(item[f.key] ?? "").trim() === "") {
        errors.push(`${schema.label}${index != null ? ", элемент №" + (index + 1) : ""}: заполните «${f.label}»`);
      }
    });
  };
  if (schema.array) data.forEach(check);
  else check(data);
  return errors;
}

/* ===== Публикация ===== */

function markDirty(type, silent) {
  if (!type) return;
  dirty.add(type);
  updateDirtyUi(silent);
}

function updateDirtyUi(silent) {
  const pill = $("#dirtyPill");
  const has = dirty.size > 0;
  if (pill) {
    pill.hidden = !has;
    pill.textContent = has ? `Изменения: ${dirty.size}` : "";
  }
  if (!silent) renderSidebar();
}

function setStatus(msg, kind) {
  const bar = $("#statusBar");
  bar.textContent = msg;
  bar.className = "status-bar show " + (kind || "info");
}

async function loadAll() {
  const { repo } = getConfig();
  if (!repo) {
    currentType = currentType || "connection";
    renderSidebar();
    renderForm();
    return setStatus("Укажите репозиторий во вкладке «Подключение», затем нажмите «Сохранить и загрузить данные».", "error");
  }
  setStatus("Загрузка данных с GitHub...", "info");
  $("#refreshBtn").disabled = true;

  loadedData = {};
  let loadedOk = 0;
  for (const type of Object.keys(SCHEMAS)) {
    try {
      const { content } = await getFile(SCHEMAS[type].path);
      loadedData[type] = JSON.parse(content);
      loadedOk++;
    } catch (e) {
      console.warn(type, e.message);
      loadedData[type] = null;
    }
  }
  for (const l of LANGS) {
    try {
      const { content } = await getFile(`i18n/${l}.json`);
      i18nEdits[l] = flatten(JSON.parse(content), "", {});
    } catch (e) {
      console.warn("i18n", l, e.message);
      i18nEdits[l] = null;
    }
  }

  $("#refreshBtn").disabled = false;
  dirty.clear();
  pendingUploads.clear();
  i18nLang = "ru";
  currentType = loadedOk > 0 ? "catalog" : "connection";
  updateDirtyUi(true);
  renderSidebar();
  renderForm();

  if (loadedOk > 0) setStatus(`Данные загружены (${loadedOk}/${Object.keys(SCHEMAS).length}).`, "success");
  else setStatus("Не удалось загрузить данные. Проверьте токен и имя репозитория во вкладке «Подключение».", "error");
}

async function publish() {
  const { token, repo } = getConfig();
  if (!token || !repo) return setStatus("Сначала настройте подключение (токен и репозиторий).", "error");

  collectCurrent();

  const dataTypes = [...dirty].filter((t) => SCHEMAS[t]);
  const errors = [];
  for (const t of dataTypes) errors.push(...validateType(t));
  if (errors.length) {
    return setStatus("Нельзя опубликовать:\n• " + errors.join("\n• "), "error");
  }

  const files = {};
  let hasUploads = 0;
  for (const [type, schema] of Object.entries(SCHEMAS)) {
    if (!dirty.has(type) || loadedData[type] == null) continue;
    files[schema.path] = toB64(JSON.stringify(loadedData[type], null, 2));
  }
  if (dirty.has("i18n")) {
    for (const l of LANGS) {
      if (i18nEdits[l]) files[`i18n/${l}.json`] = toB64(JSON.stringify(hydrate(i18nEdits[l]), null, 2));
    }
  }
  for (const up of pendingUploads.values()) {
    files[up.path] = up.b64;
    hasUploads++;
  }

  const total = Object.keys(files).length;
  if (!total) return setStatus("Нет изменений для публикации.", "info");
  if (!confirm(`Опубликовать изменения?\nФайлов к сохранению: ${total}${hasUploads ? ` (включая ${hasUploads} загруженных файлов)` : ""}`)) return;

  setStatus("Публикуем на GitHub...", "info");
  $("#publishBtn").disabled = true;
  try {
    await commitBatch(files, "Site update via admin panel");
    dirty.clear();
    pendingUploads.clear();
    updateDirtyUi(true);
    renderSidebar();
    setStatus("Готово! Изменения опубликованы. Сайт обновится в течение пары минут.", "success");
  } catch (e) {
    console.error(e);
    setStatus("Ошибка публикации: " + ruError(e.message), "error");
  } finally {
    $("#publishBtn").disabled = false;
  }
}

/* ===== События ===== */

function bindEvents() {
  /* Навигация по разделам */
  $("#sidebar").addEventListener("click", (e) => {
    const btn = e.target.closest(".nav-item");
    if (!btn) return;
    collectCurrent();
    currentType = btn.dataset.type;
    renderSidebar();
    renderForm();
  });

  /* Клики внутри формы */
  const panel = $("#formPanel");
  panel.addEventListener("click", (e) => {
    const t = e.target;

    if (t.closest("[data-upload-clear]")) {
      collectCurrent();
      const slot = t.closest(".upload-slot");
      const fi = slot.querySelector(".upload-input");
      if (fi && fi.dataset.ref) pendingUploads.delete(fi.dataset.ref);
      const text = slot.parentElement.querySelector("[data-upload-target]");
      const oldValue = text ? text.value : "";
      if (oldValue) {
        for (const [ref, up] of pendingUploads) {
          if (up.path === oldValue) pendingUploads.delete(ref);
        }
      }
      if (text) text.value = "";
      renderSlotPreview(slot);
      markDirty(currentType);
      return;
    }

    if (t.closest("[data-upload-pick]")) {
      const slot = t.closest(".upload-slot");
      const fi = slot.querySelector(".upload-input");
      if (fi) fi.click();
      return;
    }

    if (t.matches("[data-lang]")) {
      i18nLang = t.dataset.lang;
      renderI18n();
      return;
    }

    /* структурные операции — сначала собираем, потом правим данные и перерисовываем */
    if (currentType === "connection" || currentType === "i18n") return;

    collectCurrent();
    const schema = SCHEMAS[currentType];
    if (!schema) return;
    let data = loadedData[currentType];

    if (t.matches("[data-add-item]")) {
      if (!Array.isArray(data)) data = [];
      const empty = {};
      schema.fields.forEach((f) => { empty[f.key] = f.type === "checkbox" ? false : f.type === "number" ? 0 : ""; });
      data.push(empty);
      loadedData[currentType] = data;
      markDirty(currentType);
      renderForm();
      return;
    }

    if (t.matches("[data-remove]")) {
      data.splice(Number(t.dataset.remove), 1);
      loadedData[currentType] = data;
      markDirty(currentType);
      renderForm();
      return;
    }

    if (t.matches("[data-dup]")) {
      const src = JSON.parse(JSON.stringify(data[Number(t.dataset.dup)]));
      data.splice(Number(t.dataset.dup) + 1, 0, src);
      loadedData[currentType] = data;
      markDirty(currentType);
      renderForm();
      return;
    }

    if (t.matches("[data-move]")) {
      const i = Number(t.dataset.index);
      const j = t.dataset.move === "up" ? i - 1 : i + 1;
      if (j < 0 || j >= data.length) return;
      [data[i], data[j]] = [data[j], data[i]];
      loadedData[currentType] = data;
      markDirty(currentType);
      renderForm();
      return;
    }

    if (t.matches("[data-simple-remove]")) {
      t.closest(".list-item-row").remove();
      markDirty(currentType);
      return;
    }
    if (t.matches("[data-add-simple]")) {
      const c = panel.querySelector(`[data-ns-key="${t.dataset.addSimple}"]`);
      c.insertAdjacentHTML("beforeend", '<div class="list-item-row"><input type="text" value="" data-ns-value><button type="button" class="btn-remove btn-sm" data-simple-remove>✕</button></div>');
      markDirty(currentType);
      return;
    }
    if (t.matches("[data-nested-remove]")) {
      t.closest(".nested-row").remove();
      markDirty(currentType);
      return;
    }
    if (t.matches("[data-add-nested]")) {
      const n = (schema.nested || []).find((x) => x.key === t.dataset.addNested);
      if (!n) return;
      const c = panel.querySelector(`[data-nn-key="${t.dataset.addNested}"]`);
      const empty = {};
      n.fields.forEach((f) => { empty[f.key] = f.type === "checkbox" ? false : f.type === "number" ? 0 : ""; });
      c.insertAdjacentHTML("beforeend", `
        <div class="nested-row">
          ${n.fields.map((f) => `<div class="form-field"><label>${f.label}</label>${fieldInput(f, empty[f.key])}</div>`).join("")}
          <button type="button" class="btn-remove btn-sm" data-nested-remove>Удалить</button>
        </div>`);
      markDirty(currentType);
      return;
    }
  });

  /* Изменение полей */
  panel.addEventListener("input", (e) => {
    if (currentType === "i18n") {
      const ta = e.target.closest("[data-i18n-value]");
      if (ta) {
        const key = ta.closest(".i18n-row").dataset.key;
        if (i18nEdits[i18nLang]) i18nEdits[i18nLang][key] = ta.value;
        markDirty("i18n", true);
      }
      return;
    }
    if (currentType && currentType !== "connection") markDirty(currentType, true);
  });
  panel.addEventListener("change", (e) => {
    if (currentType === "i18n" || currentType === "connection") return;
    if (currentType) markDirty(currentType, true);
  });

  /* Загрузка файлов (изображения и 3D-модели) */
  panel.addEventListener("change", (e) => {
    const input = e.target.closest(".upload-input");
    if (!input) return;
    const slot = input.closest(".upload-slot");
    const kind = slot.dataset.is;
    const file = input.files && input.files[0];
    if (!file) return;

    const ext = extFrom(file.name);
    const ref = "u_" + Math.random().toString(36).slice(2, 10);
    const path = (kind === "image" ? "images/" : "models/") + (kind === "image" ? "img_" : "model_") + Date.now() + "." + ext;

    const reader = new FileReader();
    reader.onload = () => {
      const b64 = String(reader.result).split(",")[1];
      pendingUploads.set(ref, { path, b64 });
      input.dataset.ref = ref;
      input.dataset.path = path;
      input.value = "";
      const text = slot.parentElement.querySelector("[data-upload-target]");
      if (text) text.value = path;
      renderSlotPreview(slot);
      if (currentType) markDirty(currentType);
    };
    reader.readAsDataURL(file);
  });

  /* Поиск по текстам (фильтр строк без перерисовки) */
  panel.addEventListener("input", (e) => {
    if (!e.target.matches(".i18n-search")) return;
    const q = e.target.value.trim().toLowerCase();
    const langData = i18nEdits[i18nLang] || {};
    panel.querySelectorAll(".i18n-row").forEach((row) => {
      const key = row.dataset.key;
      const hay = ((I18N_LABELS[key] || key) + " " + String(langData[key] || "")).toLowerCase();
      row.style.display = hay.includes(q) ? "" : "none";
    });
    panel.querySelectorAll(".i18n-group").forEach((group) => {
      const vis = Array.from(group.querySelectorAll(".i18n-row")).some((r) => r.style.display !== "none");
      group.style.display = vis ? "" : "none";
    });
  });

  /* Кнопки в шапке */
  $("#refreshBtn").addEventListener("click", () => {
    if (dirty.size) {
      if (!confirm("Есть несохранённые изменения. Загрузить данные заново и отменить их?")) return;
    }
    loadAll();
  });
  $("#publishBtn").addEventListener("click", publish);
}

/* ===== Запуск ===== */

bindEvents();

(function init() {
  const hasRepo = !!localStorage.getItem("gh_repo");
  currentType = hasRepo ? "catalog" : "connection";
  renderSidebar();
  renderForm();
  if (hasRepo) loadAll();
  const link = $("#siteLink");
  if (siteBase()) {
    link.href = siteBase();
    link.hidden = false;
  }
})();