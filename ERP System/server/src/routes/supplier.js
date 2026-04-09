

const express = require("express");
const router = express.Router();
const pool = require("../db"); // ensure db.js exports a mysql2 pool
const authenticateToken = require("./authMiddleware");


// Get all suppliers
router.get("/list",authenticateToken, async (req, res) => {
  try {
    const [suppliers] = await pool.query("SELECT * FROM suppliers");

    // Fetch brands per supplier
    for (let supplier of suppliers) {
      const [brands] = await pool.query(
        `SELECT b.brand_name 
         FROM brands b
         JOIN supplier_brands sb ON b.brand_id = sb.brand_id
         WHERE sb.supplier_id = ?`,
        [supplier.supplier_id]
      );
      supplier.brands = brands.map((b) => b.brand_name);

      // Fetch lorries per supplier
      const [lorries] = await pool.query(
        `SELECT l.lorry_name, l.lorry_no
         FROM lorries l
         JOIN supplier_lorries sl ON l.lorry_id = sl.lorry_id
         WHERE sl.supplier_id = ?`,
        [supplier.supplier_id]
      );
      supplier.lorries = lorries;
    }

    res.json(suppliers);
  } catch (err) {
    console.error("Error fetching suppliers:", err);
    res.status(500).json({ error: "Failed to fetch suppliers" });
  }
});


/*router.get("/list", authenticateToken, async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT * FROM suppliers");
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});*/



// Add supplier (with brands + lorries)
router.post("/add", async (req, res) => {
  const { name, contact_person, phone, email, brands = [], lorries = [] } = req.body;

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // Insert supplier
    const [result] = await connection.query(
      "INSERT INTO suppliers (name, contact_person, phone, email) VALUES (?, ?, ?, ?)",
      [name, contact_person, phone, email]
    );

    const supplierId = result.insertId;

    // Handle brands
    for (let brandName of brands) {
      // Check if brand exists
      let [rows] = await connection.query("SELECT brand_id FROM brands WHERE brand_name = ?", [brandName]);
      let brandId;

      if (rows.length > 0) {
        brandId = rows[0].brand_id;
      } else {
        const [insertResult] = await connection.query(
          "INSERT INTO brands (brand_name) VALUES (?)",
          [brandName]
        );
        brandId = insertResult.insertId;
      }

      // Link supplier and brand
      await connection.query(
        "INSERT INTO supplier_brands (supplier_id, brand_id) VALUES (?, ?)",
        [supplierId, brandId]
      );
    }

    // Handle lorries
    for (let lorry of lorries) {
      const { lorry_name, lorry_no } = lorry;

      // Check if lorry exists
      let [rows] = await connection.query(
        "SELECT lorry_id FROM lorries WHERE lorry_no = ?",
        [lorry_no]
      );
      let lorryId;

      if (rows.length > 0) {
        lorryId = rows[0].lorry_id;
      } else {
        const [insertResult] = await connection.query(
          "INSERT INTO lorries (lorry_name, lorry_no) VALUES (?, ?)",
          [lorry_name, lorry_no]
        );
        lorryId = insertResult.insertId;
      }

      // Link supplier and lorry
      await connection.query(
        "INSERT INTO supplier_lorries (supplier_id, lorry_id) VALUES (?, ?)",
        [supplierId, lorryId]
      );
    }

    await connection.commit();
    res.json({ success: true, supplier_id: supplierId });
  } catch (err) {
    await connection.rollback();
    console.error("Error adding supplier:", err);
    res.status(500).json({ error: "Failed to add supplier" });
  } finally {
    connection.release();
  }
});

// Update supplier
router.put("/update/:id", async (req, res) => {
  const supplierId = req.params.id;
  const { name, contact_person, phone, email, brands = [], lorries = [] } = req.body;

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    await connection.query(
      "UPDATE suppliers SET name=?, contact_person=?, phone=?, email=? WHERE supplier_id=?",
      [name, contact_person, phone, email, supplierId]
    );

    // Update brands (remove old + add new)
    await connection.query("DELETE FROM supplier_brands WHERE supplier_id=?", [supplierId]);
    for (let brandName of brands) {
      let [rows] = await connection.query("SELECT brand_id FROM brands WHERE brand_name = ?", [brandName]);
      let brandId;

      if (rows.length > 0) {
        brandId = rows[0].brand_id;
      } else {
        const [insertResult] = await connection.query(
          "INSERT INTO brands (brand_name) VALUES (?)",
          [brandName]
        );
        brandId = insertResult.insertId;
      }

      await connection.query(
        "INSERT INTO supplier_brands (supplier_id, brand_id) VALUES (?, ?)",
        [supplierId, brandId]
      );
    }

    // Update lorries (remove old + add new)
    await connection.query("DELETE FROM supplier_lorries WHERE supplier_id=?", [supplierId]);
    for (let lorry of lorries) {
      const { lorry_name, lorry_no } = lorry;

      let [rows] = await connection.query(
        "SELECT lorry_id FROM lorries WHERE lorry_no = ?",
        [lorry_no]
      );
      let lorryId;

      if (rows.length > 0) {
        lorryId = rows[0].lorry_id;
      } else {
        const [insertResult] = await connection.query(
          "INSERT INTO lorries (lorry_name, lorry_no) VALUES (?, ?)",
          [lorry_name, lorry_no]
        );
        lorryId = insertResult.insertId;
      }

      await connection.query(
        "INSERT INTO supplier_lorries (supplier_id, lorry_id) VALUES (?, ?)",
        [supplierId, lorryId]
      );
    }

    await connection.commit();
    res.json({ success: true });
  } catch (err) {
    await connection.rollback();
    console.error("Error updating supplier:", err);
    res.status(500).json({ error: "Failed to update supplier" });
  } finally {
    connection.release();
  }
});

// Delete supplier
router.delete("/delete/:id", async (req, res) => {
  const supplierId = req.params.id;

  try {
    await pool.query("DELETE FROM suppliers WHERE supplier_id=?", [supplierId]);
    res.json({ success: true });
  } catch (err) {
    console.error("Error deleting supplier:", err);
    res.status(500).json({ error: "Failed to delete supplier" });
  }
});

module.exports = router;
