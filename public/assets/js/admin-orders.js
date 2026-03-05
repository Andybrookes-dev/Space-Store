// -----------------------------
// Load all orders
// -----------------------------
async function loadOrders() {
    try {
        const res = await fetch("/api/admin/orders");
        const orders = await res.json();

        const table = document.getElementById("ordersTable");
        table.innerHTML = "";

        if (!orders || orders.length === 0) {
            table.innerHTML = `
                <tr>
                    <td colspan="6" class="text-center text-light">No orders found.</td>
                </tr>
            `;
            return;
        }

        orders.forEach(order => {
            table.innerHTML += `
                <tr>
                    <td>${order.id}</td>
                    <td>${order.user_email}</td>
                    <td>£${order.total.toFixed(2)}</td>
                    <td>${new Date(order.created_at).toLocaleString()}</td>
                    <td>${order.status}</td>
                    <td>
                        <button class="btn btn-sm btn-info me-2" onclick="viewItems(${order.id})">
                            View Items
                        </button>
                        <button class="btn btn-sm btn-success" onclick="markFulfilled(${order.id})">
                            Mark Fulfilled
                        </button>
                    </td>
                </tr>
            `;
        });
    } catch (err) {
        console.error("Error loading orders:", err);
    }
}



// -----------------------------
// View items inside an order
// -----------------------------
async function viewItems(orderId) {
    try {
        const res = await fetch(`/api/admin/order/${orderId}/items`);
        const items = await res.json();

        const body = document.getElementById("itemsBody");
        body.innerHTML = "";

        if (!items || items.length === 0) {
            body.innerHTML = "<p>No items found for this order.</p>";
        } else {
            items.forEach(item => {
                body.innerHTML += `
                    <div class="tron-item-row">
                        <strong>${item.name}</strong><br>
                        Size: ${item.size}<br>
                        Quantity: ${item.quantity}<br>
                        Price: £${item.price.toFixed(2)}
                        <hr>
                    </div>
                `;
            });
        }

        // Open modal (Bootstrap 5)
        const modal = new bootstrap.Modal(document.getElementById("itemsModal"));
        modal.show();

    } catch (err) {
        console.error("Error loading order items:", err);
    }
}



// -----------------------------
// Mark order as fulfilled
// -----------------------------
async function markFulfilled(orderId) {
    try {
        const res = await fetch(`/api/admin/orders/fulfill/${orderId}`, {
            method: "PUT"
        });

        const data = await res.json();
        alert(data.message);

        loadOrders();
    } catch (err) {
        console.error("Error fulfilling order:", err);
    }
}



// -----------------------------
// Initial load
// -----------------------------
loadOrders();
