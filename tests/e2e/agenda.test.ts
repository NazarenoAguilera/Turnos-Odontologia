// Tests e2e de GET /turnos: un test por escenario de openspec/changes/agenda-diaria-y-semanal/specs/agenda-turnos/spec.md
// (los títulos coinciden con los nombres de los escenarios). Datos 100 % ficticios.
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { DatabaseSync } from 'node:sqlite';
import type { FastifyInstance } from 'fastify';
import { abrirBase } from '../../src/infrastructure/sqlite/conexion.js';
import { cargarSeedFicticio, SEED } from '../../src/infrastructure/sqlite/seed.js';
import { construirApp } from '../../src/http/app.js';

const { ana, bruno } = SEED.profesionales;
const { sillon1, sillon2 } = SEED.sillones;
const { consulta, limpieza } = SEED.prestaciones;
const { uno, dos, tres } = SEED.pacientes;

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

const iso = (fecha: string, hhmm: string) => `${fecha}T${hhmm}:00-03:00`;
const hora = (hhmm: string) => iso('2026-12-01', hhmm);

async function crear(
  profesionalId: number,
  sillonId: number,
  inicioIso: string,
  extra: Record<string, unknown> = {},
) {
  const r = await app.inject({
    method: 'POST',
    url: '/turnos',
    payload: {
      pacienteId: uno,
      profesionalId,
      sillonId,
      prestacionId: limpieza,
      inicio: inicioIso,
      ...extra,
    },
  });
  expect(r.statusCode).toBe(201);
  return r.json() as { id: number };
}

function consultar(query: Record<string, string>) {
  return app.inject({ method: 'GET', url: '/turnos', query });
}

const SQL_CONTAR = {
  turno: 'SELECT COUNT(*) AS n FROM turno',
  evento_auditoria: 'SELECT COUNT(*) AS n FROM evento_auditoria',
} as const;
const contar = (tabla: keyof typeof SQL_CONTAR) =>
  (db.prepare(SQL_CONTAR[tabla]).get() as { n: number }).n;

describe('Requirement: Consultar agenda por rango diario y semanal', () => {
  it('Caso feliz de agenda diaria con orden cronológico y nombres de recursos', async () => {
    await crear(bruno, sillon2, hora('11:00'), { pacienteId: dos, prestacionId: consulta });
    const primero = await crear(ana, sillon1, hora('09:00'), { pacienteId: uno, prestacionId: limpieza });

    const r = await consultar({ desde: hora('00:00'), hasta: iso('2026-12-02', '00:00') });

    expect(r.statusCode).toBe(200);
    const cuerpo = r.json();
    expect(cuerpo.turnos).toHaveLength(2);
    expect(cuerpo.turnos[0]).toEqual({
      id: primero.id,
      pacienteId: uno,
      pacienteNombre: 'Paciente Ficticio Uno',
      profesionalId: ana,
      profesionalNombre: 'Dra. Ana Prueba',
      sillonId: sillon1,
      sillonNombre: 'Sillón 1',
      prestacionId: limpieza,
      prestacionNombre: 'Limpieza',
      inicio: hora('09:00'),
      fin: hora('09:30'),
      duracionMin: 30,
      estado: 'reservado',
    });
    expect(cuerpo.turnos[1].inicio).toBe(hora('11:00'));
  });

  it('Caso feliz de agenda semanal', async () => {
    const tMartes = await crear(ana, sillon1, iso('2026-12-01', '10:00'));
    const tViernes = await crear(bruno, sillon2, iso('2026-12-04', '15:00'));
    await crear(ana, sillon1, iso('2026-12-07', '09:00'));

    const r = await consultar({
      desde: iso('2026-11-30', '00:00'),
      hasta: iso('2026-12-07', '00:00'),
    });

    expect(r.statusCode).toBe(200);
    expect(r.json().turnos.map((t: { id: number }) => t.id)).toEqual([tMartes.id, tViernes.id]);
  });

  it('Rango sin turnos devuelve lista vacía', async () => {
    const r = await consultar({
      desde: iso('2026-12-02', '00:00'),
      hasta: iso('2026-12-03', '00:00'),
    });

    expect(r.statusCode).toBe(200);
    expect(r.json()).toEqual({ turnos: [] });
  });
});

