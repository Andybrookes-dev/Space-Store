async function getLoggedInUser() {
    const res = await fetch("/api/session");
    const data = await res.json();

    if (!data.loggedIn) {
        console.log("No user logged in. Cart disabled.");
        return null;
    }

    return data;
}

(async () => {
    const user = await getLoggedInUser();
    if (!user) return;

    const userEmail = user.email;

    // Continue with your cart logic here...
})();
