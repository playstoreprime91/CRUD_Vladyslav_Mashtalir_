/* script.js
   CRUD SPA communicating directly with Supabase PostgREST endpoints.
   Table name used: "expenses"
   Validation included.
*/

const API_BASE = `${SUPABASE_URL}/rest/v1`;
const TABLE = "expenses";
const HEADERS = {
  "Content-Type": "application/json",
  "apikey": SUPABASE_ANON_KEY,
  "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
  "Accept": "application/json"
};

// ---- Helpers ----
const qs = s => document.querySelector(s);
const qsa = s => document.querySelectorAll(s);
const formatDate = (d) => {
  if (!d) return "";
  const dt = new Date(d);
  return dt.toLocaleDateString();
};
const isoDate = (d) => {
  if (!d) return null;
  const dt = new Date(d);
  return dt.toISOString().split("T")[0];
};

const showMessage = (msg) => {
  // simple console + alert fallback
  console.log(msg);
};

// ---- DOM ----
const form = qs("#expense-form");
const saveBtn = qs("#save-btn");
const resetBtn = qs("#reset-btn");
const tableBody = qs("#expenses-table tbody");
const emptyDiv = qs("#empty");
const refreshBtn = qs("#refresh-btn");
const searchInput = qs("#search");
const formTitle = qs("#form-title");
const expenseIdInput = qs("#expense-id");
const detailModal = qs("#detail-modal");
const detailBody = qs("#detail-body");
const closeModalBtn = qs("#close-modal");

// ---- API calls ----
async function apiFetch(path, opts = {}) {
  const url = `${API_BASE}${path}`;
  const res = await fetch(url, { headers: HEADERS, ...opts });
  // PostgREST returns 2xx for get/insert/update/delete as appropriate.
  let body = null;
  const text = await res.text();
  try { body = text ? JSON.parse(text) : null; } catch (e) { body = text; }
  return { status: res.status, ok: res.ok, body, headers: res.headers };
}

async function listExpenses(search = "") {
  // GET /expenses?select=*&order=date.desc
  let filter = `?select=id,title,date,amount,note,created_at&order=date.desc`;
  if (search) {
    // ilike in PostgREST
    filter += `&title=ilike.%25${encodeURIComponent(search)}%25`;
  }
  return apiFetch(`/${TABLE}${filter}`);
}

async function getExpense(id) {
  return apiFetch(`/${TABLE}?select=*&id=eq.${id}`);
}

