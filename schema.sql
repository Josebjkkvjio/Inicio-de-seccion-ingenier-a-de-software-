-- ============================================================
--  CiudadAlerta — Base de datos MySQL (Railway)
-- ============================================================

CREATE DATABASE IF NOT EXISTS ciudadalerta CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE ciudadalerta;

-- -------------------------------------------------------
-- USUARIOS
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS usuarios (
  id_usuario      INT AUTO_INCREMENT PRIMARY KEY,
  nombre          VARCHAR(100) NOT NULL,
  apellido        VARCHAR(100) NOT NULL,
  email           VARCHAR(150) NOT NULL UNIQUE,
  contrasena      VARCHAR(255) NOT NULL,   -- bcrypt hash
  telefono        VARCHAR(20),
  rol             VARCHAR(50)  NOT NULL DEFAULT 'ciudadano',  -- ciudadano | admin
  fecha_registro  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  estado          VARCHAR(20)  NOT NULL DEFAULT 'activo'       -- activo | inactivo
);

-- -------------------------------------------------------
-- CATEGORÍAS  (coincide con TIPOS del frontend)
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS categorias (
  id_categoria     INT AUTO_INCREMENT PRIMARY KEY,
  nombre_categoria VARCHAR(100) NOT NULL,
  descripcion      TEXT
);

INSERT IGNORE INTO categorias (id_categoria, nombre_categoria, descripcion) VALUES
  (1,  'Bache',       'Huecos o daños en el pavimento'),
  (2,  'Alumbrado',   'Fallas en el alumbrado público'),
  (3,  'Derrumbe',    'Deslizamiento o derrumbe de tierra'),
  (4,  'Inundación',  'Acumulación de agua en vías o predios'),
  (5,  'Árbol caído', 'Árbol caído sobre vía o edificio'),
  (6,  'Semáforo',    'Semáforo dañado o sin funcionar'),
  (7,  'Basura',      'Acumulación ilegal de basura'),
  (8,  'Otro',        'Otro tipo de daño urbano');

-- -------------------------------------------------------
-- PRIORIDADES
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS prioridades (
  id_prioridad INT AUTO_INCREMENT PRIMARY KEY,
  nombre       VARCHAR(50) NOT NULL,
  descripcion  TEXT
);

INSERT IGNORE INTO prioridades (id_prioridad, nombre, descripcion) VALUES
  (1, 'Bajo',  'Daño menor, no urgente'),
  (2, 'Medio', 'Daño moderado, atención en días'),
  (3, 'Alto',  'Daño grave, atención inmediata');

-- -------------------------------------------------------
-- ENTIDADES RESPONSABLES
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS entidades_responsables (
  id_entidad    INT AUTO_INCREMENT PRIMARY KEY,
  nombre_entidad VARCHAR(150) NOT NULL,
  telefono      VARCHAR(20),
  email         VARCHAR(150),
  direccion     VARCHAR(255)
);

INSERT IGNORE INTO entidades_responsables (id_entidad, nombre_entidad, email) VALUES
  (1,  'IDU — Instituto de Desarrollo Urbano',          'contacto@idu.gov.co'),
  (2,  'ENEL Codensa — Alumbrado Público',              'servicios@codensa.com.co'),
  (3,  'IDIGER — Gestión del Riesgo Bogotá',            'info@idiger.gov.co'),
  (4,  'EAAB — Empresa Acueducto Bogotá',               'contacto@acueducto.com.co'),
  (5,  'Jardín Botánico de Bogotá',                     'info@jbb.gov.co'),
  (6,  'SDM — Secretaría Distrital de Movilidad',       'contacto@movilidadbogota.gov.co'),
  (7,  'UAESP — Unidad de Servicios Públicos',          'info@uaesp.gov.co'),
  (8,  'Alcaldía Mayor de Bogotá',                      'info@bogota.gov.co'),
  (9,  'EPM — Empresas Públicas de Medellín',           'servicios@epm.com.co'),
  (10, 'EMCALI',                                        'servicios@emcali.net.co'),
  (11, 'Triple A — Barranquilla',                       'servicios@aaa.com.co'),
  (12, 'EMAB — Aseo Bucaramanga',                       'info@emab.gov.co'),
  (13, 'Aguas de Cartagena — ACUACAR',                  'servicios@acuacar.com'),
  (14, 'Alcaldía Municipal',                            'alcaldia@municipio.gov.co');

-- -------------------------------------------------------
-- REPORTES
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS reportes (
  id_reporte     INT AUTO_INCREMENT PRIMARY KEY,
  titulo         VARCHAR(150),
  descripcion    TEXT,
  fecha_reporte  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  estado         VARCHAR(50)  NOT NULL DEFAULT 'pendiente',  -- pendiente | en_proceso | resuelto
  latitud        DECIMAL(10,8) NOT NULL,
  longitud       DECIMAL(11,8) NOT NULL,
  direccion      VARCHAR(255),
  id_usuario     INT          NOT NULL,
  id_categoria   INT          NOT NULL,
  id_prioridad   INT          NOT NULL DEFAULT 2,
  confirmaciones INT          NOT NULL DEFAULT 1,
  FOREIGN KEY (id_usuario)   REFERENCES usuarios(id_usuario),
  FOREIGN KEY (id_categoria) REFERENCES categorias(id_categoria),
  FOREIGN KEY (id_prioridad) REFERENCES prioridades(id_prioridad)
);

-- -------------------------------------------------------
-- FOTOS
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS fotos (
  id_foto      INT AUTO_INCREMENT PRIMARY KEY,
  url_imagen   VARCHAR(255) NOT NULL,
  fecha_subida DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  id_reporte   INT          NOT NULL,
  FOREIGN KEY (id_reporte) REFERENCES reportes(id_reporte) ON DELETE CASCADE
);

-- -------------------------------------------------------
-- ASIGNACIONES (reporte → entidad responsable)
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS asignaciones (
  id_asignacion  INT AUTO_INCREMENT PRIMARY KEY,
  fecha_asignacion DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  id_reporte     INT NOT NULL,
  id_entidad     INT NOT NULL,
  FOREIGN KEY (id_reporte) REFERENCES reportes(id_reporte) ON DELETE CASCADE,
  FOREIGN KEY (id_entidad) REFERENCES entidades_responsables(id_entidad)
);

-- -------------------------------------------------------
-- COMENTARIOS
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS comentarios (
  id_comentario   INT AUTO_INCREMENT PRIMARY KEY,
  contenido       TEXT     NOT NULL,
  fecha_comentario DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  id_usuario      INT      NOT NULL,
  id_reporte      INT      NOT NULL,
  FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario),
  FOREIGN KEY (id_reporte) REFERENCES reportes(id_reporte) ON DELETE CASCADE
);

-- -------------------------------------------------------
-- ÍNDICES útiles
-- -------------------------------------------------------
CREATE INDEX idx_reportes_estado    ON reportes(estado);
CREATE INDEX idx_reportes_categoria ON reportes(id_categoria);
CREATE INDEX idx_reportes_usuario   ON reportes(id_usuario);
CREATE INDEX idx_reportes_coords    ON reportes(latitud, longitud);
