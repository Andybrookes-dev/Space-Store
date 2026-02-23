// Check session and update navbar
fetch("/api/session")
  .then(res => res.json())
  .then(data => {
    const navList = document.querySelector(".navbar-nav");

    // Remove old auth items
    document.querySelectorAll(".auth-item").forEach(el => el.remove());

    if (data.loggedIn) {
      // Greeting
      const greetingEl = document.getElementById("greeting");
      if (greetingEl) {
        greetingEl.textContent = `Hello, ${data.firstName}`;
      }

      // Logged-in navbar items
      navList.innerHTML += `
        <li class="nav-item auth-item">
          <a class="nav-link" id="logoutBtn" style="cursor:pointer;">Logout</a>
        </li>
      `;
    } else {
      // Logged-out navbar items
      navList.innerHTML += `
        <li class="nav-item auth-item">
          <a class="nav-link" href="login.html">Login</a>
        </li>
        <li class="nav-item auth-item">
          <a class="nav-link" href="register.html">Register</a>
        </li>
      `;
    }
  });

// Logout handler
document.addEventListener("click", (e) => {
  if (e.target.id === "logoutBtn") {
    fetch("/api/logout", { method: "POST" })
      .then(() => window.location.href = "index.html");
  }
});
