require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');
const multer = require('multer');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');

const PORT = Number(process.env.PORT) || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-ganti-di-production';
const CORS_ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:5173';

const UPLOAD_DIR = path.join(__dirname, 'uploads-manajemen-produksi-batik');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const pool = mysql.createPool({
  host: process.env.DB_HOST || '127.0.0.1',
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD ?? '',
  database: process.env.DB_NAME || 'manajemen_produksi_batik',
  waitForConnections: true,
  connectionLimit: 10,
});

const app = express();
app.use(cors({ origin: CORS_ORIGIN, credentials: true }));
app.use(express.json({ limit: '2mb' }));
app.use('/uploads', express.static(UPLOAD_DIR));

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname) || '.jpg';
    cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
  },
});
const upload = multer({
  storage,
  limits: { files: 8, fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ok = /^image\/(jpeg|png|webp|gif)$/.test(file.mimetype);
    cb(ok ? null : new Error('Hanya gambar (jpeg, png, webp, gif)'), ok);
  },
});

const MAX_FOTO_AWAL = 6;
const MAX_FOTO_AKHIR = 6;
const CUACA_VALUES = new Set(['terang', 'mendung', 'hujan']);

function unlinkUploadedFiles(files) {
  for (const f of files || []) {
    try {
      const fp = path.join(UPLOAD_DIR, f.filename);
      if (fs.existsSync(fp)) fs.unlinkSync(fp);
    } catch {
      /* ignore */
    }
  }
}

function ordersCreateMaybeMultipart(req, res, next) {
  const ct = req.headers['content-type'] || '';
  if (ct.includes('multipart/form-data')) {
    return upload.array('images', MAX_FOTO_AWAL)(req, res, next);
  }
  next();
}

function authMiddleware(req, res, next) {
  const h = req.headers.authorization;
  const token = h?.startsWith('Bearer ') ? h.slice(7) : null;
  if (!token) return res.status(401).json({ message: 'Token diperlukan' });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ message: 'Token tidak valid' });
  }
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ message: 'Unauthorized' });
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Akses ditolak' });
    }
    next();
  };
}

function isManager(role) {
  return role === 'owner' || role === 'supervisor';
}

async function canAccessOrder(user, orderId) {
  if (isManager(user.role)) return true;
  const [rows] = await pool.query(
    `SELECT 1 FROM workflow_steps
     WHERE order_id = ? AND assigned_worker_id = ?
     LIMIT 1`,
    [orderId, user.sub]
  );
  return rows.length > 0;
}

// --- Auth ---
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body || {};
    if (!username || !password) {
      return res.status(400).json({ message: 'Username dan password wajib' });
    }
    const [users] = await pool.query(
      'SELECT id, username, password, role FROM users WHERE username = ? LIMIT 1',
      [String(username).trim()]
    );
    const u = users[0];
    if (!u || !bcrypt.compareSync(password, u.password)) {
      return res.status(401).json({ message: 'Username atau password salah' });
    }
    const token = jwt.sign(
      { sub: u.id, username: u.username, role: u.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );
    res.json({
      token,
      user: { id: u.id, username: u.username, role: u.role },
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Server error' });
  }
});

app.get('/api/auth/me', authMiddleware, (req, res) => {
  res.json({
    user: { id: req.user.sub, username: req.user.username, role: req.user.role },
  });
});

// --- Users (assign worker) ---
app.get(
  '/api/users',
  authMiddleware,
  requireRole('owner', 'supervisor'),
  async (_req, res) => {
    try {
      const [rows] = await pool.query(
        'SELECT id, username, role FROM users ORDER BY role, username'
      );
      res.json(rows);
    } catch (e) {
      console.error(e);
      res.status(500).json({ message: 'Server error' });
    }
  }
);

app.get(
  '/api/users/workers',
  authMiddleware,
  requireRole('owner', 'supervisor'),
  async (_req, res) => {
    try {
      const [rows] = await pool.query(
        "SELECT id, username FROM users WHERE role = 'worker' ORDER BY username"
      );
      res.json(rows);
    } catch (e) {
      console.error(e);
      res.status(500).json({ message: 'Server error' });
    }
  }
);

const USER_ROLES = ['owner', 'supervisor', 'worker'];

async function countOwners() {
  const [[row]] = await pool.query("SELECT COUNT(*) AS c FROM users WHERE role = 'owner'");
  return row.c;
}

