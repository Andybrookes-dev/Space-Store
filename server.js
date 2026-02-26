// =========================
// INITIAL SETUP
// =========================

require("./init-db.js");

const express = require("express");
const bcrypt = require("bcrypt");
const sqlite3 = require("sqlite3").verbose();
const cors = require("cors");
const path = require("path");
const session = require("express-session");
const fs = require("fs");
const multer = require("multer");

const app = express();
const db = new sqlite3.Database("./db.sqlite");

console.log("DB path:", path.resolve("./db.sqlite"));

// =========================
// MULTER (FILE UPLOADS)
// =========================

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "assets/images/products/");
  },
  filename: (req, file, cb) => {
    const unique = Date.now() + "-" + file.originalname;
    cb(null, unique);
  }
});

const upload = multer({ storage });

// =========================
// MIDDLEWARE
// =========================

app.use(cors());

// IMPORTANT: allow FormData + normal forms
app.use(express.urlencoded({ extended: true }));
app.use(express.json());



app.use(
  session({
    secret: "supersecretkey123",
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false }
  })
);

app.use((req, res, next) => {
  res.setHeader("Cache-Control", "no-store");
  next();
});


// =========================
// DATABASE SCHEMA
// =========================

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

db.run(`
  CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL
  )
`);

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

db.run(`
  CREATE TABLE IF NOT EXISTS carts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_email TEXT NOT NULL
  )
`);

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

db.run(`
  CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_email TEXT NOT NULL,
    total REAL NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    status TEXT DEFAULT 'Pending'
  )
`);

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

app.post("/api/register", (req, res) => {
  const { firstName, lastName, email, password } = req.body;

  if (!firstName || !lastName || !email || !password) {
    return res.status(400).json({ message: "All fields are required." });
  }

  const hashedPassword = bcrypt.hashSync(password, 10);

  db.run(
    `INSERT INTO users (firstName, lastName, email, password)
     VALUES (?, ?, ?, ?)`,
    [firstName, lastName, email, hashedPassword],
    function (err) {
      if (err) return res.status(400).json({ message: "Registration failed." });
      res.json({ message: "Registration successful!" });
    }
  );
});

app.post("/api/login", (req, res) => {
  const { email, password } = req.body;

  db.get("SELECT * FROM users WHERE email = ?", [email], async (err, user) => {
    if (err || !user) return res.status(400).json({ message: "Invalid credentials" });

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(400).json({ message: "Invalid credentials" });

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

app.post("/api/logout", (req, res) => {
  req.session.destroy(() => res.json({ message: "Logged out" }));
});

// =========================
// CATEGORY ROUTES
// =========================

app.get("/api/admin/categories", (req, res) => {
  db.all("SELECT * FROM categories", [], (err, rows) => {
    if (err) return res.status(500).json({ message: "Database error" });
    res.json(rows);
  });
});

app.get("/api/categories", (req, res) => {
  db.all("SELECT * FROM categories", [], (err, rows) => {
    if (err) return res.status(500).json({ message: "Database error" });
    res.json(rows);
  });
});

app.post("/api/admin/category", (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ message: "Category name required" });

  db.run("INSERT INTO categories (name) VALUES (?)", [name], function (err) {
    if (err) return res.status(400).json({ message: "Category already exists" });
    res.json({ message: "Category added", id: this.lastID });
  });
});

// =========================
// PRODUCT ROUTES
// =========================

// Admin: all products
app.get("/api/products", (req, res) => {
  const category = req.query.category;

  let query = `
    SELECT products.*, categories.name AS category
    FROM products
    LEFT JOIN categories ON products.category_id = categories.id
    WHERE products.active = 1
  `;
  const params = [];

  if (category) {
    query += " AND LOWER(categories.name) = LOWER(?)";
    params.push(category);
  }

  db.all(query, params, (err, rows) => {
    if (err) return res.status(500).json({ message: "Database error" });
    res.json(rows);
  });
});


// Public: active products only
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

// Admin: single product
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
app.post("/api/admin/product", upload.single("imageFile"), (req, res) => {
  const { name, price, description, category_id } = req.body;

  const image = req.file
    ? `assets/images/products/${req.file.filename}`
    : req.body.image;

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
app.put("/api/admin/product/:id", upload.single("imageFile"), (req, res) => {
  const { name, price, description, category_id, active } = req.body;

  const image = req.file
    ? `assets/images/products/${req.file.filename}`
    : req.body.image;

  db.run(
    `UPDATE products
     SET name = ?, price = ?, description = ?, image = ?, category_id = ?, active = ?
     WHERE id = ?`,
    [name, price, description, image, category_id, active, req.params.id],
    function (err) {
      if (err) return res.status(500).json({ message: "Database error" });
      res.json({ message: "Product updated" });
    }
  );
});

// Admin: HARD DELETE (remove DB row + delete image)
app.delete("/api/admin/product/:id", (req, res) => {
  const id = req.params.id;

  db.get("SELECT image FROM products WHERE id = ?", [id], (err, row) => {
    if (err) return res.status(500).json({ message: "Database error" });
    if (!row) return res.status(404).json({ message: "Product not found" });

    const imagePath = row.image;

    db.run("DELETE FROM products WHERE id = ?", [id], function (err) {
      if (err) return res.status(500).json({ message: "Failed to delete product" });

      if (imagePath && fs.existsSync(imagePath)) {
        fs.unlink(imagePath, (err) => {
          if (err) console.log("Failed to delete image:", err);
        });
      }

      res.json({ message: "Product deleted successfully" });
    });
  });
});

// =========================
// CART ROUTES
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
// ORDER ROUTES
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
// SERVER START
// =========================
// SAFE static file serving (root frontend)

app.use(
  express.static(__dirname, {
    extensions: ["html"]
  })
);

const PORT = 3000;
app.listen(PORT, () =>
  console.log(`Server running on http://localhost:${PORT}`)
);
