require("dotenv").config();

const express = require("express");
const mysql = require("mysql2");
const cors = require("cors");
const path = require("path");
const multer = require("multer");

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(express.static(__dirname));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

const upload = multer({
  dest: "uploads/"
});

const PORT = process.env.PORT || 3000;

const db = mysql.createConnection({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  ssl: { rejectUnauthorized: false }
});

db.connect((err) => {
  if (err) {
    console.log("Database connection failed");
    console.log(err);
    return;
  }
  console.log("MySQL Connected");
});

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "login.html"));
});

// REGISTER API - supports FormData and NIC photo
app.post("/api/register", upload.single("nic_photo"), (req, res) => {
  const { name, birthday, nic, password, referred_by } = req.body;

  if (!name || !nic || !password) {
    return res.status(400).json({
      success: false,
      message: "Name, NIC and Password required"
    });
  }

  const referral_code = "CR" + Math.floor(100000 + Math.random() * 900000);
  const nic_photo = req.file ? req.file.filename : null;

  db.query("SELECT id FROM users WHERE nic = ?", [nic], (err, rows) => {
    if (err) {
      console.log(err);
      return res.status(500).json({
        success: false,
        message: "Database error"
      });
    }

    if (rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: "User already exists"
      });
    }

    db.query(
      `INSERT INTO users 
      (name, birthday, nic, password, referred_by, referral_code, nic_photo, balance, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, 20, 'Approved')`,
      [
        name,
        birthday || null,
        nic,
        password,
        referred_by || null,
        referral_code,
        nic_photo
      ],
      (err2) => {
        if (err2) {
          console.log(err2);
          return res.status(500).json({
            success: false,
            message: "Register failed: " + err2.message
          });
        }

        res.json({
          success: true,
          message: "Register success",
          referral_code
        });
      }
    );
  });
});

// LOGIN API
app.post("/api/login", (req, res) => {
  const { nic, password } = req.body;

  if (!nic || !password) {
    return res.status(400).json({
      success: false,
      message: "NIC and Password required"
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
          message: "Login failed"
        });
      }

      if (rows.length === 0) {
        return res.status(401).json({
          success: false,
          message: "Wrong NIC or Password"
        });
      }

      res.json({
        success: true,
        message: "Login success",
        user: rows[0]
      });
    }
  );
});

// USER DATA API
app.get("/api/user/:id", (req, res) => {
  db.query(
    "SELECT * FROM users WHERE id = ?",
    [req.params.id],
    (err, rows) => {
      if (err) {
        return res.status(500).json({ success: false });
      }

      if (rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: "User not found"
        });
      }

      res.json(rows[0]);
    }
  );
});

// ROUND API
app.get("/api/round", (req, res) => {
  db.query(
    "SELECT * FROM rounds ORDER BY id DESC LIMIT 1",
    (err, rows) => {
      if (err || rows.length === 0) {
        return res.json({
          success: true,
          current: {
            round_no: 1,
            seconds_left: 30
          },
          previous: []
        });
      }

      db.query(
        "SELECT * FROM rounds ORDER BY id DESC LIMIT 10",
        (err2, prev) => {
          res.json({
            success: true,
            current: {
              round_no: rows[0].round_no,
              seconds_left: 30
            },
            previous: prev || []
          });
        }
      );
    }
  );
});

// SETTINGS API
app.get("/api/settings", (req, res) => {
  db.query("SELECT * FROM settings", (err, rows) => {
    if (err) return res.json({ deposit_binance_id: "Not set" });

    const data = {};
    rows.forEach(r => {
      data[r.setting_key] = r.setting_value;
    });

    res.json({
      deposit_binance_id: data.deposit_binance_id || "Not set"
    });
  });
});

