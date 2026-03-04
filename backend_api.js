// ============================================================
//  CiudadAlerta — Backend API  (Node.js + Express + MySQL)
//  Desplegar en Railway junto con MySQL plugin
// ============================================================
//  npm install express mysql2 bcryptjs jsonwebtoken cors dotenv multer
// ============================================================

require('dotenv').config();
const express   = require('express');
const mysql     = require('mysql2/promise');
const bcrypt    = require('bcryptjs');
const jwt       = require('jsonwebtoken');
const cors      = require('cors');
const multer    = require('multer');
const path      = require('path');
const fs        = require('fs');

const app  = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'ciudadalerta_secret_2025';

// ── Middleware ────────────────────────────────────────────
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static('uploads'));

// Servir el frontend (ciudadalerta.html)
app.use(express.static(path.join(__dirname, 'public')));

// ── Base de datos ─────────────────────────────────────────
const pool = mysql.createPool({
  host:     process.env.MYSQLHOST     || 'localhost',
  port:     process.env.MYSQLPORT     || 3306,
  user:     process.env.MYSQLUSER     || 'root',
  password: process.env.MYSQLPASSWORD || '',
  database: process.env.MYSQLDATABASE || 'ciudadalerta',
  waitForConnections: true,
  connectionLimit:    10,
});

