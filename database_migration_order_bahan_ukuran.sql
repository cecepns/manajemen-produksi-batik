-- Tambah jenis bahan & ukuran (meter) pada pesanan
-- Jalankan: mysql -u root -p manajemen_produksi_batik < database_migration_order_bahan_ukuran.sql

USE manajemen_produksi_batik;

ALTER TABLE orders
  ADD COLUMN jenis_bahan VARCHAR(255) NULL AFTER penanggung_jawab,
  ADD COLUMN ukuran_meter DECIMAL(10, 2) NULL AFTER jenis_bahan;
