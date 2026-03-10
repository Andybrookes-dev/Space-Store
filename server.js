// =========================
// INITIAL SETUP
// =========================

const express = require("express");
const bcrypt = require("bcrypt");
const Database = require("better-sqlite3");
const cors = require("cors");
const path = require("path");
const session = require("express-session");
const fs = require("fs");
const multer = require("multer");

const app = express();

// Use your SQLite file
const db = new Database("./db.sqlite");

// Log DB path for debugging
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

// Allow JSON + form submissions
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Sessions
app.use(
  session({
    secret: process.env.SESSION_SECRET || "dev-secret",
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false }
  })
);

// Disable caching for dynamic routes
app.use((req, res, next) => {
  res.setHeader("Cache-Control", "no-store");
  next();
});



// =========================
// DATABASE SCHEMA (better-sqlite3)
// =========================

// USERS
db.prepare(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    firstName TEXT,
    lastName TEXT,
    email TEXT UNIQUE,
    password TEXT,
    isAdmin INTEGER DEFAULT 0
  )
`).run();


// CATEGORIES
db.prepare(`
  CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL
  )
`).run();


// PRODUCTS
db.prepare(`
  CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    price REAL NOT NULL,
    description TEXT,
    image TEXT,
    category_id INTEGER,
    active INTEGER DEFAULT 1,
    display_order INTEGER DEFAULT 0,
    FOREIGN KEY (category_id) REFERENCES categories(id)
  )
`).run();


// PRODUCT VARIANTS (your Option A)
db.prepare(`
  CREATE TABLE IF NOT EXISTS product_variants (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER NOT NULL,
    size TEXT NOT NULL,
    stock INTEGER DEFAULT 0,
    FOREIGN KEY (product_id) REFERENCES products(id)
  )
`).run();


// CARTS
db.prepare(`
  CREATE TABLE IF NOT EXISTS carts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_email TEXT NOT NULL
  )
`).run();


// CART ITEMS
db.prepare(`
  CREATE TABLE IF NOT EXISTS cart_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    cart_id INTEGER NOT NULL,
    product_id INTEGER NOT NULL,
    variant_id INTEGER,
    quantity INTEGER NOT NULL DEFAULT 1,
    FOREIGN KEY (cart_id) REFERENCES carts(id),
    FOREIGN KEY (product_id) REFERENCES products(id),
    FOREIGN KEY (variant_id) REFERENCES product_variants(id)
  )
`).run();


// ORDERS (your Option A — full address fields)
db.prepare(`
  CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_email TEXT NOT NULL,
    total REAL NOT NULL,
    full_name TEXT,
    address_line1 TEXT,
    address_line2 TEXT,
    city TEXT,
    postcode TEXT,
    country TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    status TEXT DEFAULT 'Pending'
  )
`).run();


// ORDER ITEMS
db.prepare(`
  CREATE TABLE IF NOT EXISTS order_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id INTEGER NOT NULL,
    product_id INTEGER NOT NULL,
    variant_id INTEGER,
    quantity INTEGER NOT NULL,
    price REAL NOT NULL,
    FOREIGN KEY (order_id) REFERENCES orders(id),
    FOREIGN KEY (product_id) REFERENCES products(id),
    FOREIGN KEY (variant_id) REFERENCES product_variants(id)
  )