// ── Auto-crear tablas al arrancar ────────────────────────
async function initDB() {
  try {
    const conn = await pool.getConnection();
    console.log('✅ Conectado a MySQL');

    await conn.execute(`
      CREATE TABLE IF NOT EXISTS usuarios (
        id_usuario INT AUTO_INCREMENT PRIMARY KEY,
        nombre VARCHAR(100) NOT NULL,
        apellido VARCHAR(100) NOT NULL DEFAULT '',
        email VARCHAR(150) NOT NULL UNIQUE,
        contrasena VARCHAR(255) NOT NULL,
        telefono VARCHAR(20),
        rol VARCHAR(50) NOT NULL DEFAULT 'ciudadano',
        fecha_registro DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        estado VARCHAR(20) NOT NULL DEFAULT 'activo'
      ) CHARACTER SET utf8mb4
    `);

    await conn.execute(`
      CREATE TABLE IF NOT EXISTS categorias (
        id_categoria INT AUTO_INCREMENT PRIMARY KEY,
        nombre_categoria VARCHAR(100) NOT NULL,
        descripcion TEXT
      ) CHARACTER SET utf8mb4
    `);

    await conn.execute(`
      CREATE TABLE IF NOT EXISTS prioridades (
        id_prioridad INT AUTO_INCREMENT PRIMARY KEY,
        nombre VARCHAR(50) NOT NULL,
        descripcion TEXT
      ) CHARACTER SET utf8mb4
    `);

    await conn.execute(`
      CREATE TABLE IF NOT EXISTS entidades_responsables (
        id_entidad INT AUTO_INCREMENT PRIMARY KEY,
        nombre_entidad VARCHAR(150) NOT NULL,
        telefono VARCHAR(20),
        email VARCHAR(150),
        direccion VARCHAR(255)
      ) CHARACTER SET utf8mb4
    `);

    await conn.execute(`
      CREATE TABLE IF NOT EXISTS reportes (
        id_reporte INT AUTO_INCREMENT PRIMARY KEY,
        titulo VARCHAR(150),
        descripcion TEXT,
        fecha_reporte DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        estado VARCHAR(50) NOT NULL DEFAULT 'pendiente',
        latitud DECIMAL(10,8) NOT NULL,
        longitud DECIMAL(11,8) NOT NULL,
        direccion VARCHAR(255),
        id_usuario INT NOT NULL,
        id_categoria INT NOT NULL DEFAULT 8,
        id_prioridad INT NOT NULL DEFAULT 2,
        confirmaciones INT NOT NULL DEFAULT 1,
        FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario),
        FOREIGN KEY (id_categoria) REFERENCES categorias(id_categoria),
        FOREIGN KEY (id_prioridad) REFERENCES prioridades(id_prioridad)
      ) CHARACTER SET utf8mb4
    `);

    await conn.execute(`
      CREATE TABLE IF NOT EXISTS fotos (
        id_foto INT AUTO_INCREMENT PRIMARY KEY,
        url_imagen VARCHAR(255) NOT NULL,
        fecha_subida DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        id_reporte INT NOT NULL,
        FOREIGN KEY (id_reporte) REFERENCES reportes(id_reporte) ON DELETE CASCADE
      ) CHARACTER SET utf8mb4
    `);

    await conn.execute(`
      CREATE TABLE IF NOT EXISTS asignaciones (
        id_asignacion INT AUTO_INCREMENT PRIMARY KEY,
        fecha_asignacion DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        id_reporte INT NOT NULL,
        id_entidad INT NOT NULL,
        FOREIGN KEY (id_reporte) REFERENCES reportes(id_reporte) ON DELETE CASCADE,
        FOREIGN KEY (id_entidad) REFERENCES entidades_responsables(id_entidad)
      ) CHARACTER SET utf8mb4
    `);

    await conn.execute(`
      CREATE TABLE IF NOT EXISTS comentarios (
        id_comentario INT AUTO_INCREMENT PRIMARY KEY,
        contenido TEXT NOT NULL,
        fecha_comentario DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        id_usuario INT NOT NULL,
        id_reporte INT NOT NULL,
        FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario),
        FOREIGN KEY (id_reporte) REFERENCES reportes(id_reporte) ON DELETE CASCADE
      ) CHARACTER SET utf8mb4
    `);

    // Insertar datos base si no existen
    await conn.execute(`INSERT IGNORE INTO categorias VALUES
      (1,'Bache','Huecos en el pavimento'),
      (2,'Alumbrado','Fallas en alumbrado público'),
      (3,'Derrumbe','Deslizamiento de tierra'),
      (4,'Inundación','Acumulación de agua'),
      (5,'Árbol caído','Árbol caído en vía'),
      (6,'Semáforo','Semáforo dañado'),
      (7,'Basura','Acumulación de basura'),
      (8,'Otro','Otro tipo de daño')`);

    await conn.execute(`INSERT IGNORE INTO prioridades VALUES
      (1,'Bajo','Daño menor'),
      (2,'Medio','Daño moderado'),
      (3,'Alto','Daño grave urgente')`);

    await conn.execute(`INSERT IGNORE INTO entidades_responsables (id_entidad, nombre_entidad, email) VALUES
      (1,'IDU — Instituto de Desarrollo Urbano','contacto@idu.gov.co'),
      (2,'ENEL Codensa — Alumbrado Público','servicios@codensa.com.co'),
      (3,'IDIGER — Gestión del Riesgo','info@idiger.gov.co'),
      (4,'EAAB — Acueducto Bogotá','contacto@acueducto.com.co'),
      (5,'Jardín Botánico de Bogotá','info@jbb.gov.co'),
      (6,'SDM — Secretaría de Movilidad','contacto@movilidadbogota.gov.co'),
      (7,'UAESP — Servicios Públicos','info@uaesp.gov.co'),
      (8,'Alcaldía Mayor de Bogotá','info@bogota.gov.co'),
      (9,'EPM — Empresas Públicas Medellín','servicios@epm.com.co'),
      (10,'EMCALI','servicios@emcali.net.co'),
      (11,'Triple A — Barranquilla','servicios@aaa.com.co'),
      (12,'EMAB — Aseo Bucaramanga','info@emab.gov.co'),
      (13,'Aguas de Cartagena — ACUACAR','servicios@acuacar.com'),
      (14,'Alcaldía Municipal','alcaldia@municipio.gov.co')`);

    conn.release();
    console.log('✅ Tablas listas');
  } catch (err) {
    console.error('❌ Error iniciando DB:', err.message);
  }
}

