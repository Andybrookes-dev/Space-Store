require("dotenv").config();
const { Pool } = require("pg");
const bcrypt = require("bcrypt");

const isProduction = process.env.NODE_ENV === "production";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: isProduction ? { rejectUnauthorized: false } : false
});

async function seed() {
  try {
    console.log("🌱 Seeding local database...");

    // 1. Clear users table (optional)
    await pool.query("DELETE FROM users");

    // 2. Create admin user
    const passwordHash = await bcrypt.hash("galacticAdminlocal!", 10);


    await pool.query(
      `INSERT INTO users (firstname, lastname, email, password, isadmin)
       VALUES ($1, $2, $3, $4, $5)`,
      ["Local", "Admin", "admin@local.dev", passwordHash, 1]
    );

    console.log("✅ Superadmin created: admin@local.dev / galacticAdminlocal!");
    console.log("🌱 Seeding complete.");
    process.exit();
  } catch (err) {
    console.error("❌ Seeding failed:", err);
    process.exit(1);
  }
}

seed();