// --- Admin: manajemen user (owner saja) ---
app.get('/api/admin/users', authMiddleware, requireRole('owner'), async (req, res) => {
  try {
    let page = Math.max(1, parseInt(String(req.query.page || '1'), 10) || 1);
    let limit = parseInt(String(req.query.limit || '10'), 10) || 10;
    if (limit > 10) limit = 10;
    if (limit < 1) limit = 10;

    const rawSearch = String(req.query.search || '').trim();
    const forLike = rawSearch.replace(/\\/g, '\\\\').replace(/%/g, '\\%').replace(/_/g, '\\_');

    let where = '';
    const params = [];
    if (forLike) {
      where = 'WHERE username LIKE ?';
      params.push(`%${forLike}%`);
    }

    const [[countRow]] = await pool.query(
      `SELECT COUNT(*) AS total FROM users ${where}`,
      params
    );
    const total = countRow.total;
    const totalPages = Math.max(1, Math.ceil(total / limit));
    if (page > totalPages) page = totalPages;
    const offset = (page - 1) * limit;

    const [rows] = await pool.query(
      `SELECT id, username, role, created_at FROM users ${where} ORDER BY role, username LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    res.json({
      data: rows,
      total,
      page,
      limit,
      totalPages,
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Server error' });
  }
});

app.post('/api/admin/users', authMiddleware, requireRole('owner'), async (req, res) => {
  try {
    const { username, password, role } = req.body || {};
    const u = String(username || '').trim();
    if (!u || !password || !role) {
      return res.status(400).json({ message: 'Username, password, dan role wajib' });
    }
    if (!USER_ROLES.includes(role)) {
      return res.status(400).json({ message: 'Role tidak valid' });
    }
    if (String(password).length < 6) {
      return res.status(400).json({ message: 'Password minimal 6 karakter' });
    }
    const hash = bcrypt.hashSync(password, 10);
    const [r] = await pool.query('INSERT INTO users (username, password, role) VALUES (?, ?, ?)', [
      u,
      hash,
      role,
    ]);
    const [[row]] = await pool.query(
      'SELECT id, username, role, created_at FROM users WHERE id = ?',
      [r.insertId]
    );
    res.status(201).json(row);
  } catch (e) {
    if (e.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ message: 'Username sudah dipakai' });
    }
    console.error(e);
    res.status(500).json({ message: 'Server error' });
  }
});

app.put('/api/admin/users/:id', authMiddleware, requireRole('owner'), async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ message: 'ID tidak valid' });

    const { username, password, role } = req.body || {};
    const [[target]] = await pool.query('SELECT id, username, role FROM users WHERE id = ?', [id]);
    if (!target) return res.status(404).json({ message: 'User tidak ditemukan' });

    const owners = await countOwners();
    if (target.role === 'owner' && role !== undefined && role !== 'owner' && owners <= 1) {
      return res.status(400).json({ message: 'Tidak boleh mengubah role satu-satunya owner' });
    }
    if (role !== undefined && !USER_ROLES.includes(role)) {
      return res.status(400).json({ message: 'Role tidak valid' });
    }

    const parts = [];
    const params = [];

    if (username !== undefined) {
      parts.push('username = ?');
      params.push(String(username).trim());
    }
    if (password !== undefined && password !== '') {
      if (String(password).length < 6) {
        return res.status(400).json({ message: 'Password minimal 6 karakter' });
      }
      parts.push('password = ?');
      params.push(bcrypt.hashSync(password, 10));
    }
    if (role !== undefined) {
      parts.push('role = ?');
      params.push(role);
    }

    if (!parts.length) {
      const [[row]] = await pool.query(
        'SELECT id, username, role, created_at FROM users WHERE id = ?',
        [id]
      );
      return res.json(row);
    }

    params.push(id);
    await pool.query(`UPDATE users SET ${parts.join(', ')} WHERE id = ?`, params);
    const [[row]] = await pool.query(
      'SELECT id, username, role, created_at FROM users WHERE id = ?',
      [id]
    );
    res.json(row);
  } catch (e) {
    if (e.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ message: 'Username sudah dipakai' });
    }
    console.error(e);
    res.status(500).json({ message: 'Server error' });
  }
});

app.delete('/api/admin/users/:id', authMiddleware, requireRole('owner'), async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ message: 'ID tidak valid' });
    if (id === req.user.sub) {
      return res.status(400).json({ message: 'Tidak dapat menghapus akun yang sedang dipakai' });
    }

    const [[target]] = await pool.query('SELECT role FROM users WHERE id = ?', [id]);
    if (!target) return res.status(404).json({ message: 'User tidak ditemukan' });

    const owners = await countOwners();
    if (target.role === 'owner' && owners <= 1) {
      return res.status(400).json({ message: 'Tidak dapat menghapus satu-satunya owner' });
    }

    await pool.query('DELETE FROM users WHERE id = ?', [id]);
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Server error' });
  }
});

// --- Orders ---
app.get('/api/orders', authMiddleware, async (req, res) => {
  try {
    const { role } = req.user;
    let page = Math.max(1, parseInt(String(req.query.page || '1'), 10) || 1);
    let limit = parseInt(String(req.query.limit || '10'), 10) || 10;
    if (limit > 10) limit = 10;
    if (limit < 1) limit = 10;
    const includeCompleted = String(req.query.include_completed || '') === '1';
    const onlyCompleted = String(req.query.only_completed || '') === '1';
    const rawSearch = String(req.query.search || '').trim();
    const forLike = rawSearch.replace(/\\/g, '\\\\').replace(/%/g, '\\%').replace(/_/g, '\\_');

    let rows;
    let countRow;
    if (isManager(role)) {
      let where = '';
      const params = [];
      if (onlyCompleted) {
        where +=
          'WHERE COALESCE(w.total_steps, 0) > 0 AND COALESCE(w.done_steps, 0) >= COALESCE(w.total_steps, 0)';
      } else if (!includeCompleted) {
        where +=
          'WHERE COALESCE(w.total_steps, 0) = 0 OR COALESCE(w.done_steps, 0) < COALESCE(w.total_steps, 0)';
      }
      if (forLike) {
        const p = `%${forLike}%`;
        where += where
          ? ` AND (o.nama_usaha LIKE ? OR o.nama_pemesan LIKE ? OR o.penanggung_jawab LIKE ? OR COALESCE(o.nomor_telepon_pelanggan, '') LIKE ? OR CAST(o.id AS CHAR) LIKE ?)`
          : `WHERE (o.nama_usaha LIKE ? OR o.nama_pemesan LIKE ? OR o.penanggung_jawab LIKE ? OR COALESCE(o.nomor_telepon_pelanggan, '') LIKE ? OR CAST(o.id AS CHAR) LIKE ?)`;
        params.push(p, p, p, p, p);
      }
      [[countRow]] = await pool.query(
        `SELECT COUNT(*) AS total
           FROM orders o
           LEFT JOIN (
             SELECT order_id,
                    COUNT(*) AS total_steps,
                    SUM(CASE WHEN status = 'done' THEN 1 ELSE 0 END) AS done_steps
               FROM workflow_steps
              GROUP BY order_id
           ) w ON w.order_id = o.id
          ${where}`,
        params
      );
      const total = countRow.total;
      const totalPages = Math.max(1, Math.ceil(total / limit));
      if (page > totalPages) page = totalPages;
      const nextOffset = (page - 1) * limit;
      [rows] = await pool.query(
        `SELECT o.*,
                COALESCE(w.total_steps, 0) AS total_steps,
                COALESCE(w.done_steps, 0) AS done_steps
           FROM orders o
           LEFT JOIN (
             SELECT order_id,
                    COUNT(*) AS total_steps,
                    SUM(CASE WHEN status = 'done' THEN 1 ELSE 0 END) AS done_steps
               FROM workflow_steps
              GROUP BY order_id
           ) w ON w.order_id = o.id
          ${where}
          ORDER BY o.tanggal_pesanan DESC, o.id DESC
          LIMIT ? OFFSET ?`,
        [...params, limit, nextOffset]
      );
      return res.json({
        data: rows,
        total,
        page,
        limit,
        totalPages,
      });
    } else {
      const workerId = Number(req.user.sub);
      let where = 'WHERE COALESCE(w.total_steps, 0) > 0';
      const params = [workerId];
      if (onlyCompleted) {
        where += ' AND COALESCE(w.done_steps, 0) >= COALESCE(w.total_steps, 0)';
      } else if (!includeCompleted) {
        where += ' AND COALESCE(w.done_steps, 0) < COALESCE(w.total_steps, 0)';
      }
      if (forLike) {
        const p = `%${forLike}%`;
        where +=
          ' AND (o.nama_usaha LIKE ? OR o.nama_pemesan LIKE ? OR o.penanggung_jawab LIKE ? OR COALESCE(o.nomor_telepon_pelanggan, \'\') LIKE ? OR CAST(o.id AS CHAR) LIKE ?)';
        params.push(p, p, p, p, p);
      }
      [[countRow]] = await pool.query(
        `SELECT COUNT(*) AS total
           FROM orders o
           LEFT JOIN (
             SELECT order_id,
                    COUNT(*) AS total_steps,
                    SUM(CASE WHEN status = 'done' THEN 1 ELSE 0 END) AS done_steps
               FROM workflow_steps
              WHERE assigned_worker_id = ?
              GROUP BY order_id
           ) w ON w.order_id = o.id
          ${where}`,
        params
      );
      const total = countRow.total;
      const totalPages = Math.max(1, Math.ceil(total / limit));
      if (page > totalPages) page = totalPages;
      const nextOffset = (page - 1) * limit;
      [rows] = await pool.query(
        `SELECT o.*,
                COALESCE(w.total_steps, 0) AS total_steps,
                COALESCE(w.done_steps, 0) AS done_steps
           FROM orders o
           LEFT JOIN (
             SELECT order_id,
                    COUNT(*) AS total_steps,
                    SUM(CASE WHEN status = 'done' THEN 1 ELSE 0 END) AS done_steps
               FROM workflow_steps
              WHERE assigned_worker_id = ?
              GROUP BY order_id
           ) w ON w.order_id = o.id
          ${where}
          ORDER BY o.tanggal_pesanan DESC, o.id DESC
          LIMIT ? OFFSET ?`,
        [...params, limit, nextOffset]
      );
      return res.json({
        data: rows,
        total,
        page,
        limit,
        totalPages,
      });
    }
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Server error' });
  }
});

app.get('/api/orders/:id', authMiddleware, async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ message: 'ID tidak valid' });
    const ok = await canAccessOrder(req.user, id);
    if (!ok) return res.status(403).json({ message: 'Akses ditolak' });

    const [[order]] = await pool.query('SELECT * FROM orders WHERE id = ?', [id]);
    if (!order) return res.status(404).json({ message: 'Pesanan tidak ditemukan' });

    const [images] = await pool.query(
      'SELECT * FROM order_images WHERE order_id = ? ORDER BY id',
      [id]
    );
    let [steps] = await pool.query(
      `SELECT ws.*, u.username AS assigned_username
       FROM workflow_steps ws
       LEFT JOIN users u ON u.id = ws.assigned_worker_id
       WHERE ws.order_id = ?
       ORDER BY ws.id ASC`,
      [id]
    );
    if (!isManager(req.user.role)) {
      const uid = Number(req.user.sub);
      steps = steps.filter((s) => Number(s.assigned_worker_id) === uid);
    }
    res.json({ ...order, images, workflow_steps: steps });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Server error' });
  }
});

app.post(
  '/api/orders',
  authMiddleware,
  requireRole('owner', 'supervisor'),
  ordersCreateMaybeMultipart,
  async (req, res) => {
    const conn = await pool.getConnection();
    const files = req.files || [];
    try {
      const isMultipart = (req.headers['content-type'] || '').includes('multipart/form-data');
      const raw = isMultipart ? req.body || {} : req.body || {};

      let stepsBody;
      if (isMultipart) {
        const ws = raw.workflow_steps;
        if (typeof ws === 'string') {
          try {
            stepsBody = JSON.parse(ws || '[]');
          } catch {
            unlinkUploadedFiles(files);
            return res.status(400).json({ message: 'workflow_steps tidak valid' });
          }
        } else {
          stepsBody = ws;
        }
      } else {
        stepsBody = raw.workflow_steps;
      }

      const {
        nama_usaha,
        nama_pemesan,
        nomor_telepon_pelanggan,
        tanggal_pesanan,
        deadline,
        jumlah,
        penanggung_jawab,
        jenis_bahan,
        ukuran_meter,
        ukuran_jahit,
        resep,
        keterangan,
      } = raw;

      if (!nama_pemesan || !tanggal_pesanan || !deadline || !penanggung_jawab) {
        unlinkUploadedFiles(files);
        return res.status(400).json({ message: 'Field wajib belum lengkap' });
      }

      const usaha =
        typeof nama_usaha === 'string' && nama_usaha.trim()
          ? nama_usaha.trim()
          : 'Batik Binar';

      const ketOrder =
        keterangan != null && String(keterangan).trim()
          ? String(keterangan).trim()
          : null;
      const nomorTelepon =
        nomor_telepon_pelanggan != null && String(nomor_telepon_pelanggan).trim()
          ? String(nomor_telepon_pelanggan).trim()
          : null;

      const bahan =
        jenis_bahan != null && String(jenis_bahan).trim()
          ? String(jenis_bahan).trim()
          : null;
      let ukuran = null;
      if (ukuran_meter !== undefined && ukuran_meter !== '' && ukuran_meter != null) {
        const n = Number(ukuran_meter);
        ukuran = Number.isFinite(n) ? n : null;
      }
      const ukuranJahit =
        ukuran_jahit != null && String(ukuran_jahit).trim() ? String(ukuran_jahit).trim() : null;

      await conn.beginTransaction();
      const [r] = await conn.query(
        `INSERT INTO orders (
          nama_usaha, nama_pemesan, nomor_telepon_pelanggan, tanggal_pesanan, deadline,
          jumlah, penanggung_jawab, jenis_bahan, ukuran_meter, ukuran_jahit, resep, keterangan
        )
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          usaha,
          nama_pemesan,
          nomorTelepon,
          tanggal_pesanan,
          deadline,
          Number(jumlah) > 0 ? Number(jumlah) : 1,
          penanggung_jawab,
          bahan,
          ukuran,
          ukuranJahit,
          resep ?? null,
          ketOrder,
        ]
      );
      const orderId = r.insertId;

      const steps = Array.isArray(stepsBody) ? stepsBody : [];
      for (const s of steps) {
        const name = s?.nama_step?.trim();
        if (!name) continue;
        const wid = s?.assigned_worker_id ? Number(s.assigned_worker_id) : null;
        const ket =
          s?.keterangan != null && String(s.keterangan).trim()
            ? String(s.keterangan).trim()
            : null;
        let harga = null;
        if (s?.harga_pekerjaan != null && s.harga_pekerjaan !== '') {
          const n = Number(s.harga_pekerjaan);
          harga = Number.isFinite(n) ? n : null;
        }
        await conn.query(
          `INSERT INTO workflow_steps (order_id, nama_step, keterangan, harga_pekerjaan, assigned_worker_id, status)
           VALUES (?, ?, ?, ?, ?, 'pending')`,
          [orderId, name, ket, harga, wid || null]
        );
      }

      if (files.length > MAX_FOTO_AWAL) {
        await conn.rollback();
        unlinkUploadedFiles(files);
        return res.status(400).json({ message: `Maksimal ${MAX_FOTO_AWAL} foto awal` });
      }

      for (const f of files) {
        const url = `/uploads/${f.filename}`;
        await conn.query(
          'INSERT INTO order_images (order_id, jenis, image_url) VALUES (?, ?, ?)',
          [orderId, 'foto_awal', url]
        );
      }

      await conn.commit();
      const [[order]] = await pool.query('SELECT * FROM orders WHERE id = ?', [orderId]);
      res.status(201).json(order);
    } catch (e) {
      await conn.rollback();
      unlinkUploadedFiles(files);
      console.error(e);
      res.status(500).json({ message: 'Server error' });
    } finally {
      conn.release();
    }
  }
);

