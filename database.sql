CREATE DATABASE IF NOT EXISTS color_rush_30;
USE color_rush_30;

CREATE TABLE IF NOT EXISTS settings (
  id INT PRIMARY KEY AUTO_INCREMENT,
  setting_key VARCHAR(100) UNIQUE NOT NULL,
  setting_value TEXT NOT NULL
);

INSERT INTO settings (setting_key, setting_value) VALUES
('deposit_binance_id', '123456789'),
('withdraw_open_time', '20:00'),
('withdraw_close_time', '22:00'),
('next_result', 'Random')
ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value);

CREATE TABLE IF NOT EXISTS users (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(120) NOT NULL,
  birthday DATE NULL,
  nic VARCHAR(50) UNIQUE NOT NULL,
  password VARCHAR(120) NOT NULL,
  referral_code VARCHAR(50) UNIQUE NOT NULL,
  referred_by VARCHAR(50) NULL,
  nic_photo VARCHAR(255) NULL,
  balance DECIMAL(10,2) DEFAULT 0.00,
  status ENUM('Pending','Approved','Rejected') DEFAULT 'Pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS rounds (
  id INT PRIMARY KEY AUTO_INCREMENT,
  round_no INT UNIQUE NOT NULL,
  result_color ENUM('Yellow','Red','Green') NULL,
  status ENUM('Playing','Finished') DEFAULT 'Playing',
  started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  finished_at TIMESTAMP NULL
);

CREATE TABLE IF NOT EXISTS bets (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  round_no INT NOT NULL,
  color ENUM('Yellow','Red','Green') NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  payout DECIMAL(10,2) DEFAULT 0.00,
  status ENUM('Placed','Win','Lost') DEFAULT 'Placed',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS deposits (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  name VARCHAR(120) NOT NULL,
  binance_id VARCHAR(120) NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  receipt_photo VARCHAR(255) NULL,
  referral_bonus_paid TINYINT DEFAULT 0,
  status ENUM('Pending','Approved','Rejected') DEFAULT 'Pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS withdraws (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  name VARCHAR(120) NOT NULL,
  nic VARCHAR(50) NOT NULL,
  binance_id VARCHAR(120) NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  method VARCHAR(80) DEFAULT 'default',
  status ENUM('Pending','Approved','Rejected') DEFAULT 'Pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Use this section if you already imported an older database version.
ALTER TABLE bets ADD COLUMN IF NOT EXISTS payout DECIMAL(10,2) DEFAULT 0.00;
ALTER TABLE deposits ADD COLUMN IF NOT EXISTS referral_bonus_paid TINYINT DEFAULT 0;
ALTER TABLE withdraws ADD COLUMN IF NOT EXISTS method VARCHAR(80) DEFAULT 'default';

INSERT INTO users (name,birthday,nic,password,referral_code,referred_by,balance,status)
VALUES ('Panchayu','2000-01-01','123456789V','123456','CR30-0001',NULL,4900.00,'Approved')
ON DUPLICATE KEY UPDATE name=VALUES(name);

INSERT INTO rounds (round_no,status) VALUES (1058,'Playing')
ON DUPLICATE KEY UPDATE status='Playing';
