import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { DatabaseSync } from 'node:sqlite';
import { abrirBase } from '../../src/infrastructure/sqlite/conexion.js';
import { cargarSeedFicticio, SEED } from '../../src/infrastructure/sqlite/seed.js';

let db: DatabaseSync;
beforeEach(() => { db = abrirBase(':memory:'); cargarSeedFicticio(db); });
afterEach(() => { db.close(); });

const contar = (tabla: string) =>
  (db.prepare(`SELECT COUNT(*) AS n FROM ${tabla}`).get() as { n: number }).n;

describe('seed ficticio', () => {
  it('carga 3 profesionales, 3 sillones, 4 prestaciones y 3 pacientes', () => {
    expect([contar('profesional'), contar('sillon'), contar('prestacion'), contar('paciente')])
      .toEqual([3, 3, 4, 3]);
  });

  it('expone ids estables para los tests', () => {
    const ana = db.prepare('SELECT nombre FROM profesional WHERE id = ?').get(SEED.profesionales.ana) as { nombre: string };
    const limpieza = db.prepare('SELECT duracion_min FROM prestacion WHERE id = ?').get(SEED.prestaciones.limpieza) as { duracion_min: number };
    expect(ana.nombre).toBe('Dra. Ana Prueba');
    expect(limpieza.duracion_min).toBe(30);
  });

  it('usa solo teléfonos del patrón ficticio +54 9 11 0000-000X (nunca datos reales)', () => {
    const telefonos = (db.prepare('SELECT telefono FROM paciente').all() as Array<{ telefono: string }>)
      .map((p) => p.telefono);
    expect(telefonos.length).toBe(3);
    for (const t of telefonos) expect(t).toMatch(/^\+54 9 11 0000-000\d$/);
  });

  it('nombra a los pacientes de forma evidentemente ficticia', () => {
    const apellidos = (db.prepare("SELECT nombre || ' ' || apellido AS n FROM paciente").all() as Array<{ n: string }>)
      .map((p) => p.n);
    for (const n of apellidos) expect(n).toMatch(/Ficticio/);
  });
});
