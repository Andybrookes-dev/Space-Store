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
// Load Categories into Dropdown
// -----------------------------
async function loadCategories() {
  const res = await fetch("/api/admin/categories");
  const categories = await res.json();

  const select = document.getElementById("category");
  select.innerHTML = "";

  categories.forEach(cat => {
    select.innerHTML += `<option value="${cat.id}">${cat.name}</option>`;
  });
}

loadCategories();


// -----------------------------
// Handle Add Product Form
// -----------------------------
document.getElementById("addProductForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  const product = {
    name: document.getElementById("name").value.trim(),
    price: parseFloat(document.getElementById("price").value),
    description: document.getElementById("description").value.trim(),
    image: document.getElementById("image").value.trim(),
    category_id: document.getElementById("category").value
  };

  // Basic validation
  if (!product.name || !product.price || !product.category_id) {
    alert("Please fill in all required fields.");
    return;
  }

  const res = await fetch("/api/admin/product", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(product)
  });

  const data = await res.json();
  alert(data.message);

  if (res.ok) {
    window.location.href = "admin-products.html";
  }
});
