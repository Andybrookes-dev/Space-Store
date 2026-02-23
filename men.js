async function loadMenProducts() {
    const res = await fetch("/api/products");
    const products = await res.json();

    // Filter for Men category
    const menProducts = products.filter(p => p.category === "Men");

    const grid = document.getElementById("productGrid");
    grid.innerHTML = "";

    menProducts.forEach(product => {
        const card = document.createElement("div");
        card.classList.add("product-card");

        card.innerHTML = `
            <img src="${product.image}" alt="${product.name}">
            <h3>${product.name}</h3>
            <p>£${product.price.toFixed(2)}</p>
            <button class="add-to-cart"
                data-id="${product.id}"
                data-name="${product.name}"
                data-price="${product.price}"
                data-image="${product.image}">
                Add to Basket
            </button>
        `;

        grid.appendChild(card);
    });

    attachCartButtons();
}

function attachCartButtons() {
    document.querySelectorAll(".add-to-cart").forEach(btn => {
        btn.addEventListener("click", async () => {
            const res = await fetch("/api/session");
            const session = await res.json();

            if (!session.loggedIn) {
                alert("Please log in to add items to your basket.");
                return;
            }

            const email = session.email;

            const product_id = btn.dataset.id;

            await fetch("/api/cart/add", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    email,
                    product_id,
                    quantity: 1
                })
            });

            alert("Added to basket!");
        });
    });
}

loadMenProducts();
