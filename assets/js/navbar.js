// -----------------------------
// Dynamic Navbar Builder
// -----------------------------
async function buildNavbar() {
  const res = await fetch("/api/session");
  const session = await res.json();

  const navList = document.querySelector(".navbar-nav");
  const greetingEl = document.getElementById("greeting");

  navList.innerHTML = "";

  // -----------------------------
  // STATIC NAVIGATION LINKS
  // -----------------------------
  const staticLinks = [
    { name: "Home", href: "index.html" },
    { name: "Men", href: "men.html" },
    { name: "Women", href: "women.html" },
    { name: "Basket", href: "basket.html" }
  ];

  staticLinks.forEach(link => {
    navList.innerHTML += `
      <li class="nav-item">
        <a class="nav-link" href="${link.href}">${link.name}</a>
      </li>
    `;
  });

  // -----------------------------
  // USER-SPECIFIC LINKS
  // -----------------------------
  if (session.loggedIn) {
    if (greetingEl) greetingEl.textContent = `Hello, ${session.firstName}`;

    navList.innerHTML += `
      <li class="nav-item">
        <a class="nav-link" href="orders.html">My Orders</a>
      </li>
    `;

    if (session.isAdmin) {
      navList.innerHTML += `
        <li class="nav-item">
          <a class="nav-link" href="admin.html">Admin Panel</a>
        </li>
      `;
    }

    navList.innerHTML += `
      <li class="nav-item">
        <a class="nav-link" id="logoutBtn" style="cursor:pointer;">Logout</a>
      </li>
    `;

  } else {
    navList.innerHTML += `
      <li class="nav-item">
        <a class="nav-link" href="login.html">Login</a>
      </li>
      <li class="nav-item">
        <a class="nav-link" href="register.html">Register</a>
      </li>
    `;
  }
}

// -----------------------------
// Logout Handler
// -----------------------------
document.addEventListener("click", (e) => {
  if (e.target.id === "logoutBtn") {
    fetch("/api/logout", { method: "POST" })
      .then(() => window.location.href = "index.html");
  }
});

// -----------------------------
// Search Handler
// -----------------------------
document.addEventListener("submit", (e) => {
  if (e.target.id === "searchForm") {
    e.preventDefault();

    const category = document.getElementById("searchCategory").value;
    const query = document.getElementById("searchInput").value.trim();

    // Redirect to search results page
    window.location.href = `search.html?category=${category}&q=${encodeURIComponent(query)}`;
  }
});

// Build navbar on page load
buildNavbar();
