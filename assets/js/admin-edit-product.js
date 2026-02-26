document.addEventListener("DOMContentLoaded", () => {

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
  // Get Product ID from URL
  // -----------------------------
  const params = new URLSearchParams(window.location.search);
  const productId = params.get("id");

  if (!productId) {
    alert("No product ID provided.");
    window.location.href = "admin-products.html";
  }


  // -----------------------------
  // Load Categories
  // -----------------------------
  async function loadCategories(selectedId) {
    const res = await fetch("/api/admin/categories");
    const categories = await res.json();

    const select = document.getElementById("category");
    select.innerHTML = "";

    categories.forEach(cat => {
      const option = document.createElement("option");
      option.value = cat.id;
      option.textContent = cat.name;
      if (cat.id == selectedId) option.selected = true;
      select.appendChild(option);
    });
  }


  // -----------------------------
  // Load Product Data
  // -----------------------------
  async function loadProduct() {
    const res = await fetch(`/api/product/${productId}`);
    const p = await res.json();

    document.getElementById("name").value = p.name || "";
    document.getElementById("price").value = p.price || 0;
    document.getElementById("description").value = p.description || "";
    document.getElementById("image").value = p.image || "";
    document.getElementById("active").value = p.active ?? 1;

    if (p.image) {
      const preview = document.getElementById("imagePreview");
      preview.src = p.image;
      preview.style.display = "block";
    }

    await loadCategories(p.category_id);
  }

  loadProduct();


  // -----------------------------
  // Live Image Preview
  // -----------------------------
  document.getElementById("imageFile").addEventListener("change", function () {
    const file = this.files[0];
    if (!file) return;

    const preview = document.getElementById("imagePreview");
    preview.src = URL.createObjectURL(file);
    preview.style.display = "block";
  });


  // -----------------------------
  // Update Product
  // -----------------------------
  document.getElementById("editProductForm").addEventListener("submit", async (e) => {
    e.preventDefault();

    const formData = new FormData();

    formData.append("name", document.getElementById("name").value.trim());
    formData.append("price", document.getElementById("price").value);
    formData.append("description", document.getElementById("description").value.trim());
    formData.append("category_id", document.getElementById("category").value);
    formData.append("active", document.getElementById("active").value);

    const file = document.getElementById("imageFile").files[0];
    if (file) {
      formData.append("imageFile", file);
    } else {
      formData.append("image", document.getElementById("image").value.trim());
    }

    const res = await fetch(`/api/product/${productId}`, {
      method: "PUT",
      body: formData
    });

    const data = await res.json();
    alert(data.message);

    if (res.ok) {
      window.location.href = "admin-products.html";
    }
  });

});