// BET API
app.post("/api/bet", (req, res) => {
  const { user_id, color, amount } = req.body;

  if (!user_id || !color || !amount) {
    return res.status(400).json({ message: "Missing bet details" });
  }

  db.query(
    "INSERT INTO bets (user_id, round_no, color, amount, status, payout) VALUES (?, 1, ?, ?, 'Pending', 0)",
    [user_id, color, amount],
    (err) => {
      if (err) {
        console.log(err);
        return res.status(500).json({ message: "Bet failed" });
      }

      res.json({ message: "Bet placed successfully" });
    }
  );
});

// USER BET HISTORY
app.get("/api/bets/:user_id", (req, res) => {
  db.query(
    "SELECT * FROM bets WHERE user_id = ? ORDER BY id DESC",
    [req.params.user_id],
    (err, rows) => {
      if (err) return res.json([]);
      res.json(rows);
    }
  );
});

// DEPOSIT API
app.post("/api/deposit", upload.single("receipt_photo"), (req, res) => {
  const { user_id, name, binance_id, amount } = req.body;
  const receipt_photo = req.file ? req.file.filename : null;

  if (!user_id || !amount) {
    return res.status(400).json({ message: "Deposit details required" });
  }

  db.query(
    "INSERT INTO deposits (user_id, name, binance_id, amount, receipt_photo, status) VALUES (?, ?, ?, ?, ?, 'Pending')",
    [user_id, name, binance_id, amount, receipt_photo],
    (err) => {
      if (err) {
        console.log(err);
        return res.status(500).json({ message: "Deposit failed" });
      }

      res.json({ message: "Deposit request submitted" });
    }
  );
});

// WITHDRAW ELIGIBILITY
app.get("/api/withdraw-eligibility/:user_id", (req, res) => {
  res.json({
    ok: true,
    message: "Withdraw allowed",
    referral_count: 0,
    refs5: false
  });
});

// WITHDRAW API
app.post("/api/withdraw", (req, res) => {
  const { user_id, name, nic, binance_id, amount } = req.body;

  if (!user_id || !amount) {
    return res.status(400).json({ message: "Withdraw details required" });
  }

  db.query(
    "INSERT INTO withdraws (user_id, name, nic, binance_id, amount, status) VALUES (?, ?, ?, ?, ?, 'Pending')",
    [user_id, name, nic, binance_id, amount],
    (err) => {
      if (err) {
        console.log(err);
        return res.status(500).json({ message: "Withdraw failed" });
      }

      res.json({ message: "Withdraw request submitted" });
    }
  );
});

// REFERRALS
app.get("/api/user/:id/referrals", (req, res) => {
  db.query(
    "SELECT * FROM users WHERE referred_by = ? ORDER BY id DESC",
    [req.params.id],
    (err, rows) => {
      if (err) return res.json([]);
      res.json(rows);
    }
  );
});

app.put("/api/user/:id/referral", (req, res) => {
  const { referral_code } = req.body;

  db.query(
    "UPDATE users SET referral_code = ? WHERE id = ?",
    [referral_code, req.params.id],
    (err) => {
      if (err) return res.status(500).json({ message: "Save failed" });
      res.json({ message: "Referral code saved" });
    }
  );
});

// ADMIN SIMPLE APIs
app.get("/api/admin/stats", (req, res) => {
  res.json({
    users: 0,
    deposits: { s: 0 },
    withdraws: { s: 0 },
    bets: 0
  });
});

app.get("/api/admin/users", (req, res) => {
  db.query("SELECT * FROM users ORDER BY id DESC", (err, rows) => {
    if (err) return res.json([]);
    res.json(rows);
  });
});

app.get("/api/admin/deposits", (req, res) => {
  db.query("SELECT * FROM deposits ORDER BY id DESC", (err, rows) => {
    if (err) return res.json([]);
    res.json(rows);
  });
});

app.get("/api/admin/withdraws", (req, res) => {
  db.query("SELECT * FROM withdraws ORDER BY id DESC", (err, rows) => {
    if (err) return res.json([]);
    res.json(rows);
  });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