describe('Requirement: Intersección semiabierta con el rango consultado', () => {
  it('Turno que cruza el borde inicial del rango', async () => {
    const turno = await crear(ana, sillon1, hora('09:30'), { duracionMin: 60 });

    const r = await consultar({ desde: hora('10:00'), hasta: hora('12:00') });

    expect(r.statusCode).toBe(200);
    expect(r.json().turnos.map((t: { id: number }) => t.id)).toEqual([turno.id]);
  });

  it('Turno que cruza el borde final del rango', async () => {
    const turno = await crear(ana, sillon1, hora('11:30'), { duracionMin: 60 });

    const r = await consultar({ desde: hora('10:00'), hasta: hora('12:00') });

    expect(r.statusCode).toBe(200);
    expect(r.json().turnos.map((t: { id: number }) => t.id)).toEqual([turno.id]);
  });

  it('Turnos contiguos a los bordes del rango quedan excluidos', async () => {
    await crear(ana, sillon1, hora('09:30'));
    await crear(ana, sillon1, hora('12:00'));

    const r = await consultar({ desde: hora('10:00'), hasta: hora('12:00') });

    expect(r.statusCode).toBe(200);
    expect(r.json().turnos).toEqual([]);
  });
});

describe('Requirement: Filtrado de agenda por profesional y por sillón', () => {
  it('Filtrar por profesional', async () => {
    const tAna = await crear(ana, sillon1, hora('10:00'));
    await crear(bruno, sillon2, hora('10:00'));

    const r = await consultar({
      desde: hora('00:00'),
      hasta: iso('2026-12-02', '00:00'),
      profesionalId: String(ana),
    });

    expect(r.statusCode).toBe(200);
    expect(r.json().turnos.map((t: { id: number }) => t.id)).toEqual([tAna.id]);
  });

  it('Filtrar por sillón', async () => {
    await crear(ana, sillon1, hora('10:00'));
    const tSillon2 = await crear(bruno, sillon2, hora('10:00'));

    const r = await consultar({
      desde: hora('00:00'),
      hasta: iso('2026-12-02', '00:00'),
      sillonId: String(sillon2),
    });

    expect(r.statusCode).toBe(200);
    expect(r.json().turnos.map((t: { id: number }) => t.id)).toEqual([tSillon2.id]);
  });

  it('Filtrar por profesional y sillón combinados', async () => {
    const tAnaSillon1 = await crear(ana, sillon1, hora('10:00'));
    await crear(ana, sillon2, hora('11:00'));
    await crear(bruno, sillon1, hora('12:00'));

    const r = await consultar({
      desde: hora('00:00'),
      hasta: iso('2026-12-02', '00:00'),
      profesionalId: String(ana),
      sillonId: String(sillon1),
    });

    expect(r.statusCode).toBe(200);
    expect(r.json().turnos.map((t: { id: number }) => t.id)).toEqual([tAnaSillon1.id]);
  });

  it('Filtro por recurso inexistente devuelve lista vacía', async () => {
    await crear(ana, sillon1, hora('10:00'));

    const r = await consultar({
      desde: hora('00:00'),
      hasta: iso('2026-12-02', '00:00'),
      profesionalId: '999',
    });

    expect(r.statusCode).toBe(200);
    expect(r.json()).toEqual({ turnos: [] });
  });
});

