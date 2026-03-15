// -----------------------------
// Dynamic Navbar Builder
// -----------------------------
async function buildNavbar() {
  const res = await fetch("/api/session");
  const session = await res.json();

  const navList = document.querySelector(".navbar-nav");
  const greetingEl = document.getElementById("greeting");

  // If navbar doesn't exist on this page, stop safely
  if (!navList) return;

  navList.innerHTML = "";

  // Safe greeting update
  if (greetingEl && session.loggedIn) {
    greetingEl.textContent = `Hello, ${session.fullName.split(" ")[0]}`;
  }

  // -----------------------------
  // STATIC NAVIGATION LINKS
  // -----------------------------
  const staticLinks = [
    { name: "Home", href: "/index.html" },
    { name: "Men", href: "/men.html" },
    { name: "Women", href: "/women.html" }
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

    navList.innerHTML += `
      <li class="nav-item">
        <a class="nav-link tron-nav-link" href="/basket.html">Basket</a>
      </li>
    `;

    navList.innerHTML += `
      <li class="nav-item">
        <a class="nav-link tron-nav-link" href="/my-orders.html">My Orders</a>
      </li>
    `;

    if (["superadmin", "admin"].includes(session.role)) {
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
        <a class="nav-link tron-nav-link" href="/login.html">Login</a>
      </li>
      <li class="nav-item">
        <a class="nav-link tron-nav-link" href="/register.html">Register</a>
      </li>
    `;
  }
}


// -----------------------------
// Logout Handler
// -----------------------------
document.addEventListener("click", async (e) => {
  if (e.target.id === "logoutBtn") {
    await fetch("/api/logout", { method: "POST" });
    document.cookie = "connect.sid=; Max-Age=0; path=/;";
    window.location.href = "/login.html";
  }
});

// -----------------------------
// Search Handler
// -----------------------------
document.addEventListener("submit", (e) => {
  if (e.target.id === "searchForm") {
    e.preventDefault();

    const category = document.getElementById("searchCategory")?.value || "";
    const query = document.getElementById("searchInput")?.value.trim() || "";

    window.location.href = `search.html?category=${category}&q=${encodeURIComponent(query)}`;
  }
});

// Build navbar on page load
buildNavbar();
