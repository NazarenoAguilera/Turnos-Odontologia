import type { DatabaseSync } from 'node:sqlite';

/**
 * Esquema del change crear-turno-sin-solapamientos (design D8).
 * Horarios de atención y bloqueos llegan en C-03.
 */
const ESQUEMA = `
CREATE TABLE IF NOT EXISTS profesional (
  id         INTEGER PRIMARY KEY,
  nombre     TEXT    NOT NULL,
  matricula  TEXT,
  activo     INTEGER NOT NULL DEFAULT 1 CHECK (activo IN (0, 1))
);

CREATE TABLE IF NOT EXISTS sillon (
  id      INTEGER PRIMARY KEY,
  nombre  TEXT    NOT NULL UNIQUE,
  activo  INTEGER NOT NULL DEFAULT 1 CHECK (activo IN (0, 1))
);

CREATE TABLE IF NOT EXISTS prestacion (
  id            INTEGER PRIMARY KEY,
  nombre        TEXT    NOT NULL UNIQUE,
  duracion_min  INTEGER NOT NULL CHECK (duracion_min > 0 AND duracion_min % 15 = 0),
  activa        INTEGER NOT NULL DEFAULT 1 CHECK (activa IN (0, 1))
);

CREATE TABLE IF NOT EXISTS paciente (
  id           INTEGER PRIMARY KEY,
  nombre       TEXT NOT NULL,
  apellido     TEXT NOT NULL,
  telefono     TEXT,
  email        TEXT,
  obra_social  TEXT
);

CREATE TABLE IF NOT EXISTS turno (
  id              INTEGER PRIMARY KEY,
  paciente_id     INTEGER NOT NULL REFERENCES paciente (id),
  profesional_id  INTEGER NOT NULL REFERENCES profesional (id),
  sillon_id       INTEGER NOT NULL REFERENCES sillon (id),
  prestacion_id   INTEGER NOT NULL REFERENCES prestacion (id),
  inicio_min      INTEGER NOT NULL,
  fin_min         INTEGER NOT NULL,
  duracion_min    INTEGER NOT NULL CHECK (duracion_min > 0),
  estado          TEXT    NOT NULL DEFAULT 'reservado'
                  CHECK (estado IN ('reservado', 'confirmado', 'cancelado', 'ausente', 'atendido')),
  creado_en       TEXT    NOT NULL,
  actualizado_en  TEXT    NOT NULL,
  CHECK (fin_min > inicio_min)
);

CREATE INDEX IF NOT EXISTS idx_turno_profesional ON turno (profesional_id, inicio_min, fin_min);
CREATE INDEX IF NOT EXISTS idx_turno_sillon      ON turno (sillon_id, inicio_min, fin_min);
CREATE INDEX IF NOT EXISTS idx_turno_rango       ON turno (inicio_min, fin_min);

CREATE TABLE IF NOT EXISTS evento_auditoria (
  id           INTEGER PRIMARY KEY,
  turno_id     INTEGER NOT NULL REFERENCES turno (id),
  accion       TEXT    NOT NULL CHECK (accion IN ('creado', 'cancelado', 'reprogramado', 'estado_cambiado')),
  usuario_id   INTEGER,
  ocurrido_en  TEXT    NOT NULL,
  antes        TEXT,
  despues      TEXT
);

-- La auditoría es de solo inserción (RN-AU-02).
CREATE TRIGGER IF NOT EXISTS evento_auditoria_sin_update
BEFORE UPDATE ON evento_auditoria
BEGIN SELECT RAISE(ABORT, 'La auditoría es inmutable'); END;

CREATE TRIGGER IF NOT EXISTS evento_auditoria_sin_delete
BEFORE DELETE ON evento_auditoria
BEGIN SELECT RAISE(ABORT, 'La auditoría es inmutable'); END;
`;

export function aplicarEsquema(db: DatabaseSync): void {
  db.exec(ESQUEMA);
}
