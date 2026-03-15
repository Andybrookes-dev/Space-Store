require("dotenv").config();

// =========================
// INITIAL SETUP
// =========================

const express = require("express");
const cloudinary = require('cloudinary').v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const bcrypt = require("bcrypt");
const { Pool } = require("pg");
const cors = require("cors");
const path = require("path");
const session = require("express-session");
const multer = require("multer");
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'products',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp']
  }
});

const upload = multer({ storage });

const app = express();

// PostgreSQL connection (Heroku)
const isProduction = process.env.NODE_ENV === "production";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: isProduction ? { rejectUnauthorized: false } : false
});


console.log("Using PostgreSQL via DATABASE_URL");


function requireAdmin(req, res, next) {
  if (
    !req.session.user ||
    !["superadmin", "admin"].includes(req.session.user.role)
  ) {
    return res.status(403).json({ message: "Not allowed" });
  }
  next();
}


app.post("/api/logout", (req, res) => {
  req.session.destroy(() => {
    res.clearCookie("connect.sid");
    res.json({ message: "Logged out" });
  });
});




// =========================
// MIDDLEWARE
// =========================

app.use(cors());
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use(
  session({
    secret: process.env.SESSION_SECRET || "dev-secret",
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
// DATABASE SCHEMA (Postgres)
// =========================

async function initDb() {
  // USERS
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      firstName TEXT,
      lastName TEXT,
      email TEXT UNIQUE,
      password TEXT,
      isAdmin INTEGER DEFAULT 0
    )
  `);

  // CATEGORIES
  await pool.query(`
    CREATE TABLE IF NOT EXISTS categories (
      id SERIAL PRIMARY KEY,
      name TEXT UNIQUE NOT NULL
    )
  `);

  // PRODUCTS
  await pool.query(`
    CREATE TABLE IF NOT EXISTS products (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      price REAL NOT NULL,
      description TEXT,
      image TEXT,
      category_id INTEGER,
      active INTEGER DEFAULT 1,
      display_order INTEGER DEFAULT 0,
      FOREIGN KEY (category_id) REFERENCES categories(id)
    )
  `);

  // PRODUCT VARIANTS
  await pool.query(`
    CREATE TABLE IF NOT EXISTS product_variants (
      id SERIAL PRIMARY KEY,
      product_id INTEGER NOT NULL,
      size TEXT NOT NULL,
      stock INTEGER DEFAULT 0,
      FOREIGN KEY (product_id) REFERENCES products(id)
    )
  `);

  // CARTS
  await pool.query(`
    CREATE TABLE IF NOT EXISTS carts (
      id SERIAL PRIMARY KEY,
      user_email TEXT NOT NULL
    )
  `);

  // CART ITEMS
  await pool.query(`
    CREATE TABLE IF NOT EXISTS cart_items (
      id SERIAL PRIMARY KEY,
      cart_id INTEGER NOT NULL,
      product_id INTEGER NOT NULL,
      variant_id INTEGER,
      quantity INTEGER NOT NULL DEFAULT 1,
      FOREIGN KEY (cart_id) REFERENCES carts(id),
      FOREIGN KEY (product_id) REFERENCES products(id),
      FOREIGN KEY (variant_id) REFERENCES product_variants(id)
    )
  `);

  // ORDERS
  await pool.query(`
    CREATE TABLE IF NOT EXISTS orders (
      id SERIAL PRIMARY KEY,
      user_email TEXT NOT NULL,
      total REAL NOT NULL,
      full_name TEXT,
      address_line1 TEXT,
      address_line2 TEXT,
      city TEXT,
      postcode TEXT,
      country TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      status TEXT DEFAULT 'Pending'
    )
  `);

  // ORDER ITEMS
  await pool.query(`
    CREATE TABLE IF NOT EXISTS order_items (
      id SERIAL PRIMARY KEY,
      order_id INTEGER NOT NULL,
      product_id INTEGER NOT NULL,
      variant_id INTEGER,
      quantity INTEGER NOT NULL,
      price REAL NOT NULL,
      FOREIGN KEY (order_id) REFERENCES orders(id),
      FOREIGN KEY (product_id) REFERENCES products(id),
      FOREIGN KEY (variant_id) REFERENCES product_variants(id)
    )
  `);

  console.log("Database schema ensured (CREATE TABLE IF NOT EXISTS).");
}


// =========================
// HELPERS
// =========================

async function getOrCreateCart(email) {
  const existingResult = await pool.query(
    "SELECT * FROM carts WHERE user_email = $1",
    [email]
  );
  const existing = existingResult.rows[0];

  if (existing) return existing;

  const insertResult = await pool.query(
    "INSERT INTO carts (user_email) VALUES ($1) RETURNING id, user_email",
    [email]
  );

  return insertResult.rows[0];
}


// =========================
// AUTH ROUTES
// =========================

app.post("/api/login", async (req, res) => {
  const { email, password } = req.body;

  try {
    const result = await pool.query(
      "SELECT * FROM users WHERE email = $1",
      [email]
    );
    const user = result.rows[0];

    if (!user) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    // Compare with password_hash (your real column)
    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    // Your DB uses full_name and role
    req.session.user = {
      id: user.id,
      fullName: user.full_name,
      email: user.email,
      role: user.role
    };

    res.json({
      message: "Login successful",
      fullName: user.full_name,
      role: user.role
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
      fullName: req.session.user.fullName,
      email: req.session.user.email,
      role: req.session.user.role
    });
  }
  res.json({ loggedIn: false });
});


// =========================
// CATEGORY ROUTES
// =========================

app.get("/api/admin/categories", requireAdmin, async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM categories");
    res.json(result.rows);
  } catch (err) {
    console.error("Admin categories error:", err);
    res.status(500).json({ message: "Database error" });
  }
});

app.get("/api/categories", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM categories");
    res.json(result.rows);
  } catch (err) {
    console.error("Categories error:", err);
    res.status(500).json({ message: "Database error" });
  }
});

app.post("/api/admin/category", requireAdmin, async (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ message: "Category name required" });

  try {
    const result = await pool.query(
      "INSERT INTO categories (name) VALUES ($1) RETURNING id",
      [name]
    );
    res.json({ message: "Category added", id: result.rows[0].id });
  } catch (err) {
    console.error("Add category error:", err);
    res.status(400).json({ message: "Category already exists" });
  }
});


// =========================
// PRODUCT ROUTES
// =========================

// Public: all products (ordered)
app.get("/api/products", async (req, res) => {
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
    const result = await pool.query(sql);
    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching products:", err);
    res.status(500).json({ error: "Database error" });
  }
});

// Admin: update product
app.put("/api/admin/product/:id", requireAdmin, upload.single("imageFile"), async (req, res) => {
  const productId = req.params.id;
  const { name, price, description, category_id, active } = req.body;

  try {
    let imageUrl;

    // If a new image was uploaded, use Cloudinary URL
    if (req.file) {
      imageUrl = req.file.path;
    } else {
      // Otherwise keep the existing image
      imageUrl = req.body.image;
    }

    await pool.query(
      `UPDATE products
       SET name = $1,
           price = $2,
           description = $3,
           image = $4,
           category_id = $5,
           active = $6
       WHERE id = $7`,
      [name, price, description, imageUrl, category_id, active, productId]
    );

    res.json({ message: "Product updated successfully" });

  } catch (err) {
    console.error("Update product error:", err);
    res.status(500).json({ message: "Failed to update product" });
  }
});


// Public: single product + variants
app.get("/api/products/:id", async (req, res) => {
  const productId = req.params.id;

  try {
    const productResult = await pool.query(
      "SELECT * FROM products WHERE id = $1",
      [productId]
    );
    const product = productResult.rows[0];

    if (!product) {
      return res.json({ error: "Product not found" });
    }

    const variantsResult = await pool.query(
      "SELECT * FROM product_variants WHERE product_id = $1",
      [productId]
    );

    product.variants = variantsResult.rows;
    res.json(product);
  } catch (err) {
    console.error("Single product error:", err);
    res.status(500).json({ error: "Database error" });
  }
});
app.get("/api/admin/product/:id/variants", requireAdmin, async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM product_variants WHERE product_id = $1 ORDER BY id ASC",
      [req.params.id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error("Admin get variants error:", err);
    res.status(500).json({ message: "Database error" });
  }
});

app.put("/api/admin/variant/:id", requireAdmin, async (req, res) => {
  const { stock } = req.body;

  try {
    await pool.query(
      "UPDATE product_variants SET stock = $1 WHERE id = $2",
      [stock, req.params.id]
    );
    res.json({ message: "Stock updated" });
  } catch (err) {
    console.error("Update variant error:", err);
    res.status(500).json({ message: "Database error" });
  }
});

app.post("/api/admin/product/:id/variant", requireAdmin, async (req, res) => {
  const { size, stock } = req.body;

  try {
    const result = await pool.query(
      "INSERT INTO product_variants (product_id, size, stock) VALUES ($1, $2, $3) RETURNING id",
      [req.params.id, size, stock ?? 0]
    );
    res.json({ message: "Variant added", id: result.rows[0].id });
  } catch (err) {
    console.error("Add variant error:", err);
    res.status(500).json({ message: "Database error" });
  }
});

app.delete("/api/admin/variant/:id", requireAdmin, async (req, res) => {
  try {
    await pool.query("DELETE FROM product_variants WHERE id = $1", [
      req.params.id,
    ]);
    res.json({ message: "Variant deleted" });
  } catch (err) {
    console.error("Delete variant error:", err);
    res.status(500).json({ message: "Database error" });
  }
});

// Admin: all products (unsorted)
app.get("/api/admin/products", requireAdmin, async (req, res) => {
  const query = `
    SELECT products.*, categories.name AS category
    FROM products
    LEFT JOIN categories ON products.category_id = categories.id
    ORDER BY products.id DESC
  `;

  try {
    const result = await pool.query(query);
    res.json(result.rows);
  } catch (err) {
    console.error("Admin products error:", err);
    res.status(500).json({ message: "Database error" });
  }
});

// Admin: reorder products (drag & drop)
app.put("/api/products/reorder", async (req, res) => {
  const { order } = req.body;

  if (!Array.isArray(order)) {
    return res.status(400).json({ success: false, message: "Invalid order format" });
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const stmt = "UPDATE products SET display_order = $1 WHERE id = $2";

    for (let index = 0; index < order.length; index++) {
      const productId = order[index];
      await client.query(stmt, [index, productId]);
    }

    await client.query("COMMIT");
    res.json({ success: true });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Reorder products error:", err);
    res.status(500).json({ success: false });
  } finally {
    client.release();
  }
});

// Admin: single product
app.get("/api/product/:id", async (req, res) => {
  const query = `
    SELECT products.*, categories.name AS category
    FROM products
    LEFT JOIN categories ON products.category_id = categories.id
    WHERE products.id = $1
  `;

  try {
    const result = await pool.query(query, [req.params.id]);
    res.json(result.rows[0] || null);
  } catch (err) {
    console.error("Admin single product error:", err);
    res.status(500).json({ message: "Database error" });
  }
});

// Admin: add product
app.post("/api/admin/product", requireAdmin, upload.single("imageFile"), async (req, res) => {
  const { name, price, description, category_id } = req.body;

  // Cloudinary gives us a full URL in req.file.path
  if (!req.file) {
  return res.status(400).json({ message: "Image upload required" });
  }

  const imageUrl = req.file.path;


  try {
    const rowResult = await pool.query(
      "SELECT MAX(display_order) AS maxOrder FROM products"
    );

    const maxOrder = rowResult.rows[0].maxorder;
    const nextOrder = (maxOrder ?? 0) + 1;

    const insertResult = await pool.query(
      `INSERT INTO products (name, price, description, image, category_id, display_order)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id`,
      [name, price, description, imageUrl, category_id, nextOrder]
    );
    const productId = insertResult.rows[0].id;

// Insert default sizes
const sizes = ["S", "M", "L", "XL"];

for (const size of sizes) {
  await pool.query(
    "INSERT INTO product_variants (product_id, size, stock) VALUES ($1, $2, $3)",
    [productId, size, 10] // default stock
  );
}


    res.json({ message: "Product added", id: insertResult.rows[0].id });
  } catch (err) {
    console.error("Add product error:", err);
    res.status(500).json({ message: "Database error" });
  }
});


// Admin: HARD DELETE
app.delete("/api/admin/product/:id", requireAdmin, async (req, res) => {
  const id = req.params.id;

  try {
    const rowResult = await pool.query(
      "SELECT image FROM products WHERE id = $1",
      [id]
    );
    const row = rowResult.rows[0];

    if (!row) {
      return res.status(404).json({ message: "Product not found" });
    }

    

    await pool.query("DELETE FROM products WHERE id = $1", [id]);

    

    res.json({ message: "Product deleted successfully" });
  } catch (err) {
    console.error("Delete product error:", err);
    res.status(500).json({ message: "Failed to delete product" });
  }
});


// =========================
// CART ROUTES
// =========================

app.get("/api/cart", async (req, res) => {
  const email = req.query.email;
  if (!email) return res.status(400).json({ message: "Email required" });

  try {
    const cart = await getOrCreateCart(email);

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
      WHERE cart_items.cart_id = $1
    `;

    const itemsResult = await pool.query(sql, [cart.id]);
    res.json(itemsResult.rows);
  } catch (err) {
    console.error("Get cart error:", err);
    res.status(500).json({ message: "Database error" });
  }
});

