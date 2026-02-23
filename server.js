require('./init-db.js');


const express = require("express");
const bcrypt = require("bcrypt");
const sqlite3 = require("sqlite3").verbose();
const bodyParser = require("body-parser");
const cors = require("cors");
const path = require("path");
const session = require("express-session");

const app = express();
const db = new sqlite3.Database("./db.sqlite");

console.log("DB path:", path.resolve("./db.sqlite"));

// =========================
// MIDDLEWARE
// =========================

app.use(cors());
app.use(bodyParser.json());

app.use(
  session({
    secret: "supersecretkey123",
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false } // secure: false for localhost
  })
);

app.use(express.static(path.join(__dirname)));

// =========================
// DB SCHEMA
// =========================

// Users (with firstName, lastName)
db.run(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    firstName TEXT,
    lastName TEXT,
    email TEXT UNIQUE,
    password TEXT,
    isAdmin INTEGER DEFAULT 0
  )
`);

// Categories
db.run(`
  CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL
  )
`);

// Products
db.run(`
  CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    price REAL NOT NULL,
    description TEXT,
    image TEXT,
    category_id INTEGER,
    active INTEGER DEFAULT 1,
    FOREIGN KEY (category_id) REFERENCES categories(id)
  )
`);

// Carts
db.run(`
  CREATE TABLE IF NOT EXISTS carts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_email TEXT NOT NULL
  )
`);

// Cart items
db.run(`
  CREATE TABLE IF NOT EXISTS cart_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    cart_id INTEGER NOT NULL,
    product_id INTEGER NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    FOREIGN KEY (cart_id) REFERENCES carts(id),
    FOREIGN KEY (product_id) REFERENCES products(id)
  )
`);

// Orders
db.run(`
  CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_email TEXT NOT NULL,
    total REAL NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    status TEXT DEFAULT 'Pending'
  )
`);

// Order items
db.run(`
  CREATE TABLE IF NOT EXISTS order_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id INTEGER NOT NULL,
    product_id INTEGER NOT NULL,
    quantity INTEGER NOT NULL,
    price REAL NOT NULL,
    FOREIGN KEY (order_id) REFERENCES orders(id),
    FOREIGN KEY (product_id) REFERENCES products(id)
  )
