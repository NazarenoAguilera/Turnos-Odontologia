import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { DatabaseSync } from 'node:sqlite';
import { abrirBase } from '../../src/infrastructure/sqlite/conexion.js';

let db: DatabaseSync;
beforeEach(() => { db = abrirBase(':memory:'); });
afterEach(() => { db.close(); });

describe('esquema SQLite', () => {
  it('crea las 6 tablas del change', () => {
    const tablas = (db.prepare(
      "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name",
    ).all() as Array<{ name: string }>).map((t) => t.name);
    expect(tablas).toEqual(['evento_auditoria', 'paciente', 'prestacion', 'profesional', 'sillon', 'turno']);
  });

  it('rechaza una prestación de 20 minutos por el CHECK de duración', () => {
    expect(() =>
      db.prepare('INSERT INTO prestacion (nombre, duracion_min) VALUES (?, ?)').run('Prueba 20', 20),
    ).toThrow();
  });

  it('acepta una prestación de 45 minutos', () => {
    expect(() =>
      db.prepare('INSERT INTO prestacion (nombre, duracion_min) VALUES (?, ?)').run('Prueba 45', 45),
    ).not.toThrow();
  });

  it('exige sillón en todo turno (sillon_id NOT NULL) y claves foráneas activas', () => {
    expect(() =>
      db.prepare(
        `INSERT INTO turno (paciente_id, profesional_id, sillon_id, prestacion_id, inicio_min, fin_min,
           duracion_min, estado, creado_en, actualizado_en)
         VALUES (1, 1, NULL, 1, 100, 130, 30, 'reservado', 'x', 'x')`,
      ).run(),
    ).toThrow();
    const fk = db.prepare('PRAGMA foreign_keys').get() as { foreign_keys: number };
    expect(fk.foreign_keys).toBe(1);
  });

  it('configura busy_timeout para esperar locks en lugar de fallar', () => {
    const fila = db.prepare('PRAGMA busy_timeout').get() as Record<string, number>;
    expect(Object.values(fila)[0]).toBeGreaterThan(0);
  });
});