app.put('/api/orders/:id', authMiddleware, requireRole('owner', 'supervisor'), async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ message: 'ID tidak valid' });

    const {
      nama_usaha,
      nama_pemesan,
      nomor_telepon_pelanggan,
      tanggal_pesanan,
      deadline,
      jumlah,
      penanggung_jawab,
      jenis_bahan,
      ukuran_meter,
      ukuran_jahit,
      resep,
      keterangan,
    } = req.body || {};

    const [[cur]] = await pool.query('SELECT * FROM orders WHERE id = ?', [id]);
    if (!cur) return res.status(404).json({ message: 'Pesanan tidak ditemukan' });

    const nextUsaha =
      nama_usaha !== undefined
        ? String(nama_usaha || '').trim() || 'Batik Binar'
        : cur.nama_usaha ?? 'Batik Binar';

    const nextKeterangan =
      keterangan !== undefined
        ? keterangan != null && String(keterangan).trim()
          ? String(keterangan).trim()
          : null
        : cur.keterangan ?? null;
    const nextNomorTelepon =
      nomor_telepon_pelanggan !== undefined
        ? nomor_telepon_pelanggan != null && String(nomor_telepon_pelanggan).trim()
          ? String(nomor_telepon_pelanggan).trim()
          : null
        : cur.nomor_telepon_pelanggan ?? null;

    const nextJenisBahan =
      jenis_bahan !== undefined
        ? jenis_bahan != null && String(jenis_bahan).trim()
          ? String(jenis_bahan).trim()
          : null
        : cur.jenis_bahan ?? null;

    let nextUkuranMeter = cur.ukuran_meter ?? null;
    if (ukuran_meter !== undefined) {
      if (ukuran_meter === '' || ukuran_meter == null) {
        nextUkuranMeter = null;
      } else {
        const n = Number(ukuran_meter);
        nextUkuranMeter = Number.isFinite(n) ? n : null;
      }
    }
    const nextUkuranJahit =
      ukuran_jahit !== undefined
        ? ukuran_jahit != null && String(ukuran_jahit).trim()
          ? String(ukuran_jahit).trim()
          : null
        : cur.ukuran_jahit ?? null;

    await pool.query(
      `UPDATE orders SET
        nama_usaha = ?,
        nama_pemesan = ?, nomor_telepon_pelanggan = ?, tanggal_pesanan = ?, deadline = ?,
        jumlah = ?, penanggung_jawab = ?, jenis_bahan = ?, ukuran_meter = ?, ukuran_jahit = ?,
        resep = ?, keterangan = ?
       WHERE id = ?`,
      [
        nextUsaha,
        nama_pemesan !== undefined ? nama_pemesan : cur.nama_pemesan,
        nextNomorTelepon,
        tanggal_pesanan !== undefined ? tanggal_pesanan : cur.tanggal_pesanan,
        deadline !== undefined ? deadline : cur.deadline,
        jumlah !== undefined ? Number(jumlah) || 1 : cur.jumlah,
        penanggung_jawab !== undefined ? penanggung_jawab : cur.penanggung_jawab,
        nextJenisBahan,
        nextUkuranMeter,
        nextUkuranJahit,
        resep !== undefined ? resep : cur.resep,
        nextKeterangan,
        id,
      ]
    );
    const [[order]] = await pool.query('SELECT * FROM orders WHERE id = ?', [id]);
    res.json(order);
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Server error' });
  }
});

