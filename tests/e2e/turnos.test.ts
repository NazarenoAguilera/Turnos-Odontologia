// Tests e2e de POST /turnos: un test por escenario de specs/agenda-turnos/spec.md
// (los títulos coinciden con los nombres de los escenarios). Datos 100 % ficticios.
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { DatabaseSync } from 'node:sqlite';
import type { FastifyInstance } from 'fastify';
import { abrirBase } from '../../src/infrastructure/sqlite/conexion.js';
import { cargarSeedFicticio, SEED } from '../../src/infrastructure/sqlite/seed.js';
import { construirApp } from '../../src/http/app.js';

const { ana, bruno } = SEED.profesionales;
const { sillon1, sillon2 } = SEED.sillones;
const { limpieza, endodoncia } = SEED.prestaciones;

let db: DatabaseSync;
let app: FastifyInstance;

beforeEach(async () => {
  db = abrirBase(':memory:');
  cargarSeedFicticio(db);
  app = construirApp({ db, reloj: { ahora: () => new Date('2026-11-17T12:00:00Z') } });
  await app.ready();
});
afterEach(async () => {
  await app.close();
  db.close();
});

/** Hora local del martes 2026-12-01 (America/Argentina/Buenos_Aires). */
const hora = (hhmm: string) => `2026-12-01T${hhmm}:00-03:00`;

function pedir(cuerpo: Record<string, unknown>) {
  return app.inject({ method: 'POST', url: '/turnos', payload: cuerpo });
}

function turno(profesionalId: number, sillonId: number, inicio: string, extra: Record<string, unknown> = {}) {
  return pedir({
    pacienteId: SEED.pacientes.uno, profesionalId, sillonId, prestacionId: limpieza, inicio: hora(inicio), ...extra,
  });
}

const contarTurnos = (where = '1 = 1', ...params: number[]) =>
  (db.prepare(`SELECT COUNT(*) AS n FROM turno WHERE ${where}`).get(...params) as { n: number }).n;

const recursosEnConflicto = (cuerpo: { error: { detalle: { conflictos: Array<{ recurso: string }> } } }) =>
  cuerpo.error.detalle.conflictos.map((c) => c.recurso).sort();

describe('GET /health', () => {
  it('responde 200', async () => {
    const r = await app.inject({ method: 'GET', url: '/health' });
    expect(r.statusCode).toBe(200);
    expect(r.json()).toEqual({ estado: 'ok' });
  });
});

describe('Requirement: Crear un turno reservado', () => {
  it('Caso feliz con la duración de la prestación', async () => {
    const r = await turno(ana, sillon1, '10:00');
    expect(r.statusCode).toBe(201);
    expect(r.json()).toMatchObject({
      estado: 'reservado', duracionMin: 30, inicio: hora('10:00'), fin: hora('10:30'),
      profesionalId: ana, sillonId: sillon1,
    });
  });

  it('Duración indicada al crear', async () => {
    const r = await turno(ana, sillon1, '10:00', { duracionMin: 45 });
    expect(r.statusCode).toBe(201);
    expect(r.json().fin).toBe(hora('10:45'));
  });
});

describe('Requirement: Sin solapamiento por profesional', () => {
  it('Superposición parcial con el mismo profesional', async () => {
    const existente = (await turno(ana, sillon1, '10:00')).json();
    const r = await turno(ana, sillon2, '10:15');
    expect(r.statusCode).toBe(409);
    const cuerpo = r.json();
    expect(cuerpo.error.codigo).toBe('TURNO_SOLAPADO_PROFESIONAL');
    expect(cuerpo.error.detalle.conflictos).toEqual([
      { recurso: 'profesional', turnoId: existente.id, inicio: hora('10:00'), fin: hora('10:30') },
    ]);
    expect(contarTurnos('profesional_id = ?', ana)).toBe(1);
  });

  it('Turno contenido dentro de otro del mismo profesional', async () => {
    expect((await turno(bruno, sillon1, '10:00', { prestacionId: endodoncia })).statusCode).toBe(201);
    const r = await turno(bruno, sillon2, '10:30');
    expect(r.statusCode).toBe(409);
    expect(r.json().error.codigo).toBe('TURNO_SOLAPADO_PROFESIONAL');
  });
});

