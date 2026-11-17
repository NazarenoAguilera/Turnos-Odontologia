import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { DatabaseSync } from 'node:sqlite';
import { abrirBase } from '../../src/infrastructure/sqlite/conexion.js';
import { cargarSeedFicticio, SEED } from '../../src/infrastructure/sqlite/seed.js';
import { crearTurno, type Reloj } from '../../src/application/crear-turno.js';
import { ErrorDeNegocio } from '../../src/domain/errores.js';

const relojFijo: Reloj = { ahora: () => new Date('2026-11-17T12:00:00Z') };

let db: DatabaseSync;
beforeEach(() => { db = abrirBase(':memory:'); cargarSeedFicticio(db); });
afterEach(() => { db.close(); });

const base = {
  pacienteId: SEED.pacientes.uno,
  profesionalId: SEED.profesionales.ana,
  sillonId: SEED.sillones.sillon1,
  prestacionId: SEED.prestaciones.limpieza,
};

const contar = (tabla: string) => (db.prepare(`SELECT COUNT(*) AS n FROM ${tabla}`).get() as { n: number }).n;

function codigoDe(fn: () => unknown): string | undefined {
  try {
    fn();
  } catch (e) {
    if (e instanceof ErrorDeNegocio) return e.codigo;
    throw e;
  }
  return undefined;
}

describe('crearTurno (caso de uso)', () => {
  it('Caso feliz con la duración de la prestación', () => {
    const turno = crearTurno(db, { ...base, inicio: '2026-12-01T10:00:00-03:00' }, relojFijo);
    expect(turno).toMatchObject({
      estado: 'reservado',
      duracionMin: 30,
      inicio: '2026-12-01T10:00:00-03:00',
      fin: '2026-12-01T10:30:00-03:00',
    });
    expect(turno.id).toBeGreaterThan(0);
  });

  it('Duración indicada al crear', () => {
    const turno = crearTurno(db, { ...base, inicio: '2026-12-01T10:00:00-03:00', duracionMin: 45 }, relojFijo);
    expect(turno.fin).toBe('2026-12-01T10:45:00-03:00');
  });

  it('Evento de auditoría al crear', () => {
    const turno = crearTurno(db, { ...base, inicio: '2026-12-01T10:00:00-03:00' }, relojFijo);
    const evento = db.prepare('SELECT accion, ocurrido_en, despues FROM evento_auditoria WHERE turno_id = ?')
      .get(turno.id) as { accion: string; ocurrido_en: string; despues: string };
    expect(evento.accion).toBe('creado');
    expect(evento.ocurrido_en).toBe('2026-11-17T12:00:00.000Z');
    expect(JSON.parse(evento.despues)).toMatchObject({ id: turno.id, estado: 'reservado' });
  });

  it('Rechazo sin efectos', () => {
    crearTurno(db, { ...base, inicio: '2026-12-01T10:00:00-03:00' }, relojFijo);
    const antes = [contar('turno'), contar('evento_auditoria')];
    expect(codigoDe(() =>
      crearTurno(db, { ...base, sillonId: SEED.sillones.sillon2, inicio: '2026-12-01T10:15:00-03:00' }, relojFijo),
    )).toBe('TURNO_SOLAPADO_PROFESIONAL');
    expect([contar('turno'), contar('evento_auditoria')]).toEqual(antes);
  });

  it('rechaza recursos inexistentes con RECURSO_INEXISTENTE', () => {
    expect(codigoDe(() => crearTurno(db, { ...base, profesionalId: 999, inicio: '2026-12-01T10:00:00-03:00' }, relojFijo)))
      .toBe('RECURSO_INEXISTENTE');
    expect(codigoDe(() => crearTurno(db, { ...base, prestacionId: 999, inicio: '2026-12-01T10:00:00-03:00' }, relojFijo)))
      .toBe('RECURSO_INEXISTENTE');
  });

  it('rechaza un sillón inactivo con RECURSO_INACTIVO', () => {
    db.prepare('UPDATE sillon SET activo = 0 WHERE id = ?').run(SEED.sillones.sillon2);
    expect(codigoDe(() =>
      crearTurno(db, { ...base, sillonId: SEED.sillones.sillon2, inicio: '2026-12-01T10:00:00-03:00' }, relojFijo),
    )).toBe('RECURSO_INACTIVO');
  });

  it('valida grilla y duración antes de escribir', () => {
    expect(codigoDe(() => crearTurno(db, { ...base, inicio: '2026-12-01T10:10:00-03:00' }, relojFijo)))
      .toBe('INICIO_FUERA_DE_GRILLA');
    expect(codigoDe(() => crearTurno(db, { ...base, inicio: '2026-12-01T10:00:00-03:00', duracionMin: 20 }, relojFijo)))
      .toBe('DURACION_INVALIDA');
    expect(contar('turno')).toBe(0);
  });
});
