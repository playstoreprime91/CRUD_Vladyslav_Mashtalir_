// ----------- ELEMENTY ----------
const q = sel => document.querySelector(sel);
const formSection = q("#form-section");
const detailSection = q("#detail-section");
const listInfo = q("#list-info");
const table = q("#books-table");
const tbody = q("#books-tbody");

// ----------- POKAŻ/UKRYJ ----------
const show = el => el.classList.remove("hidden");
const hide = el => el.classList.add("hidden");

// ----------- CHECKBOX ----------
const checkbox = q("#confirm-checkbox");
const btnSave = q("#btn-save");

checkbox.addEventListener("change", () => {
  btnSave.disabled = !checkbox.checked;
});

// ----------- ŁADOWANIE LISTY ----------
async function loadBooks() {
  listInfo.textContent = "Ładowanie...";
  hide(table);

  const { data, error } = await supabase
    .from("books")
    .select("*")
    .order("id", { ascending: true });

  if (error) {
    listInfo.textContent = "Błąd: " + error.message;
    return;
  }

  renderList(data);
}

function renderList(items) {
  tbody.innerHTML = "";

  if (items.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" class="muted">Brak danych</td></tr>`;
    show(table);
    return;
  }

  items.forEach(b => {
    const tr = document.createElement("tr");

    tr.innerHTML = `
      <td>${b.id}</td>
      <td>${b.title}</td>
      <td>${b.author ?? ""}</td>
      <td>${b.pages ?? ""}</td>
      <td>${b.published_date ?? ""}</td>
      <td>${b.created_at ? new Date(b.created_at).toLocaleString() : ""}</td>
      <td>
        <button class="btn-view" data-id="${b.id}">Pokaż</button>
        <button class="btn-edit" data-id="${b.id}">Edytuj</button>
        <button class="btn-delete" data-id="${b.id}">Usuń</button>
      </td>
    `;

    tbody.appendChild(tr);
  });

  tbody.querySelectorAll(".btn-view").forEach(btn =>
    btn.addEventListener("click", e => showDetail(e.target.dataset.id))
  );
  tbody.querySelectorAll(".btn-edit").forEach(btn =>
    btn.addEventListener("click", e => editBook(e.target.dataset.id))
  );
  tbody.querySelectorAll(".btn-delete").forEach(btn =>
    btn.addEventListener("click", e => deleteBook(e.target.dataset.id))
  );

  show(table);
}

// ----------- DODAWANIE ----------
async function createBook(payload) {
  return await supabase.from("books").insert(payload);
}

// ----------- AKTUALIZACJA ----------
async function updateBook(id, payload) {
  return await supabase.from("books").update(payload).eq("id", id);
}

// ----------- USUWANIE ----------
async function deleteBook(id) {
  if (!confirm("Usunąć rekord?")) return;

  const { error } = await supabase.from("books").delete().eq("id", id);
  if (error) alert("Błąd: " + error.message);

  loadBooks();
}

// ----------- SZCZEGÓŁY ----------
async function showDetail(id) {
  const { data, error } = await supabase
    .from("books")
    .select("*")
    .eq("id", id)
    .single();

  if (error) return alert("Błąd: " + error.message);

  q("#detail-pre").textContent = JSON.stringify(data, null, 2);
  show(detailSection);
}

// ----------- EDYCJA ----------
async function editBook(id) {
  const { data, error } = await supabase
    .from("books")
    .select("*")
    .eq("id", id)
    .single();

  if (error) return alert("Błąd: " + error.message);

  q("#book-id").value = data.id;
  q("#title").value = data.title;
  q("#author").value = data.author ?? "";
  q("#pages").value = data.pages ?? "";
  q("#published_date").value = data.published_date ?? "";
  checkbox.checked = false;
  btnSave.disabled = true;

  q("#form-title").textContent = "Edytuj książkę";
  show(formSection);
}

// ----------- ZAMKNIĘCIE FORMULARZA ----------
q("#btn-cancel").addEventListener("click", () => {
  hide(formSection);
  q("#book-form").reset();
  checkbox.checked = false;
  btnSave.disabled = true;
});

// ----------- ZAPIS ----------
q("#book-form").addEventListener("submit", async e => {
  e.preventDefault();

  const id = q("#book-id").value;

  const payload = {
    title: q("#title").value.trim(),
    author: q("#author").value.trim() || null,
    pages: q("#pages").value ? Number(q("#pages").value) : null,
    published_date: q("#published_date").value || null
  };

  let result;

  if (id) {
    result = await updateBook(id, payload);
  } else {
    result = await createBook(payload);
  }

  if (result.error) {
    alert("Błąd: " + result.error.message);
  } else {
    alert("Zapisano.");
    hide(formSection);
    loadBooks();
  }
});

// ----------- INICJALIZACJA ----------
q("#btn-open-add").addEventListener("click", () => {
  q("#book-form").reset();
  q("#book-id").value = "";
  q("#form-title").textContent = "Dodaj książkę";
  checkbox.checked = false;
  btnSave.disabled = true;
  show(formSection);
});

q("#btn-close-detail").addEventListener("click", () =>
  hide(detailSection)
);

q("#btn-refresh").addEventListener("click", loadBooks);

loadBooks();