app.delete('/api/orders/:id', authMiddleware, requireRole('owner'), async (req, res) => {
  try {
    const id = Number(req.params.id);
    const [r] = await pool.query('DELETE FROM orders WHERE id = ?', [id]);
    if (r.affectedRows === 0) return res.status(404).json({ message: 'Pesanan tidak ditemukan' });
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Server error' });
  }
});

// --- Images ---
app.post(
  '/api/orders/:id/images',
  authMiddleware,
  requireRole('owner', 'supervisor'),
  upload.array('images', 8),
  async (req, res) => {
    try {
      const orderId = Number(req.params.id);
      if (!orderId) return res.status(400).json({ message: 'ID tidak valid' });

      const jenisRaw = String(req.body?.jenis || 'foto_awal').trim();
      const jenis = jenisRaw === 'foto_akhir' ? 'foto_akhir' : 'foto_awal';
      const maxPerJenis = jenis === 'foto_akhir' ? MAX_FOTO_AKHIR : MAX_FOTO_AWAL;

      const [cntRows] = await pool.query(
        'SELECT COUNT(*) AS c FROM order_images WHERE order_id = ? AND jenis = ?',
        [orderId, jenis]
      );
      const existing = cntRows[0].c;
      const files = req.files || [];
      if (existing + files.length > maxPerJenis) {
        for (const f of files) fs.unlinkSync(path.join(UPLOAD_DIR, f.filename));
        return res
          .status(400)
          .json({ message: `Maksimal ${maxPerJenis} gambar untuk ${jenis.replace('_', ' ')}` });
      }

      const inserted = [];
      for (const f of files) {
        const url = `/uploads/${f.filename}`;
        const [r] = await pool.query(
          'INSERT INTO order_images (order_id, jenis, image_url) VALUES (?, ?, ?)',
          [orderId, jenis, url]
        );
        inserted.push({ id: r.insertId, order_id: orderId, jenis, image_url: url });
      }
      res.status(201).json(inserted);
    } catch (e) {
      console.error(e);
      res.status(500).json({ message: e.message || 'Server error' });
    }
  }
);

