const $ = id => document.getElementById(id);

const addBtn = $("addBtn");
const titleInput = $("titleInput");
const descInput = $("descInput");
const dueInput = $("dueInput");
const todoList = $("todoList");
const pagination = $("pagination");
const errorBox = $("errorMessage");

let todos = []; // lokalny array z zadaniami
const itemsPerPage = 3;
let currentPage = 1;

/* ===== Load todos from Supabase ===== */
loadTodos();

async function loadTodos() {
  try {
    const { data, error } = await supabase
      .from("tasks")             // nowa tabela
      .select("id, title, description, due_date")
      .order("id", { ascending: false });

    if (!error && data) {
      todos = data.map(t => ({
        id: t.id,
        title: t.title,
        description: t.description,
        due_date: t.due_date
      }));
      localStorage.setItem("todos", JSON.stringify(todos));
    } else {
      todos = JSON.parse(localStorage.getItem("todos")) || [];
    }
  } catch (e) {
    todos = JSON.parse(localStorage.getItem("todos")) || [];
  }
  render();
}

/* ===== Add new task ===== */
addBtn.onclick = async () => {
  const title = titleInput.value.trim();
  const description = descInput.value.trim();
  const due_date = dueInput.value;

  if (!title) return showError("Title is required");

  const newTask = { title, description, due_date };
  todos.unshift(newTask);
  localStorage.setItem("todos", JSON.stringify(todos));
  titleInput.value = "";
  descInput.value = "";
  dueInput.value = "";
  currentPage = 1;
  render();

  try {
    const { data, error } = await supabase
      .from("tasks")
      .insert([newTask])
      .select("id, title, description, due_date")
      .limit(1);

    if (!error && data?.length) {
      todos[0] = data[0]; // aktualizacja id
      localStorage.setItem("todos", JSON.stringify(todos));
      render();
    }
  } catch (e) {
    showError("Saved locally — will sync when online");
  }
};

/* ===== Render all tasks ===== */
function render() {
  renderTodos();
  renderPagination();
}

function renderTodos() {
  todoList.innerHTML = "";
  const start = (currentPage - 1) * itemsPerPage;

  todos.slice(start, start + itemsPerPage).forEach((item, i) => {
    const li = document.createElement("li");
    li.className = "todo-item";
    li.innerHTML = `
      <div>
        <strong>${escapeHtml(item.title)}</strong><br>
        <small>${escapeHtml(item.description)}</small><br>
        <em>${item.due_date || ""}</em>
      </div>
      <button class="edit-btn">Edit</button>
      <button class="delete-btn">Delete</button>
    `;

    li.querySelector(".edit-btn").onclick = () => editTask(start + i, li);
    li.querySelector(".delete-btn").onclick = () => deleteTask(start + i);

    todoList.append(li);
  });
}

/* ===== Pagination ===== */
function renderPagination() {
  pagination.innerHTML = "";
  const pages = Math.max(1, Math.ceil(todos.length / itemsPerPage));

  for (let i = 1; i <= pages; i++) {
    const btn = document.createElement("button");
    btn.className = "pagination-btn";
    btn.textContent = i;
    btn.disabled = i === currentPage;
    btn.onclick = () => { currentPage = i; render(); };
    pagination.append(btn);
  }
}

/* ===== Edit task ===== */
function editTask(index, li) {
  const item = todos[index];
  li.innerHTML = `
    <input class="todo-text" id="editTitle" value="${escapeHtml(item.title)}" placeholder="Title">
    <input class="todo-text" id="editDesc" value="${escapeHtml(item.description)}" placeholder="Description">
    <input type="date" class="todo-text" id="editDue" value="${item.due_date || ""}">
    <button class="save-btn">Save</button>
    <button class="delete-btn">Delete</button>
  `;

  li.querySelector(".save-btn").onclick = async () => {
    const valueTitle = li.querySelector("#editTitle").value.trim();
    const valueDesc = li.querySelector("#editDesc").value.trim();
    const valueDue = li.querySelector("#editDue").value;

    if (!valueTitle) return showError("Title cannot be empty");

    const old = { ...item };
    todos[index] = { ...item, title: valueTitle, description: valueDesc, due_date: valueDue };
    localStorage.setItem("todos", JSON.stringify(todos));
    render();

    if (old.id) {
      try {
        await supabase
          .from("tasks")
          .update({ title: valueTitle, description: valueDesc, due_date: valueDue })
          .eq("id", old.id);
      } catch (e) {
        showError("Saved locally — will sync when online");
      }
    }
  };

  li.querySelector(".delete-btn").onclick = () => deleteTask(index);
}

/* ===== Delete task ===== */
async function deleteTask(index) {
  const removed = todos.splice(index, 1)[0];
  localStorage.setItem("todos", JSON.stringify(todos));

  if ((currentPage - 1) * itemsPerPage >= todos.length) currentPage = Math.max(1, currentPage - 1);
  render();

  if (removed.id) {
    try {
      await supabase.from("tasks").delete().eq("id", removed.id);
    } catch (e) {
      showError("Deleted locally — will sync when online");
    }
  }
}

/* ===== Helpers ===== */
function showError(text) {
  errorBox.textContent = text;
  errorBox.style.display = "block";
  setTimeout(() => (errorBox.style.display = "none"), 3000);
}

function escapeHtml(s) {
  return s.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