describe('Requirement: Exclusión e inclusión de turnos cancelados', () => {
  it('Cancelados excluidos por defecto y demás estados incluidos', async () => {
    const tReservado = await crear(ana, sillon1, hora('09:00'));
    const tConfirmado = await crear(ana, sillon1, hora('10:00'));
    const tAusente = await crear(ana, sillon1, hora('11:00'));
    const tAtendido = await crear(ana, sillon1, hora('12:00'));
    const tCancelado = await crear(ana, sillon1, hora('13:00'), { pacienteId: tres });

    // C-05 agrega los endpoints de cambio de estado; en C-07 se preparan directamente en la tabla.
    db.prepare("UPDATE turno SET estado = 'confirmado' WHERE id = ?").run(tConfirmado.id);
    db.prepare("UPDATE turno SET estado = 'ausente' WHERE id = ?").run(tAusente.id);
    db.prepare("UPDATE turno SET estado = 'atendido' WHERE id = ?").run(tAtendido.id);
    db.prepare("UPDATE turno SET estado = 'cancelado' WHERE id = ?").run(tCancelado.id);

    const r = await consultar({ desde: hora('00:00'), hasta: iso('2026-12-02', '00:00') });

    expect(r.statusCode).toBe(200);
    expect(r.json().turnos.map((t: { id: number; estado: string }) => [t.id, t.estado])).toEqual([
      [tReservado.id, 'reservado'],
      [tConfirmado.id, 'confirmado'],
      [tAusente.id, 'ausente'],
      [tAtendido.id, 'atendido'],
    ]);
  });

  it('Cancelados incluidos cuando incluirCancelados es true', async () => {
    const tReservado = await crear(ana, sillon1, hora('10:00'));
    const tCancelado = await crear(ana, sillon1, hora('11:00'));
    db.prepare("UPDATE turno SET estado = 'cancelado' WHERE id = ?").run(tCancelado.id);

    const r = await consultar({
      desde: hora('00:00'),
      hasta: iso('2026-12-02', '00:00'),
      incluirCancelados: 'true',
    });

    expect(r.statusCode).toBe(200);
    expect(r.json().turnos.map((t: { id: number; estado: string }) => [t.id, t.estado])).toEqual([
      [tReservado.id, 'reservado'],
      [tCancelado.id, 'cancelado'],
    ]);
  });
});

describe('Requirement: Validación de parámetros de consulta de agenda', () => {
  it('Rango invertido o vacío rechazado', async () => {
    const invertido = await consultar({ desde: hora('12:00'), hasta: hora('10:00') });
    expect(invertido.statusCode).toBe(400);
    expect(invertido.json().error.codigo).toBe('SOLICITUD_INVALIDA');
    expect(invertido.json().error.mensaje).toBeTruthy();

    const vacio = await consultar({ desde: hora('10:00'), hasta: hora('10:00') });
    expect(vacio.statusCode).toBe(400);
    expect(vacio.json().error.codigo).toBe('SOLICITUD_INVALIDA');
  });

  it('Falta parámetro obligatorio hasta', async () => {
    const r = await consultar({ desde: hora('00:00') });
    expect(r.statusCode).toBe(400);
    expect(r.json().error.codigo).toBe('SOLICITUD_INVALIDA');
  });

  it('Fecha sin zona horaria rechazada', async () => {
    const r = await consultar({
      desde: '2026-12-01T00:00:00',
      hasta: iso('2026-12-02', '00:00'),
    });
    expect(r.statusCode).toBe(400);
    expect(r.json().error.codigo).toBe('SOLICITUD_INVALIDA');
  });

  it('Parámetro de consulta desconocido rechazado', async () => {
    const r = await consultar({
      desde: hora('00:00'),
      hasta: iso('2026-12-02', '00:00'),
      campoExtra: '1',
    });
    expect(r.statusCode).toBe(400);
    expect(r.json().error.codigo).toBe('SOLICITUD_INVALIDA');
  });

  it('rechaza valores inválidos en incluirCancelados y profesionalId con 400 SOLICITUD_INVALIDA', async () => {
    const boolInvalido = await consultar({
      desde: hora('00:00'),
      hasta: iso('2026-12-02', '00:00'),
      incluirCancelados: 'talvez',
    });
    expect(boolInvalido.statusCode).toBe(400);
    expect(boolInvalido.json().error.codigo).toBe('SOLICITUD_INVALIDA');

    const idInvalido = await consultar({
      desde: hora('00:00'),
      hasta: iso('2026-12-02', '00:00'),
      profesionalId: '0',
    });
    expect(idInvalido.statusCode).toBe(400);
    expect(idInvalido.json().error.codigo).toBe('SOLICITUD_INVALIDA');
  });

  it('GET /turnos no modifica turnos ni genera eventos de auditoría', async () => {
    await crear(ana, sillon1, hora('10:00'));
    const antes = [contar('turno'), contar('evento_auditoria')];

    await consultar({ desde: hora('00:00'), hasta: iso('2026-12-02', '00:00') });
    await consultar({ desde: hora('12:00'), hasta: hora('10:00') });

    expect([contar('turno'), contar('evento_auditoria')]).toEqual(antes);
  });
});