app.delete(
  '/api/order-images/:imageId',
  authMiddleware,
  requireRole('owner', 'supervisor'),
  async (req, res) => {
    try {
      const imageId = Number(req.params.imageId);
      const [rows] = await pool.query('SELECT * FROM order_images WHERE id = ?', [imageId]);
      const img = rows[0];
      if (!img) return res.status(404).json({ message: 'Gambar tidak ditemukan' });
      const file = path.basename(img.image_url);
      const fp = path.join(UPLOAD_DIR, file);
      if (fs.existsSync(fp)) fs.unlinkSync(fp);
      await pool.query('DELETE FROM order_images WHERE id = ?', [imageId]);
      res.json({ ok: true });
    } catch (e) {
      console.error(e);
      res.status(500).json({ message: 'Server error' });
    }
  }
);

// --- Workflow steps ---
app.post(
  '/api/orders/:id/workflow-steps',
  authMiddleware,
  requireRole('owner', 'supervisor'),
  async (req, res) => {
    try {
      const orderId = Number(req.params.id);
      const { nama_step, assigned_worker_id, keterangan, harga_pekerjaan } = req.body || {};
      if (!nama_step?.trim()) return res.status(400).json({ message: 'nama_step wajib' });
      const wid = assigned_worker_id ? Number(assigned_worker_id) : null;
      const ket =
        keterangan != null && String(keterangan).trim() ? String(keterangan).trim() : null;
      let harga = null;
      if (harga_pekerjaan != null && harga_pekerjaan !== '') {
        const n = Number(harga_pekerjaan);
        harga = Number.isFinite(n) ? n : null;
      }
      const [r] = await pool.query(
        `INSERT INTO workflow_steps (order_id, nama_step, keterangan, harga_pekerjaan, assigned_worker_id, status)
         VALUES (?, ?, ?, ?, ?, 'pending')`,
        [orderId, nama_step.trim(), ket, harga, wid || null]
      );
      const [rows] = await pool.query(
        `SELECT ws.*, u.username AS assigned_username
         FROM workflow_steps ws
         LEFT JOIN users u ON u.id = ws.assigned_worker_id
         WHERE ws.id = ?`,
        [r.insertId]
      );
      res.status(201).json(rows[0]);
    } catch (e) {
      console.error(e);
      res.status(500).json({ message: 'Server error' });
    }
  }
);