`).run();


// =========================
// HELPERS
// =========================

function getOrCreateCart(email) {
  const existing = db.prepare(
    "SELECT * FROM carts WHERE user_email = ?"
  ).get(email);

  if (existing) return existing;

  const info = db.prepare(
    "INSERT INTO carts (user_email) VALUES (?)"
  ).run(email);

  return {
    id: info.lastInsertRowid,
    user_email: email
  };
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

  try {
    db.prepare(
      `INSERT INTO users (firstName, lastName, email, password)
       VALUES (?, ?, ?, ?)`
    ).run(firstName, lastName, email, hashedPassword);

    res.json({ message: "Registration successful!" });
  } catch (err) {
    console.error("Registration error:", err);
    res.status(400).json({ message: "Registration failed." });
  }
});

app.post("/api/login", async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = db.prepare(
      "SELECT * FROM users WHERE email = ?"
    ).get(email);

    if (!user) {
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
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ message: "Server error" });
  }
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
  try {
    const rows = db.prepare("SELECT * FROM categories").all();
    res.json(rows);
  } catch (err) {
    console.error("Admin categories error:", err);
    res.status(500).json({ message: "Database error" });
  }
});

app.get("/api/categories", (req, res) => {
  try {
    const rows = db.prepare("SELECT * FROM categories").all();
    res.json(rows);
  } catch (err) {
    console.error("Categories error:", err);
    res.status(500).json({ message: "Database error" });
  }
});

app.post("/api/admin/category", (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ message: "Category name required" });

  try {
    const info = db.prepare(
      "INSERT INTO categories (name) VALUES (?)"
    ).run(name);

    res.json({ message: "Category added", id: info.lastInsertRowid });
  } catch (err) {
    console.error("Add category error:", err);
    res.status(400).json({ message: "Category already exists" });
  }
});


// =========================
// PRODUCT ROUTES
// =========================

// Public: all products (ordered)
app.get("/api/products", (req, res) => {
  const sql = `
    SELECT 
      products.id,
      products.name,
      products.price,
      products.description,
      products.image,
      products.category_id,
      categories.name AS category,
      products.active,
      products.display_order
    FROM products
    LEFT JOIN categories ON products.category_id = categories.id
    ORDER BY products.display_order ASC, products.id ASC
  `;

  try {
    const rows = db.prepare(sql).all();
    res.json(rows);
  } catch (err) {
    console.error("Error fetching products:", err);
    res.status(500).json({ error: "Database error" });
  }
});

// Public: single product + variants
app.get("/api/products/:id", (req, res) => {
  const productId = req.params.id;

  try {
    const product = db.prepare(
      "SELECT * FROM products WHERE id = ?"
    ).get(productId);

    if (!product) {
      return res.json({ error: "Product not found" });
    }

    const variants = db.prepare(
      "SELECT * FROM product_variants WHERE product_id = ?"
    ).all(productId);

    product.variants = variants;
    res.json(product);
  } catch (err) {
    console.error("Single product error:", err);
    res.status(500).json({ error: "Database error" });
  }
});

// Admin: all products (unsorted, newest first)
app.get("/api/admin/products", (req, res) => {
  const query = `
    SELECT products.*, categories.name AS category
    FROM products
    LEFT JOIN categories ON products.category_id = categories.id
    ORDER BY products.id DESC
  `;

  try {
    const rows = db.prepare(query).all();
    res.json(rows);
  } catch (err) {
    console.error("Admin products error:", err);
    res.status(500).json({ message: "Database error" });
  }
});

// Admin: reorder products (drag & drop)
app.put("/api/products/reorder", (req, res) => {
  const { order } = req.body;

  if (!Array.isArray(order)) {
    return res.status(400).json({ success: false, message: "Invalid order format" });
  }

  try {
    const stmt = db.prepare("UPDATE products SET display_order = ? WHERE id = ?");

    const transaction = db.transaction((ids) => {
      ids.forEach((productId, index) => {
        stmt.run(index, productId);
      });
    });

    transaction(order);

    res.json({ success: true });
  } catch (err) {
    console.error("Reorder products error:", err);
    res.status(500).json({ success: false });
  }
});

// Admin: single product
app.get("/api/product/:id", (req, res) => {
  const query = `
    SELECT products.*, categories.name AS category
    FROM products
    LEFT JOIN categories ON products.category_id = categories.id
    WHERE products.id = ?
  `;

  try {
    const row = db.prepare(query).get(req.params.id);
    res.json(row);
  } catch (err) {
    console.error("Admin single product error:", err);
    res.status(500).json({ message: "Database error" });
  }
});

// Admin: add product
app.post("/api/admin/product", upload.single("imageFile"), (req, res) => {
  const { name, price, description, category_id } = req.body;

  const image = req.file
    ? `assets/images/products/${req.file.filename}`
    : req.body.image;

  try {
    const row = db.prepare(
      "SELECT MAX(display_order) AS maxOrder FROM products"
    ).get();

    const nextOrder = (row?.maxOrder ?? 0) + 1;

    const info = db.prepare(
      `INSERT INTO products (name, price, description, image, category_id, display_order)
       VALUES (?, ?, ?, ?, ?, ?)`
    ).run(name, price, description, image, category_id, nextOrder);

    res.json({ message: "Product added", id: info.lastInsertRowid });
  } catch (err) {
    console.error("Add product error:", err);
    res.status(500).json({ message: "Database error" });
  }
});

// Admin: update product
app.put("/api/admin/product/:id", upload.single("imageFile"), (req, res) => {
  const { name, price, description, category_id, active } = req.body;

  const image = req.file
    ? `assets/images/products/${req.file.filename}`
    : req.body.image;

  try {
    db.prepare(
      `UPDATE products
       SET name = ?, price = ?, description = ?, image = ?, category_id = ?, active = ?
       WHERE id = ?`
    ).run(name, price, description, image, category_id, active, req.params.id);

    res.json({ message: "Product updated" });
  } catch (err) {
    console.error("Update product error:", err);
    res.status(500).json({ message: "Database error" });
  }
});

// Admin: HARD DELETE
app.delete("/api/admin/product/:id", (req, res) => {
  const id = req.params.id;

  try {
    const row = db.prepare(
      "SELECT image FROM products WHERE id = ?"
    ).get(id);

    if (!row) {
      return res.status(404).json({ message: "Product not found" });
    }

    const imagePath = row.image;

    db.prepare("DELETE FROM products WHERE id = ?").run(id);

    if (imagePath && fs.existsSync(imagePath)) {
      fs.unlink(imagePath, (err) => {
        if (err) console.log("Failed to delete image:", err);
      });
    }

    res.json({ message: "Product deleted successfully" });
  } catch (err) {
    console.error("Delete product error:", err);
    res.status(500).json({ message: "Failed to delete product" });
  }
});



// =========================
// CART ROUTES
// =========================

app.get("/api/cart", (req, res) => {
  const email = req.query.email;
  if (!email) return res.status(400).json({ message: "Email required" });

  try {
    const cart = getOrCreateCart(email);

    const sql = `
      SELECT 
        cart_items.id,
        products.id AS product_id,
        products.name,
        products.price,
        products.image,
        cart_items.quantity,
        product_variants.size
      FROM cart_items
      JOIN products ON cart_items.product_id = products.id
      JOIN product_variants ON cart_items.variant_id = product_variants.id
      WHERE cart_items.cart_id = ?
    `;

    const items = db.prepare(sql).all(cart.id);
    res.json(items);
  } catch (err) {
    console.error("Get cart error:", err);
    res.status(500).json({ message: "Database error" });
  }
});

app.post("/api/cart/add", (req, res) => {
  const { email, product_id, variant_id, quantity } = req.body;

  if (!email || !product_id) {
    return res.status(400).json({ message: "Missing fields" });
  }

  const qty = quantity || 1;

  try {
    const cart = getOrCreateCart(email);

    const existing = db.prepare(
      "SELECT * FROM cart_items WHERE cart_id = ? AND product_id = ? AND variant_id = ?"
    ).get(cart.id, product_id, variant_id);

    if (existing) {
      db.prepare(
        "UPDATE cart_items SET quantity = quantity + ? WHERE id = ?"
      ).run(qty, existing.id);

      return res.json({ message: "Cart updated" });
    } else {
      db.prepare(
        "INSERT INTO cart_items (cart_id, product_id, variant_id, quantity) VALUES (?, ?, ?, ?)"
      ).run(cart.id, product_id, variant_id, qty);

      return res.json({ message: "Added to cart" });
    }
  } catch (err) {
    console.error("Add to cart error:", err);
    res.status(500).json({ message: "Database error" });
  }
});

app.put("/api/cart/update", (req, res) => {
  const { item_id, quantity } = req.body;
  if (!item_id || quantity == null) {
    return res.status(400).json({ message: "Missing fields" });
  }

  try {
    db.prepare(
      "UPDATE cart_items SET quantity = ? WHERE id = ?"
    ).run(quantity, item_id);

    res.json({ message: "Quantity updated" });
  } catch (err) {
    console.error("Update cart quantity error:", err);
    res.status(500).json({ message: "Database error" });
  }
});

app.delete("/api/cart/remove/:id", (req, res) => {
  try {
    db.prepare(
      "DELETE FROM cart_items WHERE id = ?"
    ).run(req.params.id);

    res.json({ message: "Item removed" });
  } catch (err) {
    console.error("Remove cart item error:", err);
    res.status(500).json({ message: "Database error" });
  }
});

app.delete("/api/cart/clear", (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ message: "Email required" });

  try {
    const cart = getOrCreateCart(email);

    db.prepare(
      "DELETE FROM cart_items WHERE cart_id = ?"
    ).run(cart.id);

    res.json({ message: "Cart cleared" });
  } catch (err) {
    console.error("Clear cart error:", err);
    res.status(500).json({ message: "Database error" });
  }
});


// =========================
// ORDER ROUTES
// =========================

app.post("/api/checkout", (req, res) => {
  const {
    email,
    fullName,
    address_line1,
    address_line2,
    city,
    postcode,
    country
  } = req.body;

  if (!email) return res.status(400).json({ message: "Email required" });

  try {
    const cart = getOrCreateCart(email);

    const items = db.prepare(
      `SELECT 
         cart_items.id, 
         products.id AS product_id, 
         products.name,
         products.price, 
         cart_items.quantity,
         cart_items.variant_id
       FROM cart_items
       JOIN products ON cart_items.product_id = products.id
       WHERE cart_items.cart_id = ?`
    ).all(cart.id);

    if (items.length === 0) {
      return res.status(400).json({ message: "Cart is empty" });
    }

    const total = items.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    );

    const orderInfo = db.prepare(
      `INSERT INTO orders 
         (user_email, total, full_name, address_line1, address_line2, city, postcode, country)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      email,
      total,
      fullName,
      address_line1,
      address_line2,
      city,
      postcode,
      country
    );

    const orderId = orderInfo.lastInsertRowid;

    const insertItem = db.prepare(
      `INSERT INTO order_items 
         (order_id, product_id, variant_id, quantity, price)
       VALUES (?, ?, ?, ?, ?)`
    );

    const insertItemsTransaction = db.transaction((items) => {
      items.forEach((item) => {
        insertItem.run(
          orderId,
          item.product_id,
          item.variant_id,
          item.quantity,
          item.price
        );
      });
    });

    insertItemsTransaction(items);

    db.prepare(
      "DELETE FROM cart_items WHERE cart_id = ?"
    ).run(cart.id);

    res.json({ message: "Order placed", orderId });
  } catch (err) {
    console.error("Checkout error:", err);
    res.status(500).json({ message: "Database error" });
  }
});

