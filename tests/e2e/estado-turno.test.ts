// Tests e2e de las transiciones de estado (C-05): un test por escenario del delta de
// openspec/changes/cancelar-y-cambiar-estado-de-turno/specs/agenda-turnos/spec.md
// (los títulos coinciden con los nombres de los escenarios). Datos 100 % ficticios.
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { DatabaseSync } from 'node:sqlite';
import type { FastifyInstance } from 'fastify';
import { abrirBase } from '../../src/infrastructure/sqlite/conexion.js';
import { cargarSeedFicticio, SEED } from '../../src/infrastructure/sqlite/seed.js';
import { construirApp } from '../../src/http/app.js';

const { ana, bruno } = SEED.profesionales;
const { sillon1, sillon2 } = SEED.sillones;
const { limpieza } = SEED.prestaciones;

let db: DatabaseSync;
let app: FastifyInstance;

beforeEach(async () => {
  db = abrirBase(':memory:');
  cargarSeedFicticio(db);
  app = construirApp({ db, reloj: { ahora: () => new Date('2026-11-24T15:00:00Z') } });
  await app.ready();
});
afterEach(async () => {
  await app.close();
  db.close();
});

/** Hora local del martes 2026-12-01 (America/Argentina/Buenos_Aires). */
const hora = (hhmm: string) => `2026-12-01T${hhmm}:00-03:00`;

type Accion = 'cancelar' | 'confirmar' | 'ausente' | 'atendido';

function reservar(profesionalId: number, sillonId: number, inicio: string) {
  return app.inject({
    method: 'POST',
    url: '/turnos',
    payload: { pacienteId: SEED.pacientes.uno, profesionalId, sillonId, prestacionId: limpieza, inicio: hora(inicio) },
  });
}

/** Crea un turno de Limpieza (30 min) y devuelve su id. */
async function turnoReservado(profesionalId: number, sillonId: number, inicio: string): Promise<number> {
  const r = await reservar(profesionalId, sillonId, inicio);
  expect(r.statusCode).toBe(201);
  return r.json().id as number;
}

const transicion = (id: number | string, accion: Accion) =>
  app.inject({ method: 'POST', url: `/turnos/${id}/${accion}` });

/** Lleva el turno a un estado recorriendo transiciones válidas por la API. */
async function llevarA(id: number, ...acciones: Accion[]) {
  for (const accion of acciones) expect((await transicion(id, accion)).statusCode).toBe(200);
}

const estadoDe = (id: number) => (db.prepare('SELECT estado FROM turno WHERE id = ?').get(id) as { estado: string }).estado;
const contarEventos = () => (db.prepare('SELECT COUNT(*) AS n FROM evento_auditoria').get() as { n: number }).n;
const contarTurnosEn = (sillonId: number, estado: string) =>
  (db.prepare('SELECT COUNT(*) AS n FROM turno WHERE sillon_id = ? AND estado = ?').get(sillonId, estado) as { n: number }).n;
const eventosDe = (id: number, accion: string) => db
  .prepare('SELECT antes, despues FROM evento_auditoria WHERE turno_id = ? AND accion = ?')
  .all(id, accion) as Array<{ antes: string; despues: string }>;

describe('Requirement: Cancelar un turno', () => {
  it('Cancelar un turno reservado', async () => {
    const id = await turnoReservado(ana, sillon1, '10:00');
    const r = await transicion(id, 'cancelar');
    expect(r.statusCode).toBe(200);
    expect(r.json()).toMatchObject({ id, estado: 'cancelado', inicio: hora('10:00'), fin: hora('10:30') });
  });

  it('Cancelar un turno confirmado', async () => {
    const id = await turnoReservado(ana, sillon1, '10:00');
    await llevarA(id, 'confirmar');
    const r = await transicion(id, 'cancelar');
    expect(r.statusCode).toBe(200);
    expect(estadoDe(id)).toBe('cancelado');
  });

  it('Cancelar y volver a reservar el mismo horario con los mismos recursos', async () => {
    const id = await turnoReservado(ana, sillon1, '10:00');
    expect((await reservar(ana, sillon1, '10:00')).statusCode).toBe(409);

    expect((await transicion(id, 'cancelar')).statusCode).toBe(200);
    const nueva = await reservar(ana, sillon1, '10:00');

    expect(nueva.statusCode).toBe(201);
    expect(contarTurnosEn(sillon1, 'cancelado')).toBe(1);
    expect(contarTurnosEn(sillon1, 'reservado')).toBe(1);
  });
});

describe('Requirement: Confirmar un turno', () => {
  it('Confirmar un turno reservado', async () => {
    const id = await turnoReservado(ana, sillon1, '10:00');
    const r = await transicion(id, 'confirmar');
    expect(r.statusCode).toBe(200);
    expect(r.json().estado).toBe('confirmado');
  });
});