app.put('/api/workflow-steps/:stepId', authMiddleware, async (req, res) => {
  try {
    const stepId = Number(req.params.stepId);
    const {
      status,
      assigned_worker_id,
      nama_step,
      keterangan,
      harga_pekerjaan,
      cuaca,
    } = req.body || {};

    const [steps] = await pool.query('SELECT * FROM workflow_steps WHERE id = ?', [stepId]);
    const step = steps[0];
    if (!step) return res.status(404).json({ message: 'Step tidak ditemukan' });

    const user = req.user;
    const manager = isManager(user.role);
    const isAssignee = step.assigned_worker_id === user.sub;

    if (!manager && !isAssignee) {
      return res.status(403).json({ message: 'Akses ditolak' });
    }

    if (!manager) {
      if (
        assigned_worker_id !== undefined ||
        nama_step !== undefined ||
        keterangan !== undefined ||
        harga_pekerjaan !== undefined
      ) {
        return res.status(403).json({ message: 'Worker hanya boleh ubah status dan cuaca' });
      }
    }

    const newStatus = status ?? step.status;
    const newNama = nama_step !== undefined ? String(nama_step).trim() : step.nama_step;
    let newAssign = step.assigned_worker_id;
    if (manager && assigned_worker_id !== undefined) {
      newAssign = assigned_worker_id === null || assigned_worker_id === ''
        ? null
        : Number(assigned_worker_id);
    }

    let newKet = step.keterangan;
    if (manager && keterangan !== undefined) {
      newKet = keterangan != null && String(keterangan).trim() ? String(keterangan).trim() : null;
    }

    let newHarga = step.harga_pekerjaan;
    if (manager && harga_pekerjaan !== undefined) {
      if (harga_pekerjaan === null || harga_pekerjaan === '') {
        newHarga = null;
      } else {
        const n = Number(harga_pekerjaan);
        newHarga = Number.isFinite(n) ? n : step.harga_pekerjaan;
      }
    }

    let newCuaca = step.cuaca;
    if (cuaca !== undefined) {
      if (cuaca === null || cuaca === '') {
        newCuaca = null;
      } else if (CUACA_VALUES.has(String(cuaca))) {
        newCuaca = String(cuaca);
      }
    }

    let tanggal_mulai = step.tanggal_mulai;
    let tanggal_selesai = step.tanggal_selesai;

    if (newStatus === 'progress' && step.status !== 'progress' && step.status !== 'done') {
      tanggal_mulai = new Date();
    }
    if (newStatus === 'done') {
      tanggal_selesai = new Date();
      if (!tanggal_mulai) tanggal_mulai = new Date();
    }
    if (newStatus === 'pending') {
      tanggal_mulai = null;
      tanggal_selesai = null;
    }

    await pool.query(
      `UPDATE workflow_steps SET
        status = ?,
        assigned_worker_id = ?,
        nama_step = ?,
        keterangan = ?,
        harga_pekerjaan = ?,
        cuaca = ?,
        tanggal_mulai = ?,
        tanggal_selesai = ?
       WHERE id = ?`,
      [
        newStatus,
        newAssign,
        newNama || step.nama_step,
        newKet,
        newHarga,
        newCuaca,
        tanggal_mulai,
        tanggal_selesai,
        stepId,
      ]
    );

    const [updated] = await pool.query(
      `SELECT ws.*, u.username AS assigned_username
       FROM workflow_steps ws
       LEFT JOIN users u ON u.id = ws.assigned_worker_id
       WHERE ws.id = ?`,
      [stepId]
    );
    res.json(updated[0]);
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Server error' });
  }
});

app.delete(
  '/api/workflow-steps/:stepId',
  authMiddleware,
  requireRole('owner', 'supervisor'),
  async (req, res) => {
    try {
      const stepId = Number(req.params.stepId);
      const [r] = await pool.query('DELETE FROM workflow_steps WHERE id = ?', [stepId]);
      if (r.affectedRows === 0) return res.status(404).json({ message: 'Step tidak ditemukan' });
      res.json({ ok: true });
    } catch (e) {
      console.error(e);
      res.status(500).json({ message: 'Server error' });
    }
  }
);

