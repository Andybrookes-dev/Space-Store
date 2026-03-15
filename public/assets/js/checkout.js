document.addEventListener("DOMContentLoaded", () => {

    // Only run this script if checkout elements exist
    const summaryContainer = document.getElementById("orderSummary");
    const fullNameEl = document.getElementById("fullName");

    if (!summaryContainer || !fullNameEl) {
        // Not on checkout page → stop safely
        return;
    }

    let userEmail = null;

    const totalEl = document.getElementById("orderTotal");
    const addressEl = document.getElementById("address_line1");
    const address2El = document.getElementById("address_line2");
    const cityEl = document.getElementById("city");
    const postcodeEl = document.getElementById("postcode");
    const countryEl = document.getElementById("country");

    // -----------------------------
    // Load session → get email
    // -----------------------------
    async function loadSession() {
        const res = await fetch("/api/session");
        const session = await res.json();

        if (!session.loggedIn) {
            window.location.href = "login.html";
            return;
        }

        userEmail = session.email;
        loadSummary();
    }

    // -----------------------------
    // Load cart items for summary
    // -----------------------------
    async function loadSummary() {
        const res = await fetch(`/api/cart?email=${userEmail}`);
        const items = await res.json();

        summaryContainer.innerHTML = "";
        let total = 0;

        if (!items || items.length === 0) {
            summaryContainer.innerHTML = `<p class="text-light">Your basket is empty.</p>`;
            totalEl.textContent = "0.00";
            return;
        }

        items.forEach(item => {
            total += item.price * item.quantity;

            summaryContainer.innerHTML += `
                <div class="d-flex justify-content-between text-light mb-2">
                    <span>${item.name} (Size: ${item.size}) x${item.quantity}</span>
                    <span>£${(item.price * item.quantity).toFixed(2)}</span>
                </div>
            `;
        });

        totalEl.textContent = total.toFixed(2);
    }

    // -----------------------------
    // Place Order
    // -----------------------------
    async function placeOrder() {

    const fullName = fullNameEl.value.trim();
    const address = addressEl.value.trim();
    const address2 = address2El.value.trim();
    const city = cityEl.value.trim();
    const postcode = postcodeEl.value.trim();
    const country = countryEl.value.trim();

    if (!fullName || !address || !city || !postcode || !country) {
        alert("Please complete all delivery fields.");
        return;
    }

    const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            email: userEmail,
            fullName,
            address_line1: address,
            address_line2: address2,
            city,
            postcode,
            country
        })
    });

    const data = await res.json();

    if (res.ok) {
        localStorage.setItem("gt_last_order", data.orderId);
        window.location.href = "order-confirmation.html";
    } else {
        alert(data.message);
    }
}


    document.querySelector(".checkout-btn").addEventListener("click", placeOrder);

    loadSession();

});
