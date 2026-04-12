-- Kolom keterangan pada pesanan (catatan singkat / internal)
-- mysql -u root -p manajemen_produksi_batik < database_migration_order_keterangan.sql

USE manajemen_produksi_batik;

ALTER TABLE orders
  ADD COLUMN keterangan TEXT NULL AFTER resep;
