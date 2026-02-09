const express = require("express");
const bcrypt = require("bcrypt");
const sqlite3 = require("sqlite3").verbose();
const bodyParser = require("body-parser");
const cors = require("cors");
const path = require("path");

const app = express();
const db = new sqlite3.Database("./db.sqlite");

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname)));

// Create users table if not exists
db.run(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE,
    password TEXT
  )
`);

// Register
app.post("/api/register", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ message: "Missing fields" });

  try {
    const hash = await bcrypt.hash(password, 10);
    db.run(
      "INSERT INTO users (email, password) VALUES (?, ?)",
      [email, hash],
      function (err) {
        if (err) {
          return res.status(400).json({ message: "User already exists" });
        }
        res.json({ message: "Registered successfully" });
      }
    );
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

// Login
app.post("/api/login", (req, res) => {
  const { email, password } = req.body;
  db.get("SELECT * FROM users WHERE email = ?", [email], async (err, user) => {
    if (err || !user) return res.status(400).json({ message: "Invalid credentials" });

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(400).json({ message: "Invalid credentials" });

    res.json({ message: "Login successful", email: user.email });
  });
});


// Create categories table
db.run(`
  CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL
  )
`);

// Create products table
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

// Get all categories
app.get("/api/admin/categories", (req, res) => {
  db.all("SELECT * FROM categories", [], (err, rows) => {
    if (err) return res.status(500).json({ message: "Database error" });
    res.json(rows);
  });
});

// Add a new category
app.post("/api/admin/category", (req, res) => {
  const { name } = req.body;

  if (!name) return res.status(400).json({ message: "Category name required" });

  db.run(
    "INSERT INTO categories (name) VALUES (?)",
    [name],
    function (err) {
      if (err) return res.status(400).json({ message: "Category already exists" });
      res.json({ message: "Category added", id: this.lastID });
    }
  );
});

// Get all products with category names
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

// Add a new product
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

// Update product
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

// Soft delete product (set active = 0)
app.delete("/api/admin/product/:id", (req, res) => {
  const { id } = req.params;

  db.run(
    "UPDATE products SET active = 0 WHERE id = ?",
    [id],
    function (err) {
      if (err) return res.status(500).json({ message: "Database error" });
      res.json({ message: "Product deactivated" });
    }
  );
});










const PORT = 3000;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
