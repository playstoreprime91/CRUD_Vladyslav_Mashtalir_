// skript.js - vanilla JS + supabase-js
if (!window.Supabase) {
  // supabase v2 exposes `Supabase` global via CDN packaging; but we can also access via window.supabase
}
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const table = "tasks"; // nazwa encji / tabeli

// DOM
const form = document.getElementById("task-form");
const titleInput = document.getElementById("title");
const descInput = document.getElementById("description");
const priorityInput = document.getElementById("priority");
const dueDateInput = document.getElementById("due_date");
const completedInput = document.getElementById("completed");
const idInput = document.getElementById("task-id");
const tasksBody = document.getElementById("tasks-body");
const emptyBox = document.getElementById("empty");
const formTitle = document.getElementById("form-title");
const cancelBtn = document.getElementById("cancel-edit");
const searchInput = document.getElementById("search");
const filterSelect = document.getElementById("filter");
const refreshBtn = document.getElementById("refresh");

// helpers
function showEmpty(show) {
  emptyBox.style.display = show ? "block" : "none";
}
function rowHtml(task){
  return `
    <tr data-id="${task.id}">
      <td>${escapeHtml(task.title)}</td>
      <td>${task.priority ?? ""}</td>
      <td>${task.due_date ? new Date(task.due_date).toLocaleDateString() : ""}</td>
      <td>${task.completed ? '<span class="badge done">Tak</span>' : '<span class="badge pending">Nie</span>'}</td>
      <td>
        <button class="small" data-action="view">Szczegóły</button>
        <button class="small" data-action="edit">Edytuj</button>
        <button class="small delete" data-action="delete">Usuń</button>
      </td>
    </tr>
  `;
}
function escapeHtml(s){ if (!s) return ""; return s.replace(/[&<>"']/g, c=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c])); }

// load list
async function loadTasks(){
  tasksBody.innerHTML = "";
  showEmpty(false);
  try {
    let query = supabaseClient.from(table).select("*").order("created_at",{ascending:false});
    const q = searchInput.value.trim();
    if (q){
      // filter: title ilike
      query = query.ilike("title", `%${q}%`);
    }
    const filter = filterSelect.value;
    if (filter === "pending") query = query.eq("completed", false);
    if (filter === "done") query = query.eq("completed", true);

    const { data, error } = await query;
    if (error) throw error;
    if (!data || data.length === 0){
      showEmpty(true);
      return;
    }
    tasksBody.innerHTML = data.map(rowHtml).join("");
  } catch (err){
    console.error(err);
    alert("Błąd podczas ładowania: " + (err.message || err));
  }
}

// create
async function createTask(payload){
  // payload: { title, description, priority, due_date, completed }
  // Basic validation
  if (!payload.title || payload.title.trim().length < 1) {
    throw new Error("Tytuł jest wymagany.");
  }
  if (!Number.isInteger(payload.priority)) throw new Error("Priorytet musi być liczbą całkowitą.");
  const { data, error } = await supabaseClient.from(table).insert([payload]).select().single();
  if (error) throw error;
  return data;
}

// update
async function updateTask(id, payload){
  const { data, error } = await supabaseClient.from(table).update(payload).eq("id", id).select().single();
  if (error) throw error;
  return data;
}

// delete
async function deleteTask(id){
  const { data, error } = await supabaseClient.from(table).delete().eq("id", id);
  if (error) throw error;
  return data;
}

// load single
async function getTask(id){
  const { data, error } = await supabaseClient.from(table).select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data;
}


// form submit
form.addEventListener("submit", async (e)=>{
  e.preventDefault();
  const id = idInput.value || null;
  const payload = {
    title: titleInput.value.trim(),
    description: descInput.value.trim() || null,
    priority: Math.floor(Number(priorityInput.value)) || 1,
    due_date: dueDateInput.value ? new Date(dueDateInput.value).toISOString() : null,
    completed: completedInput.checked
  };
  try {
    if (!payload.title) { alert("Tytuł jest wymagany."); return; }
    if (id) {
      await updateTask(id, payload);
      alert("Zaktualizowano zadanie.");
    } else {
      await createTask(payload);
      alert("Dodano zadanie.");
    }
    resetForm();
    await loadTasks();
  } catch (err) {
    console.error(err);
    alert("Błąd zapisu: " + (err.message || err));
  }
});

cancelBtn.addEventListener("click", (e)=>{
  resetForm();
});

function resetForm(){
  idInput.value="";
  formTitle.innerText = "Dodaj nowe zadanie";
  form.reset();
  priorityInput.value = 3;
}

// table actions (delegation)
tasksBody.addEventListener("click", async (e)=>{
  const btn = e.target.closest("button");
  if (!btn) return;
  const action = btn.dataset.action;
  const tr = btn.closest("tr");
  const id = tr ? tr.dataset.id : null;
  if (!id) return;

  if (action === "view") {
    try {
      const t = await getTask(id);
      alert(`Szczegóły:\n\nTytuł: ${t.title}\nOpis: ${t.description || ""}\nPriorytet: ${t.priority}\nData: ${t.due_date ? new Date(t.due_date).toLocaleString() : ""}\nWykonane: ${t.completed ? "Tak" : "Nie"}`);
    } catch (err){ alert("Błąd pobierania szczegółów."); console.error(err); }
  } else if (action === "edit") {
    try {
      const t = await getTask(id);
      idInput.value = t.id;
      titleInput.value = t.title || "";
      descInput.value = t.description || "";
      priorityInput.value = t.priority ?? 3;
      dueDateInput.value = t.due_date ? new Date(t.due_date).toISOString().slice(0,10) : "";
      completedInput.checked = !!t.completed;
      formTitle.innerText = "Edytuj zadanie";
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err){ alert("Błąd pobierania do edycji."); console.error(err); }
  } else if (action === "delete") {
    if (!confirm("Na pewno usunąć to zadanie?")) return;
    try {
      await deleteTask(id);
      alert("Usunięto.");
      await loadTasks();
    } catch (err) { alert("Błąd usuwania."); console.error(err); }
  }
});

// search/filter/refresh
searchInput.addEventListener("input", debounce(loadTasks, 400));
filterSelect.addEventListener("change", loadTasks);
refreshBtn.addEventListener("click", loadTasks);

// simple debounce
function debounce(fn, ms){
  let t;
  return function(...a){ clearTimeout(t); t = setTimeout(()=>fn(...a), ms); }
}

// initial
resetForm();
loadTasks();