describe('Requirement: Sin solapamiento por sillón', () => {
  it('Mismo sillón ocupado por otro profesional', async () => {
    await turno(ana, sillon1, '10:00');
    const r = await turno(bruno, sillon1, '10:15');
    expect(r.statusCode).toBe(409);
    expect(r.json().error.codigo).toBe('TURNO_SOLAPADO_SILLON');
    expect(recursosEnConflicto(r.json())).toEqual(['sillon']);
  });
});

describe('Requirement: Informe de ambos conflictos', () => {
  it('Profesional y sillón ocupados', async () => {
    await turno(ana, sillon2, '10:00');
    await turno(bruno, sillon1, '10:00');
    const r = await turno(ana, sillon1, '10:00');
    expect(r.statusCode).toBe(409);
    expect(r.json().error.codigo).toBe('TURNO_SOLAPADO_PROFESIONAL');
    expect(recursosEnConflicto(r.json())).toEqual(['profesional', 'sillon']);
  });
});

describe('Requirement: Intervalos semiabiertos', () => {
  it('Turno que empieza justo cuando termina otro', async () => {
    await turno(ana, sillon1, '10:00');
    const r = await turno(ana, sillon1, '10:30');
    expect(r.statusCode).toBe(201);
    expect(contarTurnos()).toBe(2);
  });

  it('Turno que termina justo cuando empieza otro', async () => {
    await turno(ana, sillon1, '11:00');
    const r = await turno(bruno, sillon1, '10:30');
    expect(r.statusCode).toBe(201);
  });
});

describe('Requirement: Los turnos cancelados no ocupan la agenda', () => {
  it('Horario de un turno cancelado', async () => {
    const anterior = (await turno(ana, sillon1, '10:00')).json();
    // C-01 no expone la cancelación (llega en C-05): se simula el estado directamente.
    db.prepare("UPDATE turno SET estado = 'cancelado' WHERE id = ?").run(anterior.id);
    const r = await turno(ana, sillon1, '10:00');
    expect(r.statusCode).toBe(201);
  });
});

describe('Requirement: Inicio en la grilla de 15 minutos', () => {
  it('Inicio fuera de la grilla', async () => {
    const r = await turno(ana, sillon1, '10:10');
    expect(r.statusCode).toBe(422);
    expect(r.json().error.codigo).toBe('INICIO_FUERA_DE_GRILLA');
    expect(contarTurnos()).toBe(0);
  });
});

describe('Requirement: Duración válida', () => {
  it('Duración que no es múltiplo de 15', async () => {
    const r = await turno(ana, sillon1, '10:00', { duracionMin: 20 });
    expect(r.statusCode).toBe(422);
    expect(r.json().error.codigo).toBe('DURACION_INVALIDA');
  });

  it('Duración cero', async () => {
    const r = await turno(ana, sillon1, '10:00', { duracionMin: 0 });
    expect(r.statusCode).toBe(422);
    expect(r.json().error.codigo).toBe('DURACION_INVALIDA');
  });
});

