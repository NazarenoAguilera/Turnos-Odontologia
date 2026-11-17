import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { DatabaseSync } from 'node:sqlite';
import { abrirBase } from '../../src/infrastructure/sqlite/conexion.js';
import { cargarSeedFicticio, SEED } from '../../src/infrastructure/sqlite/seed.js';
import {
  buscarTurnosQuePodrianChocar,
  insertarEventoAuditoria,
  insertarTurno,
  obtenerPrestacion,
  obtenerRecurso,
} from '../../src/infrastructure/sqlite/repositorios.js';

let db: DatabaseSync;
beforeEach(() => { db = abrirBase(':memory:'); cargarSeedFicticio(db); });
afterEach(() => { db.close(); });

const { ana, bruno } = SEED.profesionales;
const { sillon1, sillon2 } = SEED.sillones;

function nuevoTurno(profesionalId: number, sillonId: number, inicioMin: number, finMin: number, estado = 'reservado') {
  return insertarTurno(db, {
    pacienteId: SEED.pacientes.uno, profesionalId, sillonId, prestacionId: SEED.prestaciones.limpieza,
    inicioMin, finMin, duracionMin: finMin - inicioMin, estado: estado as 'reservado', creadoEn: '2026-11-17T00:00:00Z',
  });
}

describe('repositorios SQLite', () => {
  it('obtiene recursos con su estado activo y devuelve undefined si no existen', () => {
    expect(obtenerRecurso(db, 'profesional', ana)).toEqual({ id: ana, activo: true });
    expect(obtenerRecurso(db, 'sillon', 999)).toBeUndefined();
  });

  it('obtiene la prestación con su duración', () => {
    expect(obtenerPrestacion(db, SEED.prestaciones.limpieza)).toEqual({
      id: SEED.prestaciones.limpieza, activo: true, duracionMin: 30,
    });
  });

  it('inserta un turno y devuelve su id', () => {
    const id = nuevoTurno(ana, sillon1, 600, 630);
    expect(id).toBeGreaterThan(0);
  });

  it('trae candidatos no cancelados del mismo profesional o del mismo sillón que se superponen', () => {
    const t1 = nuevoTurno(ana, sillon1, 600, 630);
    const t2 = nuevoTurno(bruno, sillon2, 615, 645);
    nuevoTurno(bruno, sillon2, 630, 660, 'cancelado');
    nuevoTurno(bruno, sillon2, 700, 730);
    const candidatos = buscarTurnosQuePodrianChocar(db, {
      profesionalId: ana, sillonId: sillon2, inicioMin: 610, finMin: 640,
    });
    expect(candidatos.map((c) => c.id).sort()).toEqual([t1, t2].sort());
  });

  it('no trae turnos contiguos', () => {
    nuevoTurno(ana, sillon1, 600, 630);
    expect(buscarTurnosQuePodrianChocar(db, {
      profesionalId: ana, sillonId: sillon1, inicioMin: 630, finMin: 660,
    })).toEqual([]);
  });

  it('inserta eventos de auditoría que no se pueden modificar ni borrar', () => {
    const turnoId = nuevoTurno(ana, sillon1, 600, 630);
    insertarEventoAuditoria(db, { turnoId, accion: 'creado', ocurridoEn: '2026-11-17T00:00:00Z', despues: { turnoId } });
    expect(() => db.prepare("UPDATE evento_auditoria SET accion = 'cancelado'").run()).toThrow();
    expect(() => db.prepare('DELETE FROM evento_auditoria').run()).toThrow();
  });
});
