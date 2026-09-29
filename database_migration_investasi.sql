-- Migrasi: Fitur Investasi & Bagi Hasil Usaha
-- Cara impor: mysql -u root -p manajemen_produksi_batik < database_migration_investasi.sql

USE manajemen_produksi_batik;

-- 1. Tabel Header Investasi / Periode Usaha
CREATE TABLE IF NOT EXISTS investments (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  created_by INT UNSIGNED NOT NULL,
  periode VARCHAR(255) NOT NULL,
  jenis_usaha VARCHAR(255) NOT NULL,
  hasil_usaha DECIMAL(14, 2) NOT NULL DEFAULT 0,
  total_modal DECIMAL(14, 2) NOT NULL DEFAULT 0,
  status ENUM('draft', 'selesai', 'dibagikan') NOT NULL DEFAULT 'selesai',
  catatan TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_investments_periode (periode),
  INDEX idx_investments_creator (created_by),
  CONSTRAINT fk_investments_creator FOREIGN KEY (created_by) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- 2. Tabel Rincian Investor Per Investasi (Dibagi adil berdasarkan Modal Serta)
CREATE TABLE IF NOT EXISTS investment_investors (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  investment_id INT UNSIGNED NOT NULL,
  nama_investor VARCHAR(255) NOT NULL,
  modal_serta DECIMAL(14, 2) NOT NULL DEFAULT 0,
  persentase DECIMAL(7, 4) NOT NULL DEFAULT 0,
  bagi_hasil DECIMAL(14, 2) NOT NULL DEFAULT 0,
  keterangan VARCHAR(255) NULL,
  urutan INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_inv_investors_parent (investment_id),
  CONSTRAINT fk_investor_investment FOREIGN KEY (investment_id) REFERENCES investments (id) ON DELETE CASCADE
) ENGINE=InnoDB;
