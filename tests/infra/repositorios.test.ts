import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { DatabaseSync } from 'node:sqlite';
import { abrirBase } from '../../src/infrastructure/sqlite/conexion.js';
import { cargarSeedFicticio, SEED } from '../../src/infrastructure/sqlite/seed.js';
import {
  buscarTurnosQuePodrianChocar,
  insertarEventoAuditoria,
  insertarTurno,
  listarPacientes,
  listarPrestacionesActivas,
  listarProfesionalesActivos,
  listarSillonesActivos,
  listarTurnosEnRango,
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

  describe('listados de catálogos', () => {
    const SQL_DESACTIVAR = {
      profesional: 'UPDATE profesional SET activo = 0 WHERE id = ?',
      sillon: 'UPDATE sillon SET activo = 0 WHERE id = ?',
    } as const;
    const desactivar = (tabla: keyof typeof SQL_DESACTIVAR, id: number) => db.prepare(SQL_DESACTIVAR[tabla]).run(id);

    it('lista profesionales activos con id y nombre, ordenados por nombre', () => {
      expect(listarProfesionalesActivos(db)).toEqual([
        { id: bruno, nombre: 'Dr. Bruno Ejemplo' },
        { id: ana, nombre: 'Dra. Ana Prueba' },
        { id: SEED.profesionales.carla, nombre: 'Dra. Carla Demo' },
      ]);
    });

    it('excluye profesionales inactivos', () => {
      desactivar('profesional', SEED.profesionales.carla);
      expect(listarProfesionalesActivos(db).map((p) => p.nombre)).toEqual(['Dr. Bruno Ejemplo', 'Dra. Ana Prueba']);
    });

    it('lista sillones activos ordenados por nombre y excluye los inactivos', () => {
      expect(listarSillonesActivos(db).map((s) => s.nombre)).toEqual(['Box 3', 'Sillón 1', 'Sillón 2']);
      desactivar('sillon', sillon2);
      expect(listarSillonesActivos(db)).toEqual([
        { id: SEED.sillones.box3, nombre: 'Box 3' },
        { id: sillon1, nombre: 'Sillón 1' },
      ]);
    });

    it('lista prestaciones activas con duracionMin y excluye las inactivas', () => {
      expect(listarPrestacionesActivas(db)).toEqual([
        { id: SEED.prestaciones.consulta, nombre: 'Consulta', duracionMin: 15 },
        { id: SEED.prestaciones.endodoncia, nombre: 'Endodoncia', duracionMin: 90 },
        { id: SEED.prestaciones.extraccion, nombre: 'Extracción simple', duracionMin: 45 },
        { id: SEED.prestaciones.limpieza, nombre: 'Limpieza', duracionMin: 30 },
      ]);
      db.prepare('UPDATE prestacion SET activa = 0 WHERE id = ?').run(SEED.prestaciones.endodoncia);
      expect(listarPrestacionesActivas(db).map((p) => p.nombre)).toEqual(['Consulta', 'Extracción simple', 'Limpieza']);
    });

    it('lista pacientes ordenados por apellido y nombre, sin datos de contacto', () => {
      expect(listarPacientes(db)).toEqual([
        { id: SEED.pacientes.dos, nombre: 'Paciente', apellido: 'Ficticio Dos' },
        { id: SEED.pacientes.tres, nombre: 'Paciente', apellido: 'Ficticio Tres' },
        { id: SEED.pacientes.uno, nombre: 'Paciente', apellido: 'Ficticio Uno' },
      ]);
    });
  });

  it('inserta eventos de auditoría que no se pueden modificar ni borrar', () => {
    const turnoId = nuevoTurno(ana, sillon1, 600, 630);
    insertarEventoAuditoria(db, { turnoId, accion: 'creado', ocurridoEn: '2026-11-17T00:00:00Z', despues: { turnoId } });
    expect(() => db.prepare("UPDATE evento_auditoria SET accion = 'cancelado'").run()).toThrow();
    expect(() => db.prepare('DELETE FROM evento_auditoria').run()).toThrow();
  });

  it('lista turnos en rango con nombres de recursos, ordenados por inicio e id, y con filtros opcionales', () => {
    const tTarde = nuevoTurno(bruno, sillon2, 660, 690);
    const tManana = nuevoTurno(ana, sillon1, 600, 630);
    const tCancelado = nuevoTurno(ana, sillon1, 630, 660, 'cancelado');

    const todosActivos = listarTurnosEnRango(db, { desdeMin: 600, hastaMin: 720, incluirCancelados: false });
    expect(todosActivos.map((t) => t.id)).toEqual([tManana, tTarde]);
    expect(todosActivos[0]).toMatchObject({
      pacienteNombre: 'Paciente',
      pacienteApellido: 'Ficticio Uno',
      profesionalNombre: 'Dra. Ana Prueba',
      sillonNombre: 'Sillón 1',
      prestacionNombre: 'Limpieza',
    });

    const soloAnaConCancelados = listarTurnosEnRango(db, {
      desdeMin: 600,
      hastaMin: 720,
      profesionalId: ana,
      incluirCancelados: true,
    });
    expect(soloAnaConCancelados.map((t) => t.id)).toEqual([tManana, tCancelado]);

    const soloSillon2 = listarTurnosEnRango(db, {
      desdeMin: 600,
      hastaMin: 720,
      sillonId: sillon2,
      incluirCancelados: false,
    });
    expect(soloSillon2.map((t) => t.id)).toEqual([tTarde]);
  });
});
