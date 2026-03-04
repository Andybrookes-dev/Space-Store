document.addEventListener("DOMContentLoaded", () => {

    const orderId = localStorage.getItem("gt_last_order");

    const orderInfoEl = document.getElementById("orderInfo");
    const orderItemsEl = document.getElementById("orderItems");
    const orderTotalEl = document.getElementById("orderTotal");

    if (!orderId) {
        orderInfoEl.innerHTML = `<p class="text-light">No recent order found.</p>`;
        return;
    }

    loadOrder(orderId);

    // -----------------------------
    // Load Order + Items
    // -----------------------------
    async function loadOrder(id) {
        try {
            // Fetch order details
            const orderRes = await fetch(`/api/admin/order/${id}`);
            const order = await orderRes.json();

            // Fetch order items
            const itemsRes = await fetch(`/api/admin/order/${id}/items`);
            const items = await itemsRes.json();

            if (!order || order.error) {
                orderInfoEl.innerHTML = `<p class="text-light">Order not found.</p>`;
                return;
            }

            renderOrder(order, items);

        } catch (err) {
            console.error("Error loading order:", err);
            orderInfoEl.innerHTML = `<p class="text-light">Error loading order.</p>`;
        }
    }

    // -----------------------------
    // Render Order Details
    // -----------------------------
    function renderOrder(order, items) {

        orderInfoEl.innerHTML = `
            <h3 class="text-light">Order #${order.id}</h3>
            <p class="text-light">Placed on: ${new Date(order.created_at).toLocaleString()}</p>

            <h5 class="text-light mt-3">Delivery To:</h5>
            <p class="text-light">
                ${order.full_name}<br>
                ${order.address_line1}<br>
                ${order.address_line2 ? order.address_line2 + "<br>" : ""}
                ${order.city}<br>
                ${order.postcode}<br>
                ${order.country}
            </p>
        `;

        orderItemsEl.innerHTML = "";
        let total = 0;

        items.forEach(item => {
            const lineTotal = item.price * item.quantity;
            total += lineTotal;

            orderItemsEl.innerHTML += `
                <div class="d-flex justify-content-between text-light mb-2">
                    <span>${item.name} (Size: ${item.size}) x${item.quantity}</span>
                    <span>£${lineTotal.toFixed(2)}</span>
                </div>
            `;
        });

        orderTotalEl.textContent = total.toFixed(2);
    }

});
