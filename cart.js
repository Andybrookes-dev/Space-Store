// Ensure user is logged in before using the cart
const user = localStorage.getItem("gt_user");

// If no user, block cart usage (safety check)
if (!user) {
    console.warn("No user logged in. Cart disabled.");
}

// Load the user's cart or create a new one
let cart = JSON.parse(localStorage.getItem(`cart_${user}`)) || [];

// Save cart to localStorage
function saveCart() {
    if (user) {
        localStorage.setItem(`cart_${user}`, JSON.stringify(cart));
    }
}

// Add item to cart
function addToCart(name, price, image) {
    if (!user) {
        alert("Please log in to add items to your basket.");
        window.location.href = "login.html";
        return;
    }

    const existingItem = cart.find(item => item.name === name);

    if (existingItem) {
        existingItem.quantity += 1;
    } else {
        cart.push({
            name,
            price: parseFloat(price),
            image,
            quantity: 1
        });
    }

    saveCart();
    alert("Item added to basket!");
}

// Attach event listeners to all Add to Basket buttons
document.addEventListener("DOMContentLoaded", () => {
    const buttons = document.querySelectorAll(".add-to-cart");

    buttons.forEach(button => {
        button.addEventListener("click", () => {
            const name = button.dataset.name;
            const price = button.dataset.price;
            const image = button.dataset.image;

            addToCart(name, price, image);
        });
    });
});
