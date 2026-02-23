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
// Global product list
// -----------------------------
let allProducts = [];


// -----------------------------
// Load all products
// -----------------------------
async function loadProducts() {
  const res = await fetch("/api/products");
  allProducts = await res.json();
  applyFilters();
}


// -----------------------------
// Render products into table
// -----------------------------
function renderProducts(products) {
  const table = document.getElementById("productTable");
  table.innerHTML = "";

  products.forEach(p => {
    table.innerHTML += `
      <tr>
        <td>${p.id}</td>
        <td>${p.name}</td>
        <td>£${p.price.toFixed(2)}</td>
        <td>${p.category || "Uncategorised"}</td>
        <td>${p.active ? "Yes" : "No"}</td>
        <td>
          <a href="admin-edit-product.html?id=${p.id}" class="btn btn-sm btn-primary">Edit</a>
          <button class="btn btn-sm btn-danger" onclick="deleteProduct(${p.id})">Delete</button>
        </td>
      </tr>
    `;
  });
}


// -----------------------------
// Load categories into filter
// -----------------------------
async function loadCategoryFilter() {
  const res = await fetch("/api/categories");
  const categories = await res.json();

  const filter = document.getElementById("categoryFilter");

  categories.forEach(cat => {
    filter.innerHTML += `<option value="${cat.name}">${cat.name}</option>`;
  });
}


// -----------------------------
// Apply search + filters
// -----------------------------
function applyFilters() {
  const search = document.getElementById("searchInput").value.toLowerCase();
  const category = document.getElementById("categoryFilter").value;
  const active = document.getElementById("activeFilter").value;

  let filtered = allProducts.filter(p => {
    const matchesSearch =
      p.name.toLowerCase().includes(search) ||
      (p.category && p.category.toLowerCase().includes(search)) ||
      p.price.toString().includes(search);

    const matchesCategory =
      category === "" || p.category === category;

    const matchesActive =
      active === "" || p.active.toString() === active;

    return matchesSearch && matchesCategory && matchesActive;
  });

  renderProducts(filtered);
}


// -----------------------------
// Delete product
// -----------------------------
async function deleteProduct(id) {
  if (!confirm("Are you sure you want to deactivate this product?")) return;

  const res = await fetch(`/api/product/${id}`, {
    method: "DELETE"
  });

  const data = await res.json();
  alert(data.message);

  if (res.ok) loadProducts();
}


// -----------------------------
// Event listeners
// -----------------------------
document.getElementById("searchInput").addEventListener("input", applyFilters);
document.getElementById("categoryFilter").addEventListener("change", applyFilters);
document.getElementById("activeFilter").addEventListener("change", applyFilters);


// -----------------------------
// Initialise
// -----------------------------
loadProducts();
loadCategoryFilter();
