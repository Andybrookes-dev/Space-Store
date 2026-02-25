document.addEventListener("DOMContentLoaded", () => {

    async function loadWomenProducts() {
        try {
            const res = await fetch("/api/products?category=women");
            const products = await res.json();

            const grid = document.getElementById("productGrid");
            grid.innerHTML = "";

            if (!products.length) {
                grid.innerHTML = "<p class='text-light'>No products found.</p>";
                return;
            }

            products.forEach(product => {
                const card = document.createElement("div");
                card.classList.add("product-card");

                card.innerHTML = `
                    <img src="${product.image}" class="product-image">
                    <h3 class="product-name">${product.name}</h3>
                    <p class="product-price">£${product.price}</p>
                    <a href="product.html?id=${product.id}" class="tron-btn mt-2">View Product</a>
                `;

                grid.appendChild(card);
            });

        } catch (err) {
            console.error("Error loading women's products:", err);
        }
    }

    loadWomenProducts();
});
