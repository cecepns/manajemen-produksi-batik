-- Tambah nomor telepon pelanggan & ukuran jahit pada pesanan
-- Jalankan: mysql -u root -p manajemen_produksi_batik < database_migration_order_phone_ukuran_jahit.sql

USE manajemen_produksi_batik;

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS nomor_telepon_pelanggan VARCHAR(32) NULL AFTER nama_pemesan,
  ADD COLUMN IF NOT EXISTS ukuran_jahit VARCHAR(32) NULL AFTER ukuran_meter;
