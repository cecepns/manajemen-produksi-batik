-- Manajemen Produksi Batik — skema MySQL
-- Impor: mysql -u root -p < database.sql

CREATE DATABASE IF NOT EXISTS manajemen_produksi_batik
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE manajemen_produksi_batik;

-- users: owner | supervisor | worker
CREATE TABLE IF NOT EXISTS users (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(64) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  role ENUM('owner', 'supervisor', 'worker') NOT NULL DEFAULT 'worker',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- orders
CREATE TABLE IF NOT EXISTS orders (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  nama_pemesan VARCHAR(255) NOT NULL,
  tanggal_pesanan DATE NOT NULL,
  deadline DATE NOT NULL,
  jumlah INT UNSIGNED NOT NULL DEFAULT 1,
  penanggung_jawab VARCHAR(255) NOT NULL,
  resep TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- foto referensi (1–2 per pesanan di aplikasi)
CREATE TABLE IF NOT EXISTS order_images (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  order_id INT UNSIGNED NOT NULL,
  image_url VARCHAR(512) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_order_images_order
    FOREIGN KEY (order_id) REFERENCES orders (id)
    ON DELETE CASCADE
) ENGINE=InnoDB;

-- workflow per pesanan
CREATE TABLE IF NOT EXISTS workflow_steps (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  order_id INT UNSIGNED NOT NULL,
  nama_step VARCHAR(255) NOT NULL,
  assigned_worker_id INT UNSIGNED NULL,
  status ENUM('pending', 'progress', 'done') NOT NULL DEFAULT 'pending',
  tanggal_mulai DATETIME NULL,
  tanggal_selesai DATETIME NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_workflow_order
    FOREIGN KEY (order_id) REFERENCES orders (id)
    ON DELETE CASCADE,
  CONSTRAINT fk_workflow_worker
    FOREIGN KEY (assigned_worker_id) REFERENCES users (id)
    ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE INDEX idx_workflow_order ON workflow_steps (order_id);
CREATE INDEX idx_workflow_worker ON workflow_steps (assigned_worker_id);

-- Seed user (password lihat komentar)
INSERT INTO users (username, password, role) VALUES
  ('owner', '$2b$10$1p5T1pXihhTgYgiOprFVUe.fQL/ufmRJIVWIW0k.0ic1nDtnLTjnC', 'owner'),
  ('supervisor', '$2b$10$4aXvJgyIupw/Youu6fMif.DVpyTj9.fRmCEQ7txiP6RX/rdH.Xs1O', 'supervisor'),
  ('worker', '$2b$10$gHss5g3WXXlf7nXdoAYmPO2y4tuGkSdbLxK1UeCFIxEwIz1Gph6zS', 'worker');
-- owner / owner123 | supervisor / super123 | worker / worker123
