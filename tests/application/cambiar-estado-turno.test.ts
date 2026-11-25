import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { DatabaseSync } from 'node:sqlite';
import { abrirBase } from '../../src/infrastructure/sqlite/conexion.js';
import { cargarSeedFicticio, SEED } from '../../src/infrastructure/sqlite/seed.js';
import { crearTurno, type Reloj } from '../../src/application/crear-turno.js';
import { cambiarEstadoTurno } from '../../src/application/cambiar-estado-turno.js';
import { ErrorDeNegocio } from '../../src/domain/errores.js';

const relojCreacion: Reloj = { ahora: () => new Date('2026-11-17T12:00:00Z') };
const relojCambio: Reloj = { ahora: () => new Date('2026-11-24T15:00:00Z') };

let db: DatabaseSync;
beforeEach(() => { db = abrirBase(':memory:'); cargarSeedFicticio(db); });
afterEach(() => { db.close(); });

function turnoReservado() {
  return crearTurno(db, {
    pacienteId: SEED.pacientes.uno,
    profesionalId: SEED.profesionales.ana,
    sillonId: SEED.sillones.sillon1,
    prestacionId: SEED.prestaciones.limpieza,
    inicio: '2026-12-01T10:00:00-03:00',
  }, relojCreacion);
}

const estadoDe = (id: number) => (db.prepare('SELECT estado FROM turno WHERE id = ?').get(id) as { estado: string }).estado;
const eventos = (id: number) => db
  .prepare("SELECT accion, ocurrido_en, antes, despues FROM evento_auditoria WHERE turno_id = ? AND accion <> 'creado' ORDER BY id")
  .all(id) as Array<{ accion: string; ocurrido_en: string; antes: string; despues: string }>;
const contarEventos = () => (db.prepare('SELECT COUNT(*) AS n FROM evento_auditoria').get() as { n: number }).n;

function errorDe(fn: () => unknown): ErrorDeNegocio {
  try {
    fn();
  } catch (e) {
    if (e instanceof ErrorDeNegocio) return e;
    throw e;
  }
  throw new Error('se esperaba un ErrorDeNegocio');
}

describe('cambiarEstadoTurno', () => {
  it('cancela un turno reservado, devuelve el turno y audita "cancelado" con antes y después', () => {
    const t = turnoReservado();
    const r = cambiarEstadoTurno(db, t.id, 'cancelado', relojCambio);
    expect(r).toEqual({ ...t, estado: 'cancelado' });
    expect(estadoDe(t.id)).toBe('cancelado');
    expect(eventos(t.id)).toEqual([{
      accion: 'cancelado',
      ocurrido_en: '2026-11-24T15:00:00.000Z',
      antes: JSON.stringify({ estado: 'reservado' }),
      despues: JSON.stringify({ estado: 'cancelado' }),
    }]);
  });

  it('confirmar audita "estado_cambiado"', () => {
    const t = turnoReservado();
    cambiarEstadoTurno(db, t.id, 'confirmado', relojCambio);
    expect(eventos(t.id).map((e) => [e.accion, JSON.parse(e.despues).estado])).toEqual([['estado_cambiado', 'confirmado']]);
  });

  it('un turno inexistente es RECURSO_INEXISTENTE y no audita', () => {
    const antes = contarEventos();
    const e = errorDe(() => cambiarEstadoTurno(db, 9999, 'cancelado', relojCambio));
    expect(e.codigo).toBe('RECURSO_INEXISTENTE');
    expect(e.detalle).toEqual({ recurso: 'turno', id: 9999 });
    expect(contarEventos()).toBe(antes);
  });

  it('una transición inválida es TRANSICION_INVALIDA y no cambia el turno ni audita', () => {
    const t = turnoReservado();
    cambiarEstadoTurno(db, t.id, 'atendido', relojCambio);
    const antes = contarEventos();
    const e = errorDe(() => cambiarEstadoTurno(db, t.id, 'cancelado', relojCambio));
    expect(e.codigo).toBe('TRANSICION_INVALIDA');
    expect(estadoDe(t.id)).toBe('atendido');
    expect(contarEventos()).toBe(antes);
  });
});
