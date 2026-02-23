// -----------------------------
// Admin Access Protection
// -----------------------------
async function checkAdminAccess() {
  const res = await fetch("/api/session");
  const session = await res.json();

  if (!session.loggedIn || !session.isAdmin) {
    window.location.href = "index.html";
  }
}

checkAdminAccess();


// -----------------------------
// Load Categories
// -----------------------------
async function loadCategories() {
  const res = await fetch("/api/admin/categories");
  const categories = await res.json();

  const table = document.getElementById("categoryTable");
  table.innerHTML = "";

  categories.forEach(cat => {
    table.innerHTML += `
      <tr>
        <td>${cat.id}</td>
        <td>${cat.name}</td>
        <td style="width: 120px;">
          <!-- Delete button (optional) -->
          <!--
          <button class="btn btn-sm btn-danger" onclick="deleteCategory(${cat.id})">
            Delete
          </button>
          -->
        </td>
      </tr>
    `;
  });
}

loadCategories();


// -----------------------------
// Add Category
// -----------------------------
document.getElementById("addCategoryForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  const name = document.getElementById("categoryName").value.trim();

  if (!name) {
    alert("Category name is required");
    return;
  }

  const res = await fetch("/api/admin/category", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name })
  });

  const data = await res.json();
  alert(data.message);

  if (res.ok) {
    document.getElementById("categoryName").value = "";
    loadCategories();
  }
});


// -----------------------------
// OPTIONAL: Delete Category
// (Backend route not created yet)
// -----------------------------
/*
async function deleteCategory(id) {
  if (!confirm("Delete this category?")) return;

  const res = await fetch(`/api/admin/category/${id}`, {
    method: "DELETE"
  });

  const data = await res.json();
  alert(data.message);

  if (res.ok) loadCategories();
}
*/