describe('Requirement: Marcar un turno como ausente o atendido', () => {
  it('Marcar atendido un turno confirmado', async () => {
    const id = await turnoReservado(ana, sillon1, '10:00');
    await llevarA(id, 'confirmar');
    const r = await transicion(id, 'atendido');
    expect(r.statusCode).toBe(200);
    expect(r.json().estado).toBe('atendido');
  });

  it('Marcar ausente un turno reservado', async () => {
    const id = await turnoReservado(bruno, sillon2, '11:00');
    const r = await transicion(id, 'ausente');
    expect(r.statusCode).toBe(200);
    expect(r.json().estado).toBe('ausente');
  });
});

describe('Requirement: Rechazo de transiciones inválidas', () => {
  it('Cancelar un turno atendido', async () => {
    const id = await turnoReservado(ana, sillon1, '10:00');
    await llevarA(id, 'atendido');
    const eventosAntes = contarEventos();

    const r = await transicion(id, 'cancelar');

    expect(r.statusCode).toBe(422);
    expect(r.json().error.codigo).toBe('TRANSICION_INVALIDA');
    expect(r.json().error.mensaje).toMatch(/turno/);
    expect(estadoDe(id)).toBe('atendido');
    expect(contarEventos()).toBe(eventosAntes);
  });

  it('Cancelar un turno ya cancelado', async () => {
    const id = await turnoReservado(ana, sillon1, '10:00');
    await llevarA(id, 'cancelar');
    const r = await transicion(id, 'cancelar');
    expect(r.statusCode).toBe(422);
    expect(r.json().error.codigo).toBe('TRANSICION_INVALIDA');
  });

  it('Confirmar un turno ausente', async () => {
    const id = await turnoReservado(ana, sillon1, '10:00');
    await llevarA(id, 'ausente');
    const r = await transicion(id, 'confirmar');
    expect(r.statusCode).toBe(422);
    expect(r.json().error.codigo).toBe('TRANSICION_INVALIDA');
  });

  it('Confirmar un turno ya confirmado', async () => {
    const id = await turnoReservado(ana, sillon1, '10:00');
    await llevarA(id, 'confirmar');
    const r = await transicion(id, 'confirmar');
    expect(r.statusCode).toBe(422);
    expect(r.json().error.codigo).toBe('TRANSICION_INVALIDA');
  });
});

describe('Requirement: Transición sobre un turno inexistente o con id inválido', () => {
  it('Turno inexistente', async () => {
    const eventosAntes = contarEventos();
    const r = await transicion(9999, 'cancelar');
    expect(r.statusCode).toBe(404);
    expect(r.json().error.codigo).toBe('RECURSO_INEXISTENTE');
    expect(contarEventos()).toBe(eventosAntes);
  });

  it('Id con formato inválido', async () => {
    const r = await transicion('abc', 'confirmar');
    expect(r.statusCode).toBe(400);
    expect(r.json().error.codigo).toBe('SOLICITUD_INVALIDA');
  });
});

describe('Requirement: Los turnos ausentes y atendidos siguen ocupando la agenda', () => {
  it('Turno atendido sigue bloqueando el sillón', async () => {
    const id = await turnoReservado(ana, sillon1, '10:00');
    await llevarA(id, 'atendido');
    const r = await reservar(bruno, sillon1, '10:00');
    expect(r.statusCode).toBe(409);
    expect(r.json().error.codigo).toBe('TURNO_SOLAPADO_SILLON');
  });

  it('Turno ausente sigue bloqueando al profesional', async () => {
    const id = await turnoReservado(bruno, sillon2, '11:00');
    await llevarA(id, 'ausente');
    const r = await reservar(bruno, sillon1, '11:00');
    expect(r.statusCode).toBe(409);
    expect(r.json().error.codigo).toBe('TURNO_SOLAPADO_PROFESIONAL');
  });
});

describe('Requirement: Auditoría de las transiciones', () => {
  it('Evento al cancelar', async () => {
    const id = await turnoReservado(ana, sillon1, '10:00');
    await llevarA(id, 'cancelar');
    expect(eventosDe(id, 'cancelado').map((e) => [JSON.parse(e.antes), JSON.parse(e.despues)])).toEqual([
      [{ estado: 'reservado' }, { estado: 'cancelado' }],
    ]);
  });

  it('Evento al confirmar', async () => {
    const id = await turnoReservado(ana, sillon1, '10:00');
    await llevarA(id, 'confirmar');
    expect(eventosDe(id, 'estado_cambiado').map((e) => [JSON.parse(e.antes), JSON.parse(e.despues)])).toEqual([
      [{ estado: 'reservado' }, { estado: 'confirmado' }],
    ]);
  });
});