async function createExpense(payload) {
  // POST - returns created object if prefer=return=representation
  return apiFetch(`/${TABLE}?return=representation`, {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

async function updateExpense(id, payload) {
  // PATCH row by id
  return apiFetch(`/${TABLE}?id=eq.${id}&return=representation`, {
    method: "PATCH",
    body: JSON.stringify(payload)
  });
}

async function deleteExpense(id) {
  return apiFetch(`/${TABLE}?id=eq.${id}`, { method: "DELETE" });
}

// ---- UI actions ----
function clearForm() {
  expenseIdInput.value = "";
  form.reset();
  formTitle.textContent = "Dodaj nowy wydatek";
}

function fillForm(item) {
  expenseIdInput.value = item.id;
  qs("#title").value = item.title || "";
  qs("#date").value = isoDate(item.date) || "";
  qs("#amount").value = item.amount ?? "";
  qs("#note").value = item.note || "";
  formTitle.textContent = "Edytuj wydatek";
}

function renderRow(item) {
  const tr = document.createElement("tr");
  tr.dataset.id = item.id;
  tr.innerHTML = `
    <td>${escapeHtml(item.title || "")}</td>
    <td>${escapeHtml(formatDate(item.date))}</td>
    <td>${escapeHtml(Number(item.amount).toFixed(2))}</td>
    <td>${escapeHtml((item.note || "").slice(0,60))}</td>
    <td class="actions">
      <button data-action="view">Szczegóły</button>
      <button data-action="edit">Edytuj</button>
      <button data-action="delete">Usuń</button>
    </td>
  `;
  return tr;
}

function escapeHtml(str) {
  if (!str) return "";
  return String(str)
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;");
}

async function refreshList() {
  tableBody.innerHTML = "";
  emptyDiv.style.display = "none";
  const q = searchInput.value.trim();
  const res = await listExpenses(q);
  if (!res.ok) {
    emptyDiv.textContent = `Błąd pobierania: ${res.status}`;
    emptyDiv.style.display = "block";
    return;
  }
  const rows = Array.isArray(res.body) ? res.body : [];
  if (rows.length === 0) {
    emptyDiv.textContent = "Brak rekordów.";
    emptyDiv.style.display = "block";
    return;
  }
  rows.forEach(r => tableBody.appendChild(renderRow(r)));
}

// ---- Events ----
form.addEventListener("submit", async (e) => {
  e.preventDefault();
  saveBtn.disabled = true;
  try {
    const id = expenseIdInput.value || null;
    const payload = {
      title: qs("#title").value.trim(),
      date: qs("#date").value || null,
      amount: parseFloat(qs("#amount").value) || 0,
      note: qs("#note").value.trim()
    };

    // validation
    const errors = [];
    if (!payload.title || payload.title.length < 2) errors.push("Tytuł (min 2 znaki).");
    if (!payload.date) errors.push("Data jest wymagana.");
    if (Number.isNaN(payload.amount) || payload.amount === 0) errors.push("Kwota musi być ≠ 0.");
    if (errors.length) {
      alert("Błędy walidacji:\n" + errors.join("\n"));
      return;
    }

    let res;
    if (id) {
      res = await updateExpense(id, payload);
      if (!res.ok) throw new Error(`Aktualizacja nie powiodła się: ${res.status}`);
      showMessage("Zaktualizowano.");
    } else {
      res = await createExpense(payload);
      if (!(res.ok || res.status === 201)) throw new Error(`Tworzenie nie powiodło się: ${res.status}`);
      showMessage("Stworzono.");
    }
    clearForm();
    await refreshList();
  } catch (err) {
    alert("Błąd: " + err.message);
    console.error(err);
  } finally {
    saveBtn.disabled = false;
  }
});

resetBtn.addEventListener("click", (e) => { clearForm(); });

refreshBtn.addEventListener("click", (e) => refreshList());

searchInput.addEventListener("input", debounce(() => refreshList(), 400));

tableBody.addEventListener("click", async (e) => {
  const btn = e.target.closest("button");
  if (!btn) return;
  const tr = btn.closest("tr");
  const id = tr?.dataset?.id;
  const action = btn.dataset.action;
  if (!id) return;

  if (action === "view") {
    const res = await getExpense(id);
    if (!res.ok) { alert("Błąd pobierania."); return; }
    const item = Array.isArray(res.body) ? res.body[0] : null;
    if (!item) { alert("Nie znaleziono rekordu."); return; }
    showDetail(item);
  } else if (action === "edit") {
    const res = await getExpense(id);
    const item = Array.isArray(res.body) ? res.body[0] : null;
    if (!item) { alert("Nie znaleziono rekordu."); return; }
    fillForm(item);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  } else if (action === "delete") {
    if (!confirm("Na pewno chcesz usunąć ten rekord?")) return;
    const res = await deleteExpense(id);
    if (!res.ok) {
      alert("Usuwanie nie powiodło się: " + res.status);
      return;
    }
    await refreshList();
    showMessage("Usunięto.");
  }
});

closeModalBtn.addEventListener("click", () => hideModal());
detailModal.addEventListener("click", (e) => {
  if (e.target === detailModal) hideModal();
});

function showDetail(item) {
  detailBody.innerHTML = `
    <dl>
      <dt>ID</dt><dd>${escapeHtml(item.id)}</dd>
      <dt>Tytuł</dt><dd>${escapeHtml(item.title)}</dd>
      <dt>Data</dt><dd>${escapeHtml(formatDate(item.date))}</dd>
      <dt>Kwota</dt><dd>${escapeHtml(Number(item.amount).toFixed(2))} PLN</dd>
      <dt>Notatka</dt><dd>${escapeHtml(item.note || "")}</dd>
      <dt>Stworzono</dt><dd>${escapeHtml(item.created_at || "")}</dd>
    </dl>
  `;
  detailModal.classList.remove("hidden");
}

function hideModal() {
  detailModal.classList.add("hidden");
}

// ---- Small utilities ----
function debounce(fn, wait=300) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(()=> fn.apply(this,args), wait);
  };
}

// ---- Initialization ----
(async function init(){
  if (!SUPABASE_URL || SUPABASE_URL.includes("REPLACE_WITH")) {
    alert("Uwaga: w pliku index.html musisz wstawić SUPABASE_URL i SUPABASE_ANON_KEY.");
  }
  await refreshList();
})();