describe('Requirement: Recursos obligatorios, existentes y activos', () => {
  it('Pedido sin sillón', async () => {
    const r = await pedir({ pacienteId: SEED.pacientes.uno, profesionalId: ana, prestacionId: limpieza, inicio: hora('10:00') });
    expect(r.statusCode).toBe(400);
    expect(r.json().error.codigo).toBe('SOLICITUD_INVALIDA');
  });

  it('Profesional inexistente', async () => {
    const r = await turno(999, sillon1, '10:00');
    expect(r.statusCode).toBe(404);
    expect(r.json().error.codigo).toBe('RECURSO_INEXISTENTE');
  });

  it('Sillón inactivo', async () => {
    db.prepare('UPDATE sillon SET activo = 0 WHERE id = ?').run(sillon2);
    const r = await turno(ana, sillon2, '10:00');
    expect(r.statusCode).toBe(422);
    expect(r.json().error.codigo).toBe('RECURSO_INACTIVO');
  });

  it('un campo de más responde 400 SOLICITUD_INVALIDA y no crea el turno (design D7)', async () => {
    const r = await turno(ana, sillon1, '10:00', { campoInventado: 'x' });
    expect(r.statusCode).toBe(400);
    expect(r.json().error.codigo).toBe('SOLICITUD_INVALIDA');
    expect(contarTurnos()).toBe(0);
  });

  it('inicio sin zona horaria responde 400 SOLICITUD_INVALIDA', async () => {
    const r = await pedir({
      pacienteId: SEED.pacientes.uno, profesionalId: ana, sillonId: sillon1, prestacionId: limpieza,
      inicio: '2026-12-01T10:00:00',
    });
    expect(r.statusCode).toBe(400);
    expect(r.json().error.codigo).toBe('SOLICITUD_INVALIDA');
  });
});

describe('Requirement: Formato de los errores de la creación de turnos', () => {
  /** El cuerpo de todo rechazo es { error: { codigo, mensaje, detalle } } (change interfaz-web-base). */
  function esperarFormatoDeError(cuerpo: unknown, codigo: string) {
    expect(cuerpo).toEqual({
      error: { codigo, mensaje: expect.any(String), detalle: expect.any(Object) },
    });
    const { mensaje, detalle } = (cuerpo as { error: { mensaje: string; detalle: unknown } }).error;
    expect(mensaje.trim().length).toBeGreaterThan(0);
    expect(Array.isArray(detalle)).toBe(false);
  }

  it('Error de negocio por superposición con código y mensaje', async () => {
    const existente = (await turno(ana, sillon1, '10:00')).json();
    const r = await turno(bruno, sillon1, '10:15');
    expect(r.statusCode).toBe(409);
    esperarFormatoDeError(r.json(), 'TURNO_SOLAPADO_SILLON');
    expect(r.json().error.mensaje).toMatch(/sillón/);
    expect(r.json().error.detalle.conflictos).toContainEqual({
      recurso: 'sillon', turnoId: existente.id, inicio: hora('10:00'), fin: hora('10:30'),
    });
  });

  it('Regla de grilla con el mismo formato', async () => {
    const r = await turno(ana, sillon1, '10:10');
    expect(r.statusCode).toBe(422);
    esperarFormatoDeError(r.json(), 'INICIO_FUERA_DE_GRILLA');
  });

  it('Pedido mal formado con el mismo formato', async () => {
    const r = await turno(ana, sillon1, '10:00', { campoInventado: 'x' });
    expect(r.statusCode).toBe(400);
    esperarFormatoDeError(r.json(), 'SOLICITUD_INVALIDA');
  });
});

describe('Requirement: Auditoría de la creación', () => {
  it('Evento de auditoría al crear', async () => {
    const creado = (await turno(ana, sillon1, '10:00')).json();
    const n = (db.prepare("SELECT COUNT(*) AS n FROM evento_auditoria WHERE turno_id = ? AND accion = 'creado'")
      .get(creado.id) as { n: number }).n;
    expect(n).toBe(1);
  });

  it('Rechazo sin efectos', async () => {
    await turno(ana, sillon1, '10:00');
    const eventosAntes = (db.prepare('SELECT COUNT(*) AS n FROM evento_auditoria').get() as { n: number }).n;
    const r = await turno(ana, sillon2, '10:15');
    expect(r.statusCode).toBe(409);
    expect(contarTurnos()).toBe(1);
    expect((db.prepare('SELECT COUNT(*) AS n FROM evento_auditoria').get() as { n: number }).n).toBe(eventosAntes);
  });
});
