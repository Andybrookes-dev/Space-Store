// -----------------------------
// Load My Orders Page
// -----------------------------
async function initMyOrders() {
    // 1. Check session
    const session = await fetch("/api/session").then(r => r.json());

    if (!session.loggedIn) {
        window.location.href = "login.html";
        return;
    }

    // 2. Load orders using session email
    const res = await fetch(`/api/orders?email=${session.email}`);
    const orders = await res.json();

    // 3. Render orders
    renderOrders(orders);
}

initMyOrders();


// -----------------------------
// Render Orders
// -----------------------------
function renderOrders(orders) {
    const container = document.getElementById("ordersContainer");
    container.innerHTML = "";

    if (orders.length === 0) {
        container.innerHTML = `<p class="text-light">You have no orders yet.</p>`;
        return;
    }

    orders.forEach(order => {
        container.innerHTML += `
            <div class="order-card tron-card mb-4">
                <h4>Order #${order.id}</h4>
                <p><strong>Total:</strong> £${order.total.toFixed(2)}</p>
                <p><strong>Status:</strong> ${order.status}</p>
                <p><strong>Date:</strong> ${new Date(order.created_at).toLocaleString()}</p>
            </div>
        `;
    });
}
