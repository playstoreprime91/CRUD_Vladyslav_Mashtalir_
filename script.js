// ===============================
// KONFIGURACJA SUPABASE
// ===============================
const SUPABASE_URL = "https://cmmzhydmdrzujbgpbike.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNtbXpoeWRtZHJ6dWpiZ3BiaWtlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ5NDAwOTQsImV4cCI6MjA4MDUxNjA5NH0.NO3xiLd2jV5WrXPoqjeuKxp_R_5EjtuFwctSY1Eym8I";
const TABLE = "items";

// GŁÓWNA FUNKCJA FETCH
async function api(path, options = {}) {
  const r = await fetch(SUPABASE_URL + "/rest/v1" + path, {
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      "Content-Type": "application/json",
      Prefer: "return=representation"
    },
    ...options
  });

  let body = null;
  try { body = await r.json(); } catch {}

  return { ok: r.ok, status: r.status, body };
}

// ===============================
// CRUD – POPRAWIONE
// ===============================
async function getItems() {
  const r = await api(`/${TABLE}?select=*`);
  return r.ok ? r.body : [];
}

async function createItem(data) {
  const r = await api(`/${TABLE}`, {
    method: "POST",
    body: JSON.stringify(data)
  });

  if (r.ok) return true;
  console.error("BŁĄD createItem:", r);
}

async function updateItem(id, data) {
  const r = await api(`/${TABLE}?id=eq.${id}`, {
    method: "PATCH",
    body: JSON.stringify(data)
  });

  if (r.ok) return true;
  console.error("BŁĄD updateItem:", r);
}

async function deleteItem(id) {
  await api(`/${TABLE}?id=eq.${id}`, { method: "DELETE" });
}

// ===============================
// WALIDACJA
// ===============================
function validateItem(data) {
  const e = [];
  if (!data.title.trim()) e.push("Tytuł jest wymagany.");
  if (!(data.priority >= 1 && data.priority <= 5))
    e.push("Priorytet musi być między 1 a 5.");
  return e;
}

// ===============================
// RENDEROWANIE
// ===============================
const tableBody = document.querySelector("#items-table tbody");

function renderTable(items) {
  tableBody.innerHTML = "";

  for (const it of items) {
    const tr = document.createElement("tr");

    tr.innerHTML = `
      <td>${it.id}</td>
      <td>${it.title}</td>
      <td>${it.description || ""}</td>
      <td>${it.priority}</td>
      <td>${it.due_date || ""}</td>
      <td>${it.done ? "✔" : "✘"}</td>
      <td>
        <button class="action edit" data-id="${it.id}">Edytuj</button>
        <button class="action delete" data-id="${it.id}">Usuń</button>
      </td>
    `;

    tableBody.appendChild(tr);
  }

  attachRowEvents();
}

function attachRowEvents() {
  document.querySelectorAll(".edit").forEach(btn =>
    btn.onclick = async () => {
      const id = btn.dataset.id;
      const items = await getItems();
      const it = items.find(x => x.id == id);

      document.getElementById("item-id").value = it.id;
      document.getElementById("title").value = it.title;
      document.getElementById("description").value = it.description || "";
      document.getElementById("priority").value = it.priority;
      document.getElementById("due_date").value = it.due_date || "";
      document.getElementById("done").checked = !!it.done;
    }
  );

  document.querySelectorAll(".delete").forEach(btn =>
    btn.onclick = async () => {
      await deleteItem(btn.dataset.id);
      refresh();
    }
  );
}

// ===============================
// FORMULARZ
// ===============================
const form = document.getElementById("item-form");

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const payload = {
    title: document.getElementById("title").value.trim(),
    description: document.getElementById("description").value.trim() || null,
    priority: Number(document.getElementById("priority").value),
    due_date: document.getElementById("due_date").value || null,
    done: document.getElementById("done").checked
  };

  const errors = validateItem(payload);
  if (errors.length) {
    alert(errors.join("\n"));
    return;
  }

  const id = document.getElementById("item-id").value;

  if (id)
    await updateItem(id, payload);
  else
    await createItem(payload);

  form.reset();
  document.getElementById("item-id").value = "";
  refresh();
});

// ===============================
// START
// ===============================
async function refresh() {
  const data = await getItems();
  renderTable(data);
}

refresh();