// --- Worker: tugas saya (paginasi + cari di API) ---
app.get('/api/my-tasks', authMiddleware, async (req, res) => {
  try {
    let page = Math.max(1, parseInt(String(req.query.page || '1'), 10) || 1);
    let limit = parseInt(String(req.query.limit || '10'), 10) || 10;
    if (limit > 10) limit = 10;
    if (limit < 1) limit = 10;

    const rawSearch = String(req.query.search || '').trim();
    const forLike = rawSearch.replace(/\\/g, '\\\\').replace(/%/g, '\\%').replace(/_/g, '\\_');

    let where = 'WHERE 1=1';
    const params = [];
    if (!isManager(req.user.role)) {
      where += ' AND ws.assigned_worker_id = ?';
      params.push(req.user.sub);
    }
    if (forLike) {
      where += ` AND (
        o.nama_pemesan LIKE ? OR
        o.nama_usaha LIKE ? OR
        ws.nama_step LIKE ? OR
        CAST(o.id AS CHAR) LIKE ?
      )`;
      const p = `%${forLike}%`;
      params.push(p, p, p, p);
    }

    const [[countRow]] = await pool.query(
      `SELECT COUNT(*) AS total
       FROM workflow_steps ws
       INNER JOIN orders o ON o.id = ws.order_id
       ${where}`,
      params
    );
    const total = countRow.total;
    const totalPages = Math.max(1, Math.ceil(total / limit));
    if (page > totalPages) page = totalPages;
    const offset = (page - 1) * limit;

    const [rows] = await pool.query(
      `SELECT ws.*, o.nama_usaha, o.nama_pemesan, o.deadline, o.jumlah,
              u.username AS assigned_username
       FROM workflow_steps ws
       INNER JOIN orders o ON o.id = ws.order_id
       LEFT JOIN users u ON u.id = ws.assigned_worker_id
       ${where}
       ORDER BY
         CASE ws.status WHEN 'progress' THEN 0 WHEN 'pending' THEN 1 ELSE 2 END,
         o.deadline ASC,
         ws.id ASC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    res.json({
      data: rows,
      total,
      page,
      limit,
      totalPages,
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Server error' });
  }
});

// --- Kas harian (pemasukan / pengeluaran + saldo, kategori tetap) ---
const CASHBOOK_CATEGORIES = [
  { code: 'pemasukan_utama', label: 'Pemasukan', flow: 'in' },
  { code: 'pemasukan_lain', label: 'Pemasukan lain', flow: 'in' },
  { code: 'gaji_pegawai_cap', label: 'Gaji pegawai cap', flow: 'out' },
  { code: 'gaji_pegawai_warna', label: 'Gaji pegawai warna', flow: 'out' },
  { code: 'gaji_pegawai_lorod', label: 'Gaji pegawai lorod', flow: 'out' },
  { code: 'gaji_pegawai_pembatik_pr', label: 'Gaji pegawai pembatik PR', flow: 'out' },
  { code: 'gaji_lain_a', label: 'Gaji lain A', flow: 'out' },
  { code: 'gaji_lain_b', label: 'Gaji lain B', flow: 'out' },
  { code: 'gaji_lain_c', label: 'Gaji lain C', flow: 'out' },
  { code: 'pengeluaran_a', label: 'Pengeluaran A', flow: 'out' },
  { code: 'pengeluaran_b', label: 'Pengeluaran B', flow: 'out' },
  { code: 'pengeluaran_c', label: 'Pengeluaran C', flow: 'out' },
  { code: 'pengeluaran_lain', label: 'Pengeluaran lain', flow: 'out' },
];

const CASHBOOK_CATEGORY_BY_CODE = Object.fromEntries(
  CASHBOOK_CATEGORIES.map((c) => [c.code, c])
);

function buildCashbookWhere(query) {
  const conditions = [];
  const params = [];
  const from = String(query.from || '').trim();
  const to = String(query.to || '').trim();
  const categoryCode = String(query.category_code || '').trim();
  if (from) {
    conditions.push('e.entry_date >= ?');
    params.push(from);
  }
  if (to) {
    conditions.push('e.entry_date <= ?');
    params.push(to);
  }
  if (categoryCode && CASHBOOK_CATEGORY_BY_CODE[categoryCode]) {
    conditions.push('e.category_code = ?');
    params.push(categoryCode);
  }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  return { where, params };
}

function cashbookRowOut(row) {
  const meta = CASHBOOK_CATEGORY_BY_CODE[row.category_code];
  return {
    ...row,
    category_label: meta?.label ?? row.category_code,
  };
}

app.get(
  '/api/daily-cashbook/meta',
  authMiddleware,
  requireRole('owner', 'supervisor'),
  (_req, res) => {
    res.json({ categories: CASHBOOK_CATEGORIES });
  }
);

app.get(
  '/api/daily-cashbook',
  authMiddleware,
  requireRole('owner', 'supervisor'),
  async (req, res) => {
    try {
      const { where, params } = buildCashbookWhere(req.query);
      const [rows] = await pool.query(
        `SELECT e.*
         FROM daily_cashbook_entries e
         ${where}
         ORDER BY e.entry_date DESC, e.id DESC`,
        params
      );
      const [[sumRow]] = await pool.query(
        `SELECT
           COALESCE(SUM(CASE WHEN e.flow_type = 'in' AND e.included_in_total = 1 THEN e.amount ELSE 0 END), 0) AS pemasukan_included,
           COALESCE(SUM(CASE WHEN e.flow_type = 'out' AND e.included_in_total = 1 THEN e.amount ELSE 0 END), 0) AS pengeluaran_included,
           COALESCE(SUM(CASE WHEN e.flow_type = 'in' THEN e.amount ELSE 0 END), 0) AS pemasukan_all,
           COALESCE(SUM(CASE WHEN e.flow_type = 'out' THEN e.amount ELSE 0 END), 0) AS pengeluaran_all
         FROM daily_cashbook_entries e
         ${where}`,
        params
      );
      const pemIn = Number(sumRow.pemasukan_included) || 0;
      const pengOut = Number(sumRow.pengeluaran_included) || 0;
      const pemAll = Number(sumRow.pemasukan_all) || 0;
      const pengAll = Number(sumRow.pengeluaran_all) || 0;
      res.json({
        data: rows.map(cashbookRowOut),
        pemasukanIncluded: pemIn,
        pengeluaranIncluded: pengOut,
        saldoIncluded: pemIn - pengOut,
        pemasukanAll: pemAll,
        pengeluaranAll: pengAll,
        saldoAll: pemAll - pengAll,
      });
    } catch (e) {
      console.error(e);
      res.status(500).json({ message: 'Server error' });
    }
  }
);

app.post(
  '/api/daily-cashbook',
  authMiddleware,
  requireRole('owner', 'supervisor'),
  async (req, res) => {
    try {
      const { entry_date, category_code, amount, note, included_in_total } = req.body || {};
      if (!entry_date || !category_code) {
        return res.status(400).json({ message: 'Tanggal dan kategori wajib' });
      }
      const code = String(category_code).trim();
      const cat = CASHBOOK_CATEGORY_BY_CODE[code];
      if (!cat) return res.status(400).json({ message: 'Kategori tidak valid' });
      const amt = Number(amount);
      if (!Number.isFinite(amt) || amt < 0) {
        return res.status(400).json({ message: 'Nominal tidak valid' });
      }
      const noteTrim =
        note != null && String(note).trim() ? String(note).trim().slice(0, 255) : null;
      const inc =
        included_in_total === false || included_in_total === 0 || included_in_total === '0'
          ? 0
          : 1;
      const [r] = await pool.query(
        `INSERT INTO daily_cashbook_entries (entry_date, category_code, flow_type, amount, note, included_in_total)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [entry_date, code, cat.flow, amt, noteTrim, inc]
      );
      const [rows] = await pool.query('SELECT * FROM daily_cashbook_entries WHERE id = ?', [
        r.insertId,
      ]);
      res.status(201).json(cashbookRowOut(rows[0]));
    } catch (e) {
      console.error(e);
      res.status(500).json({ message: 'Server error' });
    }
  }
);

