require("dotenv").config();

const express = require("express");
const mysql = require("mysql2");
const cors = require("cors");
const path = require("path");

const app = express();

app.use(cors());
app.use(express.json());

// FRONTEND FILES
app.use(express.static(__dirname));

const PORT = process.env.PORT || 3000;

// MYSQL CONNECTION
const db = mysql.createConnection({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  ssl: {
    rejectUnauthorized: false,
  },
});

// CONNECT DATABASE
db.connect((err) => {
  if (err) {
    console.log("Database connection failed");
    console.log(err);
    return;
  }

  console.log("MySQL Connected");
});

// HOME PAGE
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "login.html"));
});

// REGISTER API
app.post("/api/register", (req, res) => {
  const { name, nic, password } = req.body;

  if (!nic || !password) {
    return res.status(400).json({
      success: false,
      message: "NIC and Password required",
    });
  }

  // CHECK USER EXISTS
  db.query(
    "SELECT * FROM users WHERE nic = ?",
    [nic],
    (checkErr, checkResult) => {
      if (checkErr) {
        return res.status(500).json({
          success: false,
          message: "Database error",
        });
      }

      if (checkResult.length > 0) {
        return res.status(400).json({
          success: false,
          message: "User already exists",
        });
      }

      // INSERT USER
      db.query(
        "INSERT INTO users (name, nic, password, balance, status) VALUES (?, ?, ?, ?, ?)",
        [name || "User", nic, password, 20, "Approved"],
        (err, result) => {
          if (err) {
            console.log(err);

            return res.status(500).json({
              success: false,
              message: "Register failed",
            });
          }

          res.json({
            success: true,
            message: "Register success",
          });
        }
      );
    }
  );
});

// LOGIN API
app.post("/api/login", (req, res) => {
  const { nic, password } = req.body;

  if (!nic || !password) {
    return res.status(400).json({
      success: false,
      message: "NIC and Password required",
    });
  }

  db.query(
    "SELECT * FROM users WHERE nic = ? AND password = ? LIMIT 1",
    [nic, password],
    (err, rows) => {
      if (err) {
        console.log(err);

        return res.status(500).json({
          success: false,
          message: "Login failed",
        });
      }

      if (rows.length === 0) {
        return res.status(401).json({
          success: false,
          message: "Wrong NIC or Password",
        });
      }

      res.json({
        success: true,
        message: "Login success",
        user: rows[0],
      });
    }
  );
});

// ROUND API
app.get("/api/round", (req, res) => {
  res.json({
    success: true,
    current: {
      round_no: 1,
      seconds_left: 30,
    },
    previous: [
      {
        round_no: 0,
        result_color: "Green",
      },
    ],
  });
});

// USER DATA API
app.get("/api/user/:id", (req, res) => {
  const id = req.params.id;

  db.query(
    "SELECT * FROM users WHERE id = ?",
    [id],
    (err, rows) => {
      if (err) {
        return res.status(500).json({
          success: false,
        });
      }

      if (rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      res.json({
        success: true,
        user: rows[0],
      });
    }
  );
});

// START SERVER
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
