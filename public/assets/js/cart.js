document.addEventListener("DOMContentLoaded", () => {

    const cartItemsContainer = document.getElementById("cartItems");
    const cartTotalEl = document.getElementById("cartTotal");
    const checkoutBtn = document.getElementById("checkoutBtn");

    let userEmail = null;

    // -----------------------------
    // Load Session (for email)
    // -----------------------------
    async function loadSession() {
        const res = await fetch("/api/session");
        const session = await res.json();

        if (!session.loggedIn) {
            window.location.href = "login.html";
            return;
        }

        userEmail = session.email;
        loadCart();
    }

    // -----------------------------
    // Load Cart Items
    // -----------------------------
    async function loadCart() {
        const res = await fetch(`/api/cart?email=${userEmail}`);
        const items = await res.json();

        cartItemsContainer.innerHTML = "";

        if (items.length === 0) {
            cartItemsContainer.innerHTML = `
                <p class="text-light text-center mt-4">Your basket is empty.</p>
            `;
            cartTotalEl.textContent = "0.00";
            checkoutBtn.disabled = true;
            return;
        }

        checkoutBtn.disabled = false;

        let total = 0;

        items.forEach(item => {
            total += item.price * item.quantity;

            const div = document.createElement("div");
            div.className = "cart-item fade-in";

            div.innerHTML = `
                <img src="${item.image}" class="cart-item-img">

                <div class="cart-item-info">
                    <h5 class="text-light">${item.name}</h5>
                    <p class="text-light">£${item.price.toFixed(2)}</p>

                    <div class="quantity-controls">
                        <button class="qty-btn" data-id="${item.id}" data-action="minus">−</button>
                        <span class="qty-number">${item.quantity}</span>
                        <button class="qty-btn" data-id="${item.id}" data-action="plus">+</button>
                    </div>
                </div>

                <button class="remove-btn" data-remove="${item.id}">✕</button>
            `;

            cartItemsContainer.appendChild(div);
        });

        cartTotalEl.textContent = total.toFixed(2);

        attachQuantityListeners();
        attachRemoveListeners();
    }

    // -----------------------------
    // Quantity Buttons
    // -----------------------------
    function attachQuantityListeners() {
        document.querySelectorAll(".qty-btn").forEach(btn => {
            btn.addEventListener("click", async () => {
                const itemId = btn.dataset.id;
                const action = btn.dataset.action;

                const qtyEl = btn.parentElement.querySelector(".qty-number");
                let qty = parseInt(qtyEl.textContent);

                if (action === "plus") qty++;
                if (action === "minus" && qty > 1) qty--;

                qtyEl.textContent = qty;

                await fetch("/api/cart/update", {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ item_id: itemId, quantity: qty })
                });

                loadCart();
            });
        });
    }

    // -----------------------------
    // Remove Item
    // -----------------------------
    function attachRemoveListeners() {
        document.querySelectorAll("[data-remove]").forEach(btn => {
            btn.addEventListener("click", async () => {
                const itemId = btn.dataset.remove;

                await fetch(`/api/cart/remove/${itemId}`, {
                    method: "DELETE"
                });

                loadCart();
            });
        });
    }

    // -----------------------------
    // Checkout
    // -----------------------------
    checkoutBtn.addEventListener("click", async () => {
        const res = await fetch("/api/checkout", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: userEmail })
        });

        const data = await res.json();
        alert(data.message);

        if (res.ok) {
            window.location.href = "orders.html";
        }
    });

    // Start
    loadSession();

});