app.post("/api/cart/add", async (req, res) => {
  const { email, product_id, variant_id, quantity } = req.body;

  if (!email || !product_id) {
    return res.status(400).json({ message: "Missing fields" });
  }

  const qty = quantity || 1;

  try {
    const cart = await getOrCreateCart(email);

    const existingResult = await pool.query(
      "SELECT * FROM cart_items WHERE cart_id = $1 AND product_id = $2 AND variant_id = $3",
      [cart.id, product_id, variant_id]
    );
    const existing = existingResult.rows[0];

    if (existing) {
      await pool.query(
        "UPDATE cart_items SET quantity = quantity + $1 WHERE id = $2",
        [qty, existing.id]
      );

      return res.json({ message: "Cart updated" });
    } else {
      await pool.query(
        "INSERT INTO cart_items (cart_id, product_id, variant_id, quantity) VALUES ($1, $2, $3, $4)",
        [cart.id, product_id, variant_id, qty]
      );

      return res.json({ message: "Added to cart" });
    }
  } catch (err) {
    console.error("Add to cart error:", err);
    res.status(500).json({ message: "Database error" });
  }
});

app.put("/api/cart/update", async (req, res) => {
  const { item_id, quantity } = req.body;
  if (!item_id || quantity == null) {
    return res.status(400).json({ message: "Missing fields" });
  }

  try {
    await pool.query(
      "UPDATE cart_items SET quantity = $1 WHERE id = $2",
      [quantity, item_id]
    );

    res.json({ message: "Quantity updated" });
  } catch (err) {
    console.error("Update cart quantity error:", err);
    res.status(500).json({ message: "Database error" });
  }
});