app.patch(
  '/api/daily-cashbook/:id',
  authMiddleware,
  requireRole('owner', 'supervisor'),
  async (req, res) => {
    try {
      const id = Number(req.params.id);
      if (!id) return res.status(400).json({ message: 'ID tidak valid' });
      const { included_in_total } = req.body || {};
      if (included_in_total === undefined) {
        return res.status(400).json({ message: 'included_in_total wajib' });
      }
      const inc =
        included_in_total === false || included_in_total === 0 || included_in_total === '0'
          ? 0
          : 1;
      await pool.query('UPDATE daily_cashbook_entries SET included_in_total = ? WHERE id = ?', [
        inc,
        id,
      ]);
      const [rows] = await pool.query('SELECT * FROM daily_cashbook_entries WHERE id = ?', [id]);
      if (!rows[0]) return res.status(404).json({ message: 'Entri tidak ditemukan' });
      res.json(cashbookRowOut(rows[0]));
    } catch (e) {
      console.error(e);
      res.status(500).json({ message: 'Server error' });
    }
  }
);

app.delete(
  '/api/daily-cashbook/:id',
  authMiddleware,
  requireRole('owner', 'supervisor'),
  async (req, res) => {
    try {
      const id = Number(req.params.id);
      const [r] = await pool.query('DELETE FROM daily_cashbook_entries WHERE id = ?', [id]);
      if (r.affectedRows === 0) return res.status(404).json({ message: 'Entri tidak ditemukan' });
      res.json({ ok: true });
    } catch (e) {
      console.error(e);
      res.status(500).json({ message: 'Server error' });
    }
  }
);

// --- Dashboard ringkas ---
app.get('/api/dashboard/summary', authMiddleware, async (req, res) => {
  try {
    const { role, sub } = req.user;
    if (isManager(role)) {
      const [[o]] = await pool.query('SELECT COUNT(*) AS total FROM orders');
      const pending = await pool.query(
        "SELECT COUNT(*) AS c FROM workflow_steps WHERE status = 'pending'"
      );
      const progress = await pool.query(
        "SELECT COUNT(*) AS c FROM workflow_steps WHERE status = 'progress'"
      );
      const done = await pool.query(
        "SELECT COUNT(*) AS c FROM workflow_steps WHERE status = 'done'"
      );
      res.json({
        totalOrders: o.total,
        steps: {
          pending: pending[0][0]?.c ?? 0,
          progress: progress[0][0]?.c ?? 0,
          done: done[0][0]?.c ?? 0,
        },
      });
    } else {
      const [mine] = await pool.query(
        `SELECT status, COUNT(*) AS c FROM workflow_steps WHERE assigned_worker_id = ? GROUP BY status`,
        [sub]
      );
      const map = { pending: 0, progress: 0, done: 0 };
      for (const row of mine) map[row.status] = row.c;
      res.json({ mySteps: map });
    }
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Server error' });
  }
});

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ message: err.message || 'Server error' });
});

app.listen(PORT, () => {
  console.log(`API http://localhost:${PORT}`);
});
