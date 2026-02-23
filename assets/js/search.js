// -----------------------------
// Read URL parameters
// -----------------------------
const params = new URLSearchParams(window.location.search);
const category = params.get("category") || "all";
const query = (params.get("q") || "").toLowerCase();

// Update page title
const searchTitle = document.getElementById("searchTitle");
searchTitle.textContent = `Search Results for "${query}"`;


// -----------------------------
// Load and filter products
// -----------------------------
async function loadSearchResults() {
  const res = await fetch("/api/products");
  const products = await res.json();

  let filtered = products;

  // Filter by category
  if (category === "men") {
    filtered = filtered.filter(p => p.category_id === 1);
  } else if (category === "women") {
    filtered = filtered.filter(p => p.category_id === 2);
  }

  // Filter by search query
  if (query) {
    filtered = filtered.filter(p =>
      p.name.toLowerCase().includes(query) ||
      p.description.toLowerCase().includes(query)
    );
  }

  renderProducts(filtered);
}


// -----------------------------
// Render products
// -----------------------------
function renderProducts(products) {
  const grid = document.getElementById("productGrid");
  const noResults = document.getElementById("noResults");

  grid.innerHTML = "";

  if (products.length === 0) {
    noResults.style.display = "block";
    return;
  }

  noResults.style.display = "none";

  products.forEach(p => {
    grid.innerHTML += `
      <div class="product-card">
        <img src="${p.image}" class="product-image">
        <h3 class="product-name">${p.name}</h3>
        <p class="product-price">£${p.price}</p>
        <a href="product.html?id=${p.id}" class="tron-btn mt-2">View Product</a>
      </div>
    `;
  });
}


// Run search
loadSearchResults();
