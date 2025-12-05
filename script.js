// === CONFIG SUPABASE ===
const supabaseUrl = "https://almpaoelubriseebectm.supabase.co";
const supabaseKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFsbXBhb2VsdWJyaXNlZWJlY3RtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzkyNDI2NDksImV4cCI6MjA1NDgxODY0OX0.annR0l8tkVcJtgSxW9yeZ8OSZAdR7AzjeJsP5M8kCQM";

const supabase = window.supabase.createClient(supabaseUrl, supabaseKey);

const $ = selector => document.getElementById(selector);

const todoInput = $("todoInput");
const todoDesc = $("todoDesc");
const todoDeadline = $("todoDeadline");
const addBtn = $("addBtn");
const todoList = $("todoList");
const errorMessage = $("errorMessage");
const prevPageBtn = $("prevPage");
const nextPageBtn = $("nextPage");

let currentPage = 1;
const itemsPerPage = 5;
let todos = [];

// === LOAD FROM LOCAL STORAGE ===
function loadLocal() {
  const saved = localStorage.getItem("todos");
  todos = saved ? JSON.parse(saved) : [];
}

// === SAVE TO LOCAL STORAGE ===
function saveLocal() {
  localStorage.setItem("todos", JSON.stringify(todos));
}

// === DISPLAY ERROR ===
function showError(msg) {
  errorMessage.innerText = msg;
  errorMessage.style.display = "block";
  setTimeout(() => (errorMessage.style.display = "none"), 2000);
}

// === ESCAPE HTML ===
function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

// === RENDER LIST ===
function renderTodos() {
  todoList.innerHTML = "";
  const start = (currentPage - 1) * itemsPerPage;
  const pageItems = todos.slice(start, start + itemsPerPage);

  pageItems.forEach((item, index) => {
    const li = document.createElement("li");
    li.classList.add("todo-item");

    li.innerHTML = `
      <div class="todo-text">
        <strong>${escapeHtml(item.text)}</strong><br>
        <small>${escapeHtml(item.description || "")}</small><br>
        <small>📅 ${item.deadline || "No date"}</small>
      </div>
      <button class="edit-btn">Edit</button>
      <button class="delete-btn">Delete</button>
    `;

    // === Edit ===
    li.querySelector(".edit-btn").addEventListener("click", () => {
      const newText = prompt("Task:", item.text);
      const newDesc = prompt("Description:", item.description);
      const newDeadline = prompt("Deadline (YYYY-MM-DD):", item.deadline);

      if (newText) {
        item.text = newText;
        item.description = newDesc || "";
        item.deadline = newDeadline || "";
        saveLocal();
        renderTodos();
      }
    });

    // === Delete ===
    li.querySelector(".delete-btn").addEventListener("click", () => {
      todos.splice(start + index, 1);
      saveLocal();
      renderTodos();
    });

    todoList.appendChild(li);
  });

  prevPageBtn.disabled = currentPage === 1;
  nextPageBtn.disabled = start + itemsPerPage >= todos.length;
}

// === ADD TASK ===
addBtn.addEventListener("click", async () => {
  const text = todoInput.value.trim();
  const description = todoDesc.value.trim();
  const deadline = todoDeadline.value || null;

  if (!text) {
    showError("Write task name first");
    return;
  }

  const newTask = { text, description, deadline };
  todos.unshift(newTask);
  saveLocal();
  renderTodos();

  todoInput.value = "";
  todoDesc.value = "";
  todoDeadline.value = "";

  // === SAVE TO SUPABASE ===
  await supabase.from("whattodoapp").insert([newTask]);
});

// === PAGINATION ===
prevPageBtn.addEventListener("click", () => {
  currentPage--;
  renderTodos();
});
nextPageBtn.addEventListener("click", () => {
  currentPage++;
  renderTodos();
});

// === INITIALIZE ===
loadLocal();
renderTodos();
