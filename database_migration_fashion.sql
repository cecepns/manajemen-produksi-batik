-- Migrasi: menu Fashion (direktori produk fashion dengan 5 slot foto)
-- mysql -u root -p manajemen_produksi_batik < database_migration_fashion.sql

USE manajemen_produksi_batik;

CREATE TABLE IF NOT EXISTS fashion_products (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  created_by INT UNSIGNED NOT NULL,
  nama_produk VARCHAR(255) NOT NULL,
  harga DECIMAL(14, 2) NULL,
  penjahit VARCHAR(255) NULL,
  jenis_bahan VARCHAR(255) NULL,
  harga_jahit DECIMAL(14, 2) NULL,
  harga_jual DECIMAL(14, 2) NULL,
  waktu_produksi VARCHAR(255) NULL,
  keterangan TEXT NULL,
  foto1_url VARCHAR(512) NULL,
  foto2_url VARCHAR(512) NULL,
  foto3_url VARCHAR(512) NULL,
  foto4_url VARCHAR(512) NULL,
  foto5_url VARCHAR(512) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_fashion_nama (nama_produk),
  INDEX idx_fashion_penjahit (penjahit),
  CONSTRAINT fk_fashion_creator FOREIGN KEY (created_by) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB;
