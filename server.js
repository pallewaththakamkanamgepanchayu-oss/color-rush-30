require("dotenv").config();

const express = require("express");
const mysql = require("mysql2");
const cors = require("cors");
const path = require("path");

const app = express();

app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;

// FRONTEND FILES
app.use(express.static(__dirname));

// MYSQL
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

// DATABASE CONNECT
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

// TEST API
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

// START SERVER
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