`);

// =========================
// HELPERS
// =========================

function getOrCreateCart(email, callback) {
  db.get("SELECT * FROM carts WHERE user_email = ?", [email], (err, cart) => {
    if (err) return callback(null, err);
    if (cart) return callback(cart, null);

    db.run("INSERT INTO carts (user_email) VALUES (?)", [email], function (err2) {
      if (err2) return callback(null, err2);
      callback({ id: this.lastID, user_email: email }, null);
    });
  });
}

// =========================
// AUTH ROUTES
// =========================

// Register
app.post("/api/register", (req, res) => {
  const { firstName, lastName, email, password } = req.body;

  if (!firstName || !lastName || !email || !password) {
    return res.status(400).json({ message: "All fields are required." });
  }

  const hashedPassword = bcrypt.hashSync(password, 10);

  const sql = `
    INSERT INTO users (firstName, lastName, email, password)
    VALUES (?, ?, ?, ?)
  `;

  db.run(sql, [firstName, lastName, email, hashedPassword], function (err) {
    if (err) {
      console.log("REGISTER ERROR:", err);
      return res.status(400).json({ message: "Registration failed." });
    }

    res.json({ message: "Registration successful!" });
  });
});

// Login
app.post("/api/login", (req, res) => {
  const { email, password } = req.body;

  db.get("SELECT * FROM users WHERE email = ?", [email], async (err, user) => {
    if (err || !user) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    req.session.user = {
      id: user.id,
      firstName: user.firstName,
      email: user.email,
      isAdmin: user.isAdmin
    };

    res.json({
      message: "Login successful",
      firstName: user.firstName,
      isAdmin: user.isAdmin
    });
  });
});

// Session info for navbar
app.get("/api/session", (req, res) => {
  if (req.session.user) {
    return res.json({
      loggedIn: true,
      firstName: req.session.user.firstName,
      email: req.session.user.email,
      isAdmin: req.session.user.isAdmin
    });
  }
  res.json({ loggedIn: false });
});

// Logout
app.post("/api/logout", (req, res) => {
  req.session.destroy(() => {
    res.json({ message: "Logged out" });
  });
});

// =========================
// CATEGORIES
// =========================

// Admin: get all categories
app.get("/api/admin/categories", (req, res) => {
  db.all("SELECT * FROM categories", [], (err, rows) => {
    if (err) return res.status(500).json({ message: "Database error" });
    res.json(rows);
  });
});

// Public: get all categories
app.get("/api/categories", (req, res) => {
  db.all("SELECT * FROM categories", [], (err, rows) => {
    if (err) return res.status(500).json({ message: "Database error" });
    res.json(rows);
  });
});

// Admin: add category
app.post("/api/admin/category", (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ message: "Category name required" });

  db.run("INSERT INTO categories (name) VALUES (?)", [name], function (err) {
    if (err) return res.status(400).json({ message: "Category already exists" });
    res.json({ message: "Category added", id: this.lastID });
  });
});

// =========================
// PRODUCTS
// =========================

// Admin: get ALL products (active + inactive)
app.get("/api/admin/products", (req, res) => {
  const query = `
    SELECT products.*, categories.name AS category
    FROM products
    LEFT JOIN categories ON products.category_id = categories.id
  `;
  db.all(query, [], (err, rows) => {
    if (err) return res.status(500).json({ message: "Database error" });
    res.json(rows);
  });
});

// Public: get ACTIVE products only
app.get("/api/products", (req, res) => {
  const query = `
    SELECT products.*, categories.name AS category
    FROM products
    LEFT JOIN categories ON products.category_id = categories.id
    WHERE products.active = 1
  `;
  db.all(query, [], (err, rows) => {
    if (err) return res.status(500).json({ message: "Database error" });
    res.json(rows);
  });
});

// Admin: get single product by ID
app.get("/api/product/:id", (req, res) => {
  const query = `
    SELECT products.*, categories.name AS category
    FROM products
    LEFT JOIN categories ON products.category_id = categories.id
    WHERE products.id = ?
  `;
  db.get(query, [req.params.id], (err, row) => {
    if (err) return res.status(500).json({ message: "Database error" });
    res.json(row);
  });
});

// Admin: add product
app.post("/api/admin/product", (req, res) => {
  const { name, price, description, image, category_id } = req.body;

  if (!name || !price || !category_id) {
    return res.status(400).json({ message: "Missing required fields" });
  }

  db.run(
    `INSERT INTO products (name, price, description, image, category_id)
     VALUES (?, ?, ?, ?, ?)`,
    [name, price, description, image, category_id],
    function (err) {
      if (err) return res.status(500).json({ message: "Database error" });
      res.json({ message: "Product added", id: this.lastID });
    }
  );
});

// Admin: update product
app.put("/api/admin/product/:id", (req, res) => {
  const { id } = req.params;
  const { name, price, description, image, category_id, active } = req.body;

  db.run(
    `UPDATE products
     SET name = ?, price = ?, description = ?, image = ?, category_id = ?, active = ?
     WHERE id = ?`,
    [name, price, description, image, category_id, active, id],
    function (err) {
      if (err) return res.status(500).json({ message: "Database error" });
      res.json({ message: "Product updated" });
    }
  );
});

// Admin: soft delete (deactivate)
app.delete("/api/admin/product/:id", (req, res) => {
  const { id } = req.params;

  db.run("UPDATE products SET active = 0 WHERE id = ?", [id], function (err) {
    if (err) return res.status(500).json({ message: "Database error" });
    res.json({ message: "Product deactivated" });
  });
});



// =========================
// CART
// =========================

app.get("/api/cart", (req, res) => {
  const email = req.query.email;
  if (!email) return res.status(400).json({ message: "Email required" });

  getOrCreateCart(email, (cart, err) => {
    if (err) return res.status(500).json({ message: "Database error" });

    db.all(
      `SELECT cart_items.id, products.id AS product_id, products.name, products.price, products.image, cart_items.quantity
       FROM cart_items
       JOIN products ON cart_items.product_id = products.id
       WHERE cart_items.cart_id = ?`,
      [cart.id],
      (err2, items) => {
        if (err2) return res.status(500).json({ message: "Database error" });
        res.json(items);
      }
    );
  });
});

app.post("/api/cart/add", (req, res) => {
  const { email, product_id, quantity } = req.body;
  if (!email || !product_id) return res.status(400).json({ message: "Missing fields" });

  const qty = quantity || 1;

  getOrCreateCart(email, (cart, err) => {
    if (err) return res.status(500).json({ message: "Database error" });

    db.get(
      "SELECT * FROM cart_items WHERE cart_id = ? AND product_id = ?",
      [cart.id, product_id],
      (err2, item) => {
        if (err2) return res.status(500).json({ message: "Database error" });

        if (item) {
          db.run(
            "UPDATE cart_items SET quantity = quantity + ? WHERE id = ?",
            [qty, item.id],
            function (err3) {
              if (err3) return res.status(500).json({ message: "Database error" });
              res.json({ message: "Cart updated" });
            }
          );
        } else {
          db.run(
            "INSERT INTO cart_items (cart_id, product_id, quantity) VALUES (?, ?, ?)",
            [cart.id, product_id, qty],
            function (err3) {
              if (err3) return res.status(500).json({ message: "Database error" });
              res.json({ message: "Added to cart" });
            }
          );
        }
      }
    );
  });
});

app.put("/api/cart/update", (req, res) => {
  const { item_id, quantity } = req.body;
  if (!item_id || quantity == null) {
    return res.status(400).json({ message: "Missing fields" });
  }

  db.run(
    "UPDATE cart_items SET quantity = ? WHERE id = ?",
    [quantity, item_id],
    function (err) {
      if (err) return res.status(500).json({ message: "Database error" });
      res.json({ message: "Quantity updated" });
    }
  );
});

app.delete("/api/cart/remove/:id", (req, res) => {
  db.run("DELETE FROM cart_items WHERE id = ?", [req.params.id], function (err) {
    if (err) return res.status(500).json({ message: "Database error" });
    res.json({ message: "Item removed" });
  });
});

app.delete("/api/cart/clear", (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ message: "Email required" });

  getOrCreateCart(email, (cart, err) => {
    if (err) return res.status(500).json({ message: "Database error" });

    db.run("DELETE FROM cart_items WHERE cart_id = ?", [cart.id], function (err2) {
      if (err2) return res.status(500).json({ message: "Database error" });
      res.json({ message: "Cart cleared" });
    });
  });
});

// =========================
// CHECKOUT / ORDERS
// =========================

app.post("/api/checkout", (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ message: "Email required" });

  getOrCreateCart(email, (cart, err) => {
    if (err) return res.status(500).json({ message: "Database error" });

    db.all(
      `SELECT cart_items.id, products.id AS product_id, products.price, cart_items.quantity
       FROM cart_items
       JOIN products ON cart_items.product_id = products.id
       WHERE cart_items.cart_id = ?`,
      [cart.id],
      (err2, items) => {
        if (err2) return res.status(500).json({ message: "Database error" });
        if (items.length === 0) {
          return res.status(400).json({ message: "Cart is empty" });
        }

        const total = items.reduce(
          (sum, item) => sum + item.price * item.quantity,
          0
        );

        db.run(
          "INSERT INTO orders (user_email, total) VALUES (?, ?)",
          [email, total],
          function (err3) {
            if (err3) return res.status(500).json({ message: "Database error" });

            const orderId = this.lastID;

            const stmt = db.prepare(
              "INSERT INTO order_items (order_id, product_id, quantity, price) VALUES (?, ?, ?, ?)"
            );

            items.forEach((item) => {
              stmt.run(orderId, item.product_id, item.quantity, item.price);
            });

            stmt.finalize(() => {
              db.run(
                "DELETE FROM cart_items WHERE cart_id = ?",
                [cart.id],
                () => {
                  res.json({ message: "Order placed", orderId });
                }
              );
            });
          }
        );
      }
    );
  });
});

app.get("/api/orders", (req, res) => {
  const email = req.query.email;
  if (!email) return res.status(400).json({ message: "Email required" });

  db.all(
    "SELECT * FROM orders WHERE user_email = ? ORDER BY created_at DESC",
    [email],
    (err, rows) => {
      if (err) return res.status(500).json({ message: "Database error" });
      res.json(rows);
    }
  );
});

app.get("/api/admin/orders", (req, res) => {
  db.all("SELECT * FROM orders ORDER BY created_at DESC", [], (err, rows) => {
    if (err) return res.status(500).json({ message: "Database error" });
    res.json(rows);
  });
});

app.put("/api/admin/orders/fulfill/:id", (req, res) => {
  const { id } = req.params;

  db.run(
    "UPDATE orders SET status = 'Fulfilled' WHERE id = ?",
    [id],
    function (err) {
      if (err) return res.status(500).json({ message: "Database error" });
      res.json({ message: "Order marked as fulfilled" });
    }
  );
});

// =========================
// SERVER
// =========================

const PORT = 3000;
app.listen(PORT, () =>
  console.log(`Server running on http://localhost:${PORT}`)
);