app.delete("/api/cart/remove/:id", async (req, res) => {
  try {
    await pool.query(
      "DELETE FROM cart_items WHERE id = $1",
      [req.params.id]
    );

    res.json({ message: "Item removed" });
  } catch (err) {
    console.error("Remove cart item error:", err);
    res.status(500).json({ message: "Database error" });
  }
});

app.delete("/api/cart/clear", async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ message: "Email required" });

  try {
    const cart = await getOrCreateCart(email);

    await pool.query(
      "DELETE FROM cart_items WHERE cart_id = $1",
      [cart.id]
    );

    res.json({ message: "Cart cleared" });
  } catch (err) {
    console.error("Clear cart error:", err);
    res.status(500).json({ message: "Database error" });
  }
});


// =========================
// ORDER ROUTES
// =========================

app.post("/api/checkout", async (req, res) => {
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

  const client = await pool.connect();

  try {
    const cart = await getOrCreateCart(email);

    const itemsResult = await client.query(
      `SELECT 
         cart_items.id, 
         products.id AS product_id, 
         products.name,
         products.price, 
         cart_items.quantity,
         cart_items.variant_id
       FROM cart_items
       JOIN products ON cart_items.product_id = products.id
       WHERE cart_items.cart_id = $1`,
      [cart.id]
    );

    const items = itemsResult.rows;

    if (items.length === 0) {
      client.release();
      return res.status(400).json({ message: "Cart is empty" });
    }

    const total = items.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    );

    await client.query("BEGIN");

    const orderInfoResult = await client.query(
      `INSERT INTO orders 
         (user_email, total, full_name, address_line1, address_line2, city, postcode, country)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id`,
      [
        email,
        total,
        fullName,
        address_line1,
        address_line2,
        city,
        postcode,
        country
      ]
    );

    const orderId = orderInfoResult.rows[0].id;

    const insertItemSql = `
      INSERT INTO order_items 
        (order_id, product_id, variant_id, quantity, price)
      VALUES ($1, $2, $3, $4, $5)
    `;

    for (const item of items) {
      await client.query(insertItemSql, [
        orderId,
        item.product_id,
        item.variant_id,
        item.quantity,
        item.price
      ]);
    }

    await client.query(
      "DELETE FROM cart_items WHERE cart_id = $1",
      [cart.id]
    );

    await client.query("COMMIT");

    res.json({ message: "Order placed", orderId });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Checkout error:", err);
    res.status(500).json({ message: "Database error" });
  } finally {
    client.release();
  }
});

