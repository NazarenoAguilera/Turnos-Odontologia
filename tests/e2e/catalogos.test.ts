// Tests e2e de los GET de catálogos: un test por escenario de
// openspec/changes/interfaz-web-base/specs/catalogos/spec.md (los títulos coinciden
// con los nombres de los escenarios). Datos 100 % ficticios.
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { DatabaseSync } from 'node:sqlite';
import type { FastifyInstance } from 'fastify';
import { abrirBase } from '../../src/infrastructure/sqlite/conexion.js';
import { cargarSeedFicticio, SEED } from '../../src/infrastructure/sqlite/seed.js';
import { construirApp } from '../../src/http/app.js';

let db: DatabaseSync;
let app: FastifyInstance;

beforeEach(async () => {
  db = abrirBase(':memory:');
  cargarSeedFicticio(db);
  app = construirApp({ db });
  await app.ready();
});
afterEach(async () => {
  await app.close();
  db.close();
});

// Sentencias fijas y parametrizadas para preparar los escenarios (sin SQL concatenado).
const desactivarProfesional = (id: number) => db.prepare('UPDATE profesional SET activo = 0 WHERE id = ?').run(id);
const desactivarSillon = (id: number) => db.prepare('UPDATE sillon SET activo = 0 WHERE id = ?').run(id);
const desactivarPrestacion = (id: number) => db.prepare('UPDATE prestacion SET activa = 0 WHERE id = ?').run(id);

const get = (url: string) => app.inject({ method: 'GET', url });

describe('GET /profesionales', () => {
  it('Profesionales del seed', async () => {
    const r = await get('/profesionales');
    expect(r.statusCode).toBe(200);
    expect(r.json()).toEqual([
      { id: SEED.profesionales.bruno, nombre: 'Dr. Bruno Ejemplo' },
      { id: SEED.profesionales.ana, nombre: 'Dra. Ana Prueba' },
      { id: SEED.profesionales.carla, nombre: 'Dra. Carla Demo' },
    ]);
    for (const p of r.json() as Array<Record<string, unknown>>) {
      expect(p).not.toHaveProperty('matricula');
      expect(p).not.toHaveProperty('activo');
    }
  });

  it('Profesional inactivo excluido', async () => {
    desactivarProfesional(SEED.profesionales.carla);
    const r = await get('/profesionales');
    expect(r.statusCode).toBe(200);
    expect((r.json() as Array<{ nombre: string }>).map((p) => p.nombre)).toEqual(['Dr. Bruno Ejemplo', 'Dra. Ana Prueba']);
  });

  it('Sin profesionales activos', async () => {
    for (const id of Object.values(SEED.profesionales)) desactivarProfesional(id);
    const r = await get('/profesionales');
    expect(r.statusCode).toBe(200);
    expect(r.json()).toEqual([]);
  });
});

describe('GET /sillones', () => {
  it('Sillones del seed', async () => {
    const r = await get('/sillones');
    expect(r.statusCode).toBe(200);
    expect((r.json() as Array<{ nombre: string }>).map((s) => s.nombre)).toEqual(['Box 3', 'Sillón 1', 'Sillón 2']);
  });

  it('Sillón inactivo excluido', async () => {
    desactivarSillon(SEED.sillones.sillon2);
    const r = await get('/sillones');
    expect(r.statusCode).toBe(200);
    expect(r.json()).toEqual([
      { id: SEED.sillones.box3, nombre: 'Box 3' },
      { id: SEED.sillones.sillon1, nombre: 'Sillón 1' },
    ]);
  });
});

describe('GET /prestaciones', () => {
  it('Prestaciones del seed con duración', async () => {
    const r = await get('/prestaciones');
    expect(r.statusCode).toBe(200);
    const prestaciones = r.json() as Array<{ id: number; nombre: string; duracionMin: number }>;
    expect(prestaciones.map((p) => p.nombre)).toEqual(['Consulta', 'Endodoncia', 'Extracción simple', 'Limpieza']);
    expect(prestaciones.find((p) => p.nombre === 'Limpieza')).toEqual({
      id: SEED.prestaciones.limpieza, nombre: 'Limpieza', duracionMin: 30,
    });
    expect(prestaciones.find((p) => p.nombre === 'Endodoncia')?.duracionMin).toBe(90);
  });

  it('Prestación inactiva excluida', async () => {
    desactivarPrestacion(SEED.prestaciones.endodoncia);
    const r = await get('/prestaciones');
    expect(r.statusCode).toBe(200);
    expect((r.json() as Array<{ nombre: string }>).map((p) => p.nombre)).toEqual(['Consulta', 'Extracción simple', 'Limpieza']);
  });
});

describe('GET /pacientes', () => {
  it('Pacientes del seed', async () => {
    const r = await get('/pacientes');
    expect(r.statusCode).toBe(200);
    expect(r.json()).toEqual([
      { id: SEED.pacientes.dos, nombre: 'Paciente', apellido: 'Ficticio Dos' },
      { id: SEED.pacientes.tres, nombre: 'Paciente', apellido: 'Ficticio Tres' },
      { id: SEED.pacientes.uno, nombre: 'Paciente', apellido: 'Ficticio Uno' },
    ]);
  });

  it('Sin datos de contacto en la respuesta', async () => {
    const r = await get('/pacientes');
    expect(r.statusCode).toBe(200);
    for (const p of r.json() as Array<Record<string, unknown>>) {
      expect(p).not.toHaveProperty('telefono');
      expect(p).not.toHaveProperty('email');
      expect(p).not.toHaveProperty('obraSocial');
      expect(p).not.toHaveProperty('obra_social');
    }
    expect(r.body).not.toContain('0000-0001');
  });
});
