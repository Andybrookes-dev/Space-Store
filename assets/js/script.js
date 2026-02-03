const products = [
    { name: "Nebula Cloak", price: "120", tag: "Stealth" },
    { name: "Titan Armor", price: "250", tag: "Combat" },
    { name: "Zero-G Suit", price: "180", tag: "Mobility" },
];

function scrollToShop() {
    document.getElementById("shop").scrollIntoView({ behavior: "smooth" });
}

function renderProducts() {
    const shop = document.getElementById("shop");
    products.forEach((product) => {
        const card = document.createElement("div");
        card.className = "product-card";
        card.innerHTML = `
      <h3>${product.name}</h3>
      <p>Tag: ${product.tag}</p>
      <p>Price: $${product.price}</p>
      <button>Add to Cart</button>
    `;
        shop.appendChild(card);
    });
}

renderProducts();
