-- Migrasi: menu Produk baru (tabel catatan foto produk)
-- mysql -u root -p manajemen_produksi_batik < database_migration_produk_baru.sql

USE manajemen_produksi_batik;

CREATE TABLE IF NOT EXISTS new_product_records (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  created_by INT UNSIGNED NOT NULL,
  nama_motif VARCHAR(255) NULL,
  tanggal_pembuatan DATE NULL,
  jumlah INT UNSIGNED NULL,
  jenis_kain VARCHAR(255) NULL,
  ukuran_kain VARCHAR(255) NULL,
  ukuran_jahit VARCHAR(255) NULL,
  model_fashion VARCHAR(255) NULL,
  resep_instruksi TEXT NULL,
  foto1_keterangan VARCHAR(512) NULL,
  foto1_url VARCHAR(512) NOT NULL,
  foto2_url VARCHAR(512) NULL,
  foto3_url VARCHAR(512) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_new_product_creator FOREIGN KEY (created_by) REFERENCES users (id)
) ENGINE=InnoDB;