app.get("/api/orders", async (req, res) => {
  const email = req.query.email;
  if (!email) return res.status(400).json({ message: "Email required" });

  try {
    const result = await pool.query(
      "SELECT * FROM orders WHERE user_email = $1 ORDER BY created_at DESC",
      [email]
    );

    res.json(result.rows);
  } catch (err) {
    console.error("User orders error:", err);
    res.status(500).json({ message: "Database error" });
  }
});

app.get("/api/admin/orders", requireAdmin, async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM orders ORDER BY created_at DESC"
    );

    res.json(result.rows);
  } catch (err) {
    console.error("Admin orders error:", err);
    res.status(500).json({ message: "Database error" });
  }
});

app.put("/api/admin/orders/fulfill/:id", requireAdmin, async (req, res) => {
  const { id } = req.params;

  try {
    await pool.query(
      "UPDATE orders SET status = 'Fulfilled' WHERE id = $1",
      [id]
    );

    res.json({ message: "Order marked as fulfilled" });
  } catch (err) {
    console.error("Fulfill order error:", err);
    res.status(500).json({ message: "Database error" });
  }
});

app.get("/api/admin/order/:id/items", requireAdmin, async (req, res) => {
  const sql = `
    SELECT 
      order_items.*, 
      products.name,
      product_variants.size
    FROM order_items
    JOIN products ON order_items.product_id = products.id
    JOIN product_variants ON order_items.variant_id = product_variants.id
    WHERE order_items.order_id = $1
  `;

  try {
    const result = await pool.query(sql, [req.params.id]);
    res.json(result.rows);
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

initDb()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error("Failed to initialize database:", err);
    process.exit(1);
  });
