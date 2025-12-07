// script.js
// Logika frontend: CRUD bezpośrednio do Supabase REST API (PostgREST).
// Uwaga: index.html musi ustawić window.SUPABASE.url i .anonKey

const SUPABASE = window.SUPABASE || {};
if (!SUPABASE.url || !SUPABASE.anonKey) {
  alert("Proszę wstawić SUPABASE_URL i SUPABASE_ANON_KEY w index.html");
}

const API_BASE = `${SUPABASE.url}/rest/v1`;
const TABLE = "items"; // nazwa tabeli zaprojektowanej w migracji
const HEADERS = {
  "apikey": SUPABASE.anonKey,
  "Authorization": `Bearer ${SUPABASE.anonKey}`,
  "Content-Type": "application/json",
  "Accept": "application/json"
};

// --- Utils
function showMsg(text, kind = "info") {
  const el = document.getElementById("msg");
  el.textContent = text;
  el.className = "msg " + kind;
  setTimeout(() => el.textContent = "", 4000);
}

async function api(path = "", opts = {}) {
  const url = `${API_BASE}${path}`;
  const res = await fetch(url, { ...opts, headers: HEADERS });
  // PostgREST returns 204 for DELETE when no content, otherwise JSON
  let body = null;
  if (res.status !== 204) {
    try { body = await res.json(); } catch (e) { body = null; }
  }
  return { status: res.status, ok: res.ok, body, raw: res };
}

// --- Validation (frontend)
function validateItem(data) {
  const errors = [];
  if (!data.title || String(data.title).trim().length < 1) errors.push("Tytuł jest wymagany.");
  if (!Number.isFinite(Number(data.priority))) errors.push("Priorytet musi być liczbą.");
  const p = Number(data.priority);
  if (p < 1 || p > 5) errors.push("Priorytet musi być 1..5.");
  if (data.title && data.title.length > 200) errors.push("Tytuł max 200 znaków.");
  if (data.category && data.category.length > 100) errors.push("Kategoria max 100 znaków.");
  return errors;
}

// --- CRUD
async function listItems() {
  // pobierz wszystkie, posortuj po id desc
  const r = await api(`/${TABLE}?select=*&order=id.desc`);
  if (!r.ok) { showMsg("Błąd pobierania listy: " + r.status, "error"); return []; }
  return r.body;
}

async function getItem(id) {
  const r = await api(`/${TABLE}?select=*&id=eq.${id}`);
  if (!r.ok) throw new Error("Nie znaleziono");
  return r.body[0];
}

async function createItem(data) {
  const r = await api(`/${TABLE}`, {
    method: "POST",
    body: JSON.stringify(data)
  });
  if (r.status === 201 || r.status === 200) return r.body[0] || r.body;
  throw { status: r.status, body: r.body };
}

async function updateItem(id, data) {
  const r = await api(`/${TABLE}?id=eq.${id}`, {
    method: "PATCH",
    body: JSON.stringify(data)
  });
  if (r.ok) return r.body;
  throw { status: r.status, body: r.body };
}

async function deleteItem(id) {
  const r = await api(`/${TABLE}?id=eq.${id}`, { method: "DELETE" });
  if (r.status === 204) return true;
  if (r.ok) return r.body;
  throw { status: r.status, body: r.body };
}

// --- UI
const form = document.getElementById("item-form");
const tableBody = document.querySelector("#items-table tbody");
const refreshBtn = document.getElementById("refresh-btn");
const resetBtn = document.getElementById("reset-btn");

async function renderList() {
  tableBody.innerHTML = "<tr><td colspan='6'>Ładowanie...</td></tr>";
  try {
    const items = await listItems();
    if (!items.length) {
      tableBody.innerHTML = "<tr><td colspan='6'>Brak elementów</td></tr>";
      return;
    }
    tableBody.innerHTML = "";
    for (const it of items) {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${it.id}</td>
        <td>${escapeHtml(it.title)}</td>
        <td>${it.priority}</td>
        <td>${it.due_date ? it.due_date.substring(0,10) : ""}</td>
        <td>${it.category || ""}</td>
        <td class="actions">
          <button data-id="${it.id}" class="edit">Edytuj</button>
          <button data-id="${it.id}" class="delete">Usuń</button>
          <button data-id="${it.id}" class="view">Szczegóły</button>
        </td>
      `;
      tableBody.appendChild(tr);
    }
  } catch (e) {
    console.error(e);
    tableBody.innerHTML = "<tr><td colspan='6'>Błąd renderowania</td></tr>";
  }
}

function escapeHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

form.addEventListener("submit", async (ev) => {
  ev.preventDefault();
  const id = document.getElementById("item-id").value;
  const payload = {
    title: document.getElementById("title").value.trim(),
    description: document.getElementById("description").value.trim() || null,
    priority: Number(document.getElementById("priority").value),
    due_date: document.getElementById("due_date").value || null,
    category: document.getElementById("category").value.trim() || null // pole B
  };

  const errors = validateItem(payload);
  if (errors.length) { showMsg(errors.join(" "), "error"); return; }

  try {
    if (id) {
      await updateItem(id, payload);
      showMsg("Zaktualizowano.", "ok");
    } else {
      await createItem(payload);
      showMsg("Utworzono.", "ok");
    }
    formReset();
    await renderList();
  } catch (err) {
    console.error(err);
    showMsg("Błąd zapisu: " + (err.status || ""), "error");
  }
});

document.addEventListener("click", async (ev) => {
  const t = ev.target;
  if (t.matches(".edit")) {
    const id = t.dataset.id;
    try {
      const it = await getItem(id);
      document.getElementById("item-id").value = it.id;
      document.getElementById("title").value = it.title || "";
      document.getElementById("description").value = it.description || "";
      document.getElementById("priority").value = it.priority || 1;
      document.getElementById("due_date").value = it.due_date ? it.due_date.substring(0,10) : "";
      document.getElementById("category").value = it.category || "";
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (e) { showMsg("Nie można pobrać itemu", "error"); }
  } else if (t.matches(".delete")) {
    const id = t.dataset.id;
    if (!confirm("Na pewno usunąć?")) return;
    try {
      await deleteItem(id);
      showMsg("Usunięto.", "ok");
      await renderList();
    } catch (e) { showMsg("Błąd usuwania", "error"); }
  } else if (t.matches(".view")) {
    const id = t.dataset.id;
    try {
      const it = await getItem(id);
      document.getElementById("item-details").textContent = JSON.stringify(it, null, 2);
      document.getElementById("details-section").classList.remove("hidden");
    } catch (e) { showMsg("Błąd pobierania szczegółów", "error"); }
  }
});

document.getElementById("close-details").addEventListener("click", () => {
  document.getElementById("details-section").classList.add("hidden");
});

refreshBtn.addEventListener("click", renderList);
resetBtn.addEventListener("click", formReset);

function formReset() {
  document.getElementById("item-id").value = "";
  form.reset();
}

// initial load
renderList();