// ── Multer (fotos) ────────────────────────────────────────
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = 'uploads/fotos';
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${Math.round(Math.random()*1e6)}${path.extname(file.originalname)}`);
  }
});
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });

// ── Auth Middleware ───────────────────────────────────────
function authRequired(req, res, next) {
  const header = req.headers.authorization;
  if (!header) return res.status(401).json({ error: 'Token requerido' });
  const token = header.split(' ')[1];
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Token inválido o expirado' });
  }
}

// ============================================================
//  AUTH ROUTES
// ============================================================

// POST /api/auth/registro
app.post('/api/auth/registro', async (req, res) => {
  const { nombre, apellido, email, contrasena, telefono } = req.body;
  if (!nombre || !email || !contrasena)
    return res.status(400).json({ error: 'Nombre, email y contraseña son obligatorios' });

  try {
    const hash = await bcrypt.hash(contrasena, 12);
    const [result] = await pool.execute(
      'INSERT INTO usuarios (nombre, apellido, email, contrasena, telefono) VALUES (?,?,?,?,?)',
      [nombre, apellido || '', email, hash, telefono || null]
    );
    const token = jwt.sign(
      { id: result.insertId, email, nombre, rol: 'ciudadano' },
      JWT_SECRET, { expiresIn: '7d' }
    );
    res.json({ token, usuario: { id: result.insertId, nombre, email, rol: 'ciudadano' } });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY')
      return res.status(409).json({ error: 'El email ya está registrado' });
    console.error(err);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// POST /api/auth/login
app.post('/api/auth/login', async (req, res) => {
  const { email, contrasena } = req.body;
  if (!email || !contrasena)
    return res.status(400).json({ error: 'Email y contraseña requeridos' });

  try {
    const [rows] = await pool.execute(
      'SELECT * FROM usuarios WHERE email = ? AND estado = "activo"', [email]
    );
    if (!rows.length) return res.status(401).json({ error: 'Credenciales incorrectas' });

    const user = rows[0];
    const match = await bcrypt.compare(contrasena, user.contrasena);
    if (!match) return res.status(401).json({ error: 'Credenciales incorrectas' });

    const token = jwt.sign(
      { id: user.id_usuario, email: user.email, nombre: user.nombre, rol: user.rol },
      JWT_SECRET, { expiresIn: '7d' }
    );
    res.json({ token, usuario: { id: user.id_usuario, nombre: user.nombre, email: user.email, rol: user.rol } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// GET /api/auth/perfil
app.get('/api/auth/perfil', authRequired, async (req, res) => {
  const [rows] = await pool.execute(
    'SELECT id_usuario, nombre, apellido, email, telefono, rol, fecha_registro FROM usuarios WHERE id_usuario = ?',
    [req.user.id]
  );
  if (!rows.length) return res.status(404).json({ error: 'Usuario no encontrado' });
  res.json(rows[0]);
});

// ============================================================
//  REPORTES ROUTES
// ============================================================

// GET /api/reportes  — todos (con filtros opcionales)
app.get('/api/reportes', async (req, res) => {
  const { categoria, estado, limite = 100 } = req.query;
  let sql = `
    SELECT r.*, u.nombre AS usuario_nombre,
           c.nombre_categoria AS categoria_nombre,
           p.nombre AS prioridad_nombre,
           (SELECT url_imagen FROM fotos WHERE id_reporte = r.id_reporte LIMIT 1) AS foto_url
    FROM reportes r
    JOIN usuarios u ON r.id_usuario = u.id_usuario
    JOIN categorias c ON r.id_categoria = c.id_categoria
    JOIN prioridades p ON r.id_prioridad = p.id_prioridad
    WHERE 1=1
  `;
  const params = [];
  if (categoria) { sql += ' AND r.id_categoria = ?'; params.push(categoria); }
  if (estado)    { sql += ' AND r.estado = ?';       params.push(estado); }
  sql += ' ORDER BY r.fecha_reporte DESC LIMIT ?';
  params.push(parseInt(limite));

  try {
    const [rows] = await pool.execute(sql, params);
    res.json(rows);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Error al obtener reportes' }); }
});

// GET /api/reportes/:id
app.get('/api/reportes/:id', async (req, res) => {
  try {
    const [rows] = await pool.execute(`
      SELECT r.*, u.nombre AS usuario_nombre,
             c.nombre_categoria, p.nombre AS prioridad_nombre
      FROM reportes r
      JOIN usuarios u ON r.id_usuario = u.id_usuario
      JOIN categorias c ON r.id_categoria = c.id_categoria
      JOIN prioridades p ON r.id_prioridad = p.id_prioridad
      WHERE r.id_reporte = ?`, [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Reporte no encontrado' });

    const [fotos] = await pool.execute('SELECT * FROM fotos WHERE id_reporte = ?', [req.params.id]);
    const [asignaciones] = await pool.execute(`
      SELECT a.*, e.nombre_entidad FROM asignaciones a
      JOIN entidades_responsables e ON a.id_entidad = e.id_entidad
      WHERE a.id_reporte = ?`, [req.params.id]);

    res.json({ ...rows[0], fotos, asignaciones });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Error del servidor' }); }
});

// POST /api/reportes  — crear reporte
app.post('/api/reportes', authRequired, async (req, res) => {
  const { titulo, descripcion, latitud, longitud, direccion, id_categoria, id_prioridad, id_entidad } = req.body;
  if (!latitud || !longitud || !id_categoria)
    return res.status(400).json({ error: 'Latitud, longitud y categoría son requeridos' });

  try {
    const [result] = await pool.execute(
      `INSERT INTO reportes (titulo, descripcion, latitud, longitud, direccion, id_usuario, id_categoria, id_prioridad)
       VALUES (?,?,?,?,?,?,?,?)`,
      [titulo || null, descripcion || null, latitud, longitud, direccion || null,
       req.user.id, id_categoria, id_prioridad || 2]
    );
    const reporteId = result.insertId;

    // Asignar entidad responsable automáticamente
    if (id_entidad) {
      await pool.execute(
        'INSERT INTO asignaciones (id_reporte, id_entidad) VALUES (?,?)',
        [reporteId, id_entidad]
      );
    }
    res.json({ id_reporte: reporteId, mensaje: 'Reporte creado exitosamente' });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Error al crear reporte' }); }
});

// POST /api/reportes/:id/foto  — subir foto
app.post('/api/reportes/:id/foto', authRequired, upload.single('foto'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No se envió ninguna foto' });
  const url = `/uploads/fotos/${req.file.filename}`;
  try {
    await pool.execute('INSERT INTO fotos (url_imagen, id_reporte) VALUES (?,?)', [url, req.params.id]);
    res.json({ url });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Error al guardar foto' }); }
});

// PATCH /api/reportes/:id/confirmar
app.patch('/api/reportes/:id/confirmar', authRequired, async (req, res) => {
  try {
    await pool.execute(
      'UPDATE reportes SET confirmaciones = confirmaciones + 1 WHERE id_reporte = ?',
      [req.params.id]
    );
    res.json({ mensaje: 'Confirmación registrada' });
  } catch (err) { res.status(500).json({ error: 'Error al confirmar' }); }
});

// ============================================================
//  CATEGORÍAS
// ============================================================
app.get('/api/categorias', async (req, res) => {
  const [rows] = await pool.execute('SELECT * FROM categorias');
  res.json(rows);
});

// ============================================================
//  HEALTH CHECK (Railway lo usa)
// ============================================================
app.get('/health', (req, res) => res.json({ status: 'ok', time: new Date() }));

// Fallback → servir frontend
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

initDB().then(() => {
  app.listen(PORT, () => console.log(`CiudadAlerta API corriendo en puerto ${PORT}`));
});
