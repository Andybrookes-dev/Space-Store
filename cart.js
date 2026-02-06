// Load cart from localStorage or create empty array
let cart = JSON.parse(localStorage.getItem("cart")) || [];

// Add to cart
document.addEventListener("click", function(e) {
    if (e.target.classList.contains("add-to-cart")) {

        const product = {
            name: e.target.dataset.name,
            price: parseFloat(e.target.dataset.price),
            image: e.target.dataset.image,
            quantity: 1
        };

        // Check if item already exists
        const existing = cart.find(item => item.name === product.name);

        if (existing) {
            existing.quantity++;
        } else {
            cart.push(product);
        }

        // Save cart
        localStorage.setItem("cart", JSON.stringify(cart));

        alert(product.name + " added to basket!");
    }
});
