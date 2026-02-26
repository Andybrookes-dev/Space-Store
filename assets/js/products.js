async function loadProducts(category) {
    try {
        // Fetch all products
        const res = await fetch("/api/products");
        const products = await res.json();

        // Filter by category
        const filtered = products.filter(p => p.category === category);

        const grid = document.getElementById("productGrid");
        grid.innerHTML = "";

        if (!filtered.length) {
            grid.innerHTML = "<p class='text-light'>No products found.</p>";
            return;
        }

        filtered.forEach(product => {
            const card = document.createElement("div");
            card.classList.add("product-card");

            card.innerHTML = `
                <img src="${product.image}" alt="${product.name}">
                <h3>${product.name}</h3>
                <p>£${product.price.toFixed(2)}</p>
                <button class="add-to-cart"
                    data-id="${product.id}">
                    Add to Basket
                </button>
            `;

            grid.appendChild(card);
        });

        attachCartButtons();

    } catch (err) {
        console.error("Error loading products:", err);
    }
}

function attachCartButtons() {
    document.querySelectorAll(".add-to-cart").forEach(btn => {
        btn.addEventListener("click", async () => {

            // Get session info
            const res = await fetch("/api/session");
            const session = await res.json();

            if (!session.loggedIn) {
                alert("Please log in to add items to your basket.");
                return;
            }

            const email = session.email;
            const product_id = btn.dataset.id;

            // Add to cart
            const addRes = await fetch("/api/cart/add", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    email,
                    product_id,
                    quantity: 1
                })
            });

            const data = await addRes.json();
            alert(data.message || "Added to basket!");
        });
    });
}
