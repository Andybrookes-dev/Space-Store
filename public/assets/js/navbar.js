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
    { name: "Women", href: "women.html" }
  ];

  staticLinks.forEach(link => {
    navList.innerHTML += `
      <li class="nav-item">
        <a class="nav-link tron-nav-link" href="${link.href}">${link.name}</a>
      </li>
    `;
  });

  // -----------------------------
  // USER-SPECIFIC LINKS
  // -----------------------------
  if (session.loggedIn) {
    if (greetingEl) greetingEl.textContent = `Hello, ${session.fullName.split(" ")[0]}`;


    // ⭐ Basket only when logged in
    navList.innerHTML += `
      <li class="nav-item">
        <a class="nav-link tron-nav-link" href="basket.html">Basket</a>
      </li>
    `;

    navList.innerHTML += `
      <li class="nav-item">
        <a class="nav-link tron-nav-link" href="my-orders.html">My Orders</a>
      </li>
    `;

    if (["superadmin", "admin"].includes(session.role))
   {
      navList.innerHTML += `
        <li class="nav-item">
          <a class="nav-link tron-nav-link" href="/admin/admin.html">Admin Panel</a>
        </li>
      `;
    }

    navList.innerHTML += `
      <li class="nav-item">
        <a class="nav-link tron-nav-link" id="logoutBtn" style="cursor:pointer;">Logout</a>
      </li>
    `;

  } else {
    navList.innerHTML += `
      <li class="nav-item">
        <a class="nav-link tron-nav-link" href="login.html">Login</a>
      </li>
      <li class="nav-item">
        <a class="nav-link tron-nav-link" href="register.html">Register</a>
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