app.get("/api/orders", (req, res) => {
  const email = req.query.email;
  if (!email) return res.status(400).json({ message: "Email required" });

  try {
    const rows = db.prepare(
      "SELECT * FROM orders WHERE user_email = ? ORDER BY created_at DESC"
    ).all(email);

    res.json(rows);
  } catch (err) {
    console.error("User orders error:", err);
    res.status(500).json({ message: "Database error" });
  }
});

app.get("/api/admin/orders", (req, res) => {
  try {
    const rows = db.prepare(
      "SELECT * FROM orders ORDER BY created_at DESC"
    ).all();

    res.json(rows);
  } catch (err) {
    console.error("Admin orders error:", err);
    res.status(500).json({ message: "Database error" });
  }
});

app.put("/api/admin/orders/fulfill/:id", (req, res) => {
  const { id } = req.params;

  try {
    db.prepare(
      "UPDATE orders SET status = 'Fulfilled' WHERE id = ?"
    ).run(id);

    res.json({ message: "Order marked as fulfilled" });
  } catch (err) {
    console.error("Fulfill order error:", err);
    res.status(500).json({ message: "Database error" });
  }
});

app.get("/api/admin/order/:id/items", (req, res) => {
  const sql = `
    SELECT 
      order_items.*, 
      products.name,
      product_variants.size
    FROM order_items
    JOIN products ON order_items.product_id = products.id
    JOIN product_variants ON order_items.variant_id = product_variants.id
    WHERE order_items.order_id = ?
  `;

  try {
    const rows = db.prepare(sql).all(req.params.id);
    res.json(rows);
  } catch (err) {
    console.error("Admin order items error:", err);
    res.status(500).json({ message: "Database error" });
  }
});


// =========================
// STATIC FILES (Frontend)
// =========================

app.use(express.static(path.join(__dirname, "public")));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});


// =========================
// START SERVER
// =========================

const PORT = process.env.PORT || 10000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
