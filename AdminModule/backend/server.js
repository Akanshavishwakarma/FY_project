console.log("SERVER FILE LOADED");
const express = require("express");
const cors = require("cors");
const db = require("./db");

const app = express();
app.use(cors());
app.use(express.json());

/* ================= EMPLOYEES ================= */

app.get("/employees", (req, res) => {
  db.query("SELECT * FROM employees", (err, result) => {
    if (err) return res.status(500).send(err);
    res.send(result);
  });
});

app.post("/employees", (req, res) => {
  const { name, empId, password } = req.body;

  db.query(
    "SELECT * FROM employees WHERE emp_id=? OR password=?",
    [empId, password],
    (err, result) => {
      if (err) return res.status(500).send("Database error");
      if (result.length > 0) {
        const existsId = result.some((r) => r.emp_id === empId);
        const existsPassword = result.some((r) => r.password === password);
        let msg = "Already exists: ";
        if (existsId && existsPassword) msg += "ID and Password";
        else if (existsId) msg += "ID";
        else if (existsPassword) msg += "Password";
        return res.status(400).send(msg);
      }

      db.query(
        "INSERT INTO employees (emp_name, emp_id, password) VALUES (?,?,?)",
        [name, empId, password],
        (err) => {
          if (err) return res.status(500).send("Database error");
          res.send("Employee added");
        }
      );
    }
  );
});

/* ================= CUSTOMERS ================= */

app.get("/customers", (req, res) => {
  db.query("SELECT * FROM customers", (err, result) => {
    if (err) return res.status(500).send(err);
    res.send(result);
  });
});

app.post("/customers", (req, res) => {
  const { name, custId, password } = req.body;

  // Check if ID or password already exists
  db.query(
    "SELECT * FROM customers WHERE cust_id=? OR password=?",
    [custId, password],
    (err, result) => {
      if (err) return res.status(500).send("Database error");
      if (result.length > 0) {
        const existsId = result.some((r) => r.cust_id === custId);
        const existsPassword = result.some((r) => r.password === password);
        let msg = "Already exists: ";
        if (existsId && existsPassword) msg += "ID and Password";
        else if (existsId) msg += "ID";
        else if (existsPassword) msg += "Password";
        return res.status(400).send(msg);
      }

      // If no duplicates, insert
      db.query(
        "INSERT INTO customers (cust_name, cust_id, password) VALUES (?,?,?)",
        [name, custId, password],
        (err) => {
          if (err) return res.status(500).send("Database error");
          res.send("Customer added");
        }
      );
    }
  );
});

/* ================= ASSIGN ================= */

app.post("/assign", (req, res) => {
  const { empId, customers } = req.body;

  db.query(
    "UPDATE employees SET assigned_customers=? WHERE emp_id=?",
    [customers.join(", "), empId],
    (err) => {
      if (err) return res.status(500).send(err);
      res.send("Assigned");
    }
  );
});

app.delete("/employees/:empId", (req, res) => {
  db.query(
    "DELETE FROM employees WHERE emp_id=?",
    [req.params.empId],
    (err) => {
      if (err) return res.status(500).send(err);
      res.send("Employee deleted");
    }
  );
});

app.delete("/customers/:custId", (req, res) => {
  const custId = req.params.custId;

  // 1️⃣ Get customer name
  db.query(
    "SELECT cust_name FROM customers WHERE cust_id=?",
    [custId],
    (err, result) => {
      if (err) return res.status(500).send("Database error");

      if (result.length === 0) {
        return res.status(404).send("Customer not found");
      }

      const custName = result[0].cust_name;

      // 2️⃣ Remove customer from employees.assigned_customers
      db.query(
        "SELECT emp_id, assigned_customers FROM employees",
        (err, employees) => {
          if (err) return res.status(500).send("Database error");

          employees.forEach((emp) => {
            if (emp.assigned_customers) {
              const updated = emp.assigned_customers
                .split(",")
                .map((c) => c.trim())
                .filter((c) => c !== custName)
                .join(", ");

              db.query(
                "UPDATE employees SET assigned_customers=? WHERE emp_id=?",
                [updated, emp.emp_id]
              );
            }
          });

          // 3️⃣ Finally delete customer
          db.query("DELETE FROM customers WHERE cust_id=?", [custId], (err) => {
            if (err) return res.status(500).send("Database error");
            res.send("Customer deleted and unassigned successfully");
          });
        }
      );
    }
  );
});

/* 🔐 ADMIN LOGIN */
app.post("/login", (req, res) => {
  console.log("LOGIN HIT:", req.body);
  const { username, password } = req.body;

  // ADMIN CHECK
  if (username === "admin2026" && password === "admin2026") {
    return res.json({ role: "admin" });
  }

  // EMPLOYEE CHECK
  const sql = "SELECT * FROM employees WHERE emp_name=? AND password=?";

  db.query(sql, [username, password], (err, result) => {
    if (err) return res.status(500).json({ role: "error" });

    if (result.length > 0) {
      return res.json({
        role: "user",
        name: result[0].emp_name,
      });
    } else {
      return res.json({ role: "invalid" });
    }
  });
});

/*==================NOT ASSIGN============*/
app.put("/unassign/:empId", (req, res) => {
  const empId = req.params.empId;

  db.query(
    "UPDATE employees SET assigned_customers=NULL WHERE emp_id=?",
    [empId],
    (err) => {
      if (err) return res.status(500).send("Database error");
      res.send("All customers unassigned successfully");
    }
  );
});

/* ================= SERVER ================= */

app.listen(3000, () => {
  console.log("Server running on port 3000");
});
