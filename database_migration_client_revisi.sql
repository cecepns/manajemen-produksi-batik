-- Migrasi untuk instalasi yang sudah ada (jalankan manual):
-- mysql -u root -p manajemen_produksi_batik < database_migration_client_revisi.sql

USE manajemen_produksi_batik;

ALTER TABLE orders
  ADD COLUMN nama_usaha VARCHAR(255) NOT NULL DEFAULT 'Batik Binar' AFTER id;

ALTER TABLE order_images
  ADD COLUMN jenis ENUM('foto_awal', 'foto_akhir') NOT NULL DEFAULT 'foto_awal' AFTER order_id;

CREATE INDEX idx_order_images_order_jenis ON order_images (order_id, jenis);

ALTER TABLE workflow_steps
  ADD COLUMN keterangan TEXT NULL AFTER nama_step,
  ADD COLUMN harga_pekerjaan DECIMAL(12, 2) NULL AFTER keterangan,
  ADD COLUMN cuaca ENUM('terang', 'mendung', 'hujan') NULL AFTER harga_pekerjaan;

CREATE TABLE IF NOT EXISTS daily_wages (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  work_date DATE NOT NULL,
  worker_id INT UNSIGNED NOT NULL,
  jenis_pekerjaan VARCHAR(255) NOT NULL DEFAULT '',
  amount DECIMAL(12, 2) NOT NULL DEFAULT 0,
  included_in_total TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_daily_wages_worker
    FOREIGN KEY (worker_id) REFERENCES users (id)
    ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE INDEX idx_daily_wages_date ON daily_wages (work_date);
CREATE INDEX idx_daily_wages_worker ON daily_wages (worker_id);
