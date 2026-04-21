-- Kas harian (ganti modul gaji harian per pekerja).
-- mysql -u root -p manajemen_produksi_batik < database_migration_kas_harian.sql

USE manajemen_produksi_batik;

CREATE TABLE IF NOT EXISTS daily_cashbook_entries (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  entry_date DATE NOT NULL,
  category_code VARCHAR(64) NOT NULL,
  flow_type ENUM('in', 'out') NOT NULL,
  amount DECIMAL(12, 2) NOT NULL DEFAULT 0,
  note VARCHAR(255) NULL,
  included_in_total TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_daily_cash_date (entry_date),
  INDEX idx_daily_cash_cat (category_code)
) ENGINE=InnoDB;
