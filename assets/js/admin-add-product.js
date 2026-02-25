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
// Image Preview
// -----------------------------
document.getElementById("imageFile").addEventListener("change", function () {
  const file = this.files[0];
  if (!file) return;

  const preview = document.getElementById("imagePreview");
  preview.src = URL.createObjectURL(file);
  preview.style.display = "block";
});


// -----------------------------
// Handle Add Product Form
// -----------------------------
document.getElementById("addProductForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  const formData = new FormData();

  formData.append("name", document.getElementById("name").value.trim());
  formData.append("price", document.getElementById("price").value);
  formData.append("description", document.getElementById("description").value.trim());
  formData.append("category_id", document.getElementById("category").value);
  formData.append("active", 1); // ensure new product is active

  const file = document.getElementById("imageFile").files[0];
  if (file) {
    formData.append("imageFile", file);
  } else {
    formData.append("image", document.getElementById("image").value.trim());
  }

  const res = await fetch("/api/admin/product", {
    method: "POST",
    body: formData
  });

  const data = await res.json();
  alert(data.message);

  if (res.ok) {
    window.location.href = "admin-products.html";
  }
});
