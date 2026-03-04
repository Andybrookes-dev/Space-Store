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
                <p class="product-price">£${product.price.toFixed(2)}</p>
                <p class="product-description">${product.description}</p>

                <label class="text-light">Size</label>
                <select class="size-select form-select mb-2" data-product="${product.id}">
                    <option value="">Select size</option>
                </select>

                <button class="add-to-cart" data-id="${product.id}">
                    Add to Basket
                </button>
            `;

            grid.appendChild(card);

            // ⭐ Load variants for THIS product
            fetch(`/api/products/${product.id}`)
                .then(res => res.json())
                .then(fullProduct => {
                    const select = card.querySelector(".size-select");
                    fullProduct.variants.forEach(v => {
                        select.innerHTML += `<option value="${v.id}">${v.size}</option>`;
                    });
                });
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
            const sizeSelect = btn.parentElement.querySelector(".size-select");
const variant_id = sizeSelect.value;

if (!variant_id) {
    alert("Please select a size.");
    return;
}

const addRes = await fetch("/api/cart/add", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
        email,
        product_id,
        variant_id,
        quantity: 1
    })
});


            const data = await addRes.json();
            alert(data.message || "Added to basket!");

            // Update cart count in navbar
        });
    });
}
