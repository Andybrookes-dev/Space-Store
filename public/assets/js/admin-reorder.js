document.addEventListener("DOMContentLoaded", () => {

    const womenList = document.getElementById("womenList");
    const menList = document.getElementById("menList");

    let currentOrder = [];

    async function loadProducts() {
        const res = await fetch("/api/products");
        const products = await res.json();

        products.sort((a, b) => {
            if (a.display_order === b.display_order) {
                return a.id - b.id;
            }
            return a.display_order - b.display_order;
        });

        renderLists(products);
    }

    function renderLists(products) {
        womenList.innerHTML = "";
        menList.innerHTML = "";

        products.forEach(p => {
            const li = document.createElement("li");
            li.className = "sortable-item";
            li.dataset.id = p.id;

            li.innerHTML = `
                <img src="${p.image}" class="preview-img">
                <span class="item-name">${p.name}</span>
            `;

            // FIXED CATEGORY LOGIC
            if (p.category_id === 2) {
                womenList.appendChild(li);
            } else if (p.category_id === 1) {
                menList.appendChild(li);
            }
        });

        new Sortable(womenList, {
            animation: 150,
            onEnd: updateOrderArray
        });

        new Sortable(menList, {
            animation: 150,
            onEnd: updateOrderArray
        });

        updateOrderArray();
    }

    function updateOrderArray() {
        const womenIds = [...womenList.children].map(item => parseInt(item.dataset.id));
        const menIds = [...menList.children].map(item => parseInt(item.dataset.id));

        currentOrder = [...womenIds, ...menIds];
    }

    window.saveOrder = async function () {
        const res = await fetch("/api/products/reorder", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ order: currentOrder })
        });

        const data = await res.json();

        if (data.success) {
            showToast("Order Saved!");
        } else {
            showToast("Failed to update order.");
        }
    };

    function showToast(msg) {
        const toast = document.getElementById("toast");
        toast.innerText = msg;
        toast.style.display = "block";
        setTimeout(() => toast.style.display = "none", 2000);
    }

    loadProducts();

});
