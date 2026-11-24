import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { DatabaseSync } from 'node:sqlite';
import { abrirBase } from '../../src/infrastructure/sqlite/conexion.js';
import { cargarSeedFicticio, SEED } from '../../src/infrastructure/sqlite/seed.js';
import { crearTurno, type Reloj } from '../../src/application/crear-turno.js';
import { consultarAgenda } from '../../src/application/consultar-agenda.js';
import { ErrorDeNegocio } from '../../src/domain/errores.js';

const relojFijo: Reloj = { ahora: () => new Date('2026-11-17T12:00:00Z') };
const { ana, bruno } = SEED.profesionales;
const { sillon1, sillon2 } = SEED.sillones;
const { consulta, limpieza } = SEED.prestaciones;

let db: DatabaseSync;
beforeEach(() => {
  db = abrirBase(':memory:');
  cargarSeedFicticio(db);
});
afterEach(() => {
  db.close();
});

const SQL_CONTAR = {
  turno: 'SELECT COUNT(*) AS n FROM turno',
  evento_auditoria: 'SELECT COUNT(*) AS n FROM evento_auditoria',
} as const;
const contar = (tabla: keyof typeof SQL_CONTAR) =>
  (db.prepare(SQL_CONTAR[tabla]).get() as { n: number }).n;

describe('consultarAgenda (caso de uso)', () => {
  it('devuelve los turnos ordenados cronológicamente con nombres completos y horas locales', () => {
    crearTurno(
      db,
      {
        pacienteId: SEED.pacientes.dos,
        profesionalId: bruno,
        sillonId: sillon2,
        prestacionId: consulta,
        inicio: '2026-12-01T11:00:00-03:00',
      },
      relojFijo,
    );
    const primero = crearTurno(
      db,
      {
        pacienteId: SEED.pacientes.uno,
        profesionalId: ana,
        sillonId: sillon1,
        prestacionId: limpieza,
        inicio: '2026-12-01T09:00:00-03:00',
      },
      relojFijo,
    );

    const resultado = consultarAgenda(db, {
      desde: '2026-12-01T00:00:00-03:00',
      hasta: '2026-12-02T00:00:00-03:00',
    });

    expect(resultado.turnos).toHaveLength(2);
    expect(resultado.turnos[0]).toEqual({
      id: primero.id,
      pacienteId: SEED.pacientes.uno,
      pacienteNombre: 'Paciente Ficticio Uno',
      profesionalId: ana,
      profesionalNombre: 'Dra. Ana Prueba',
      sillonId: sillon1,
      sillonNombre: 'Sillón 1',
      prestacionId: limpieza,
      prestacionNombre: 'Limpieza',
      inicio: '2026-12-01T09:00:00-03:00',
      fin: '2026-12-01T09:30:00-03:00',
      duracionMin: 30,
      estado: 'reservado',
    });
  });

  it('incluye turnos que cruzan bordes del rango y excluye contiguos', () => {
    crearTurno(
      db,
      {
        pacienteId: SEED.pacientes.uno,
        profesionalId: ana,
        sillonId: sillon1,
        prestacionId: limpieza,
        inicio: '2026-12-01T09:30:00-03:00',
      },
      relojFijo,
    );
    const cruzaInicio = crearTurno(
      db,
      {
        pacienteId: SEED.pacientes.dos,
        profesionalId: bruno,
        sillonId: sillon2,
        prestacionId: limpieza,
        inicio: '2026-12-01T09:45:00-03:00',
      },
      relojFijo,
    );
    const cruzaFin = crearTurno(
      db,
      {
        pacienteId: SEED.pacientes.tres,
        profesionalId: ana,
        sillonId: sillon1,
        prestacionId: limpieza,
        inicio: '2026-12-01T11:45:00-03:00',
      },
      relojFijo,
    );
    crearTurno(
      db,
      {
        pacienteId: SEED.pacientes.uno,
        profesionalId: bruno,
        sillonId: sillon2,
        prestacionId: limpieza,
        inicio: '2026-12-01T12:00:00-03:00',
      },
      relojFijo,
    );

    const resultado = consultarAgenda(db, {
      desde: '2026-12-01T10:00:00-03:00',
      hasta: '2026-12-01T12:00:00-03:00',
    });

    expect(resultado.turnos.map((t) => t.id)).toEqual([cruzaInicio.id, cruzaFin.id]);
  });

  it('aplica filtros por profesional, sillón y cancelados', () => {
    const tAna = crearTurno(
      db,
      {
        pacienteId: SEED.pacientes.uno,
        profesionalId: ana,
        sillonId: sillon1,
        prestacionId: limpieza,
        inicio: '2026-12-01T10:00:00-03:00',
      },
      relojFijo,
    );
    const tCancelado = crearTurno(
      db,
      {
        pacienteId: SEED.pacientes.dos,
        profesionalId: bruno,
        sillonId: sillon2,
        prestacionId: limpieza,
        inicio: '2026-12-01T11:00:00-03:00',
      },
      relojFijo,
    );
    db.prepare("UPDATE turno SET estado = 'cancelado' WHERE id = ?").run(tCancelado.id);

    expect(
      consultarAgenda(db, {
        desde: '2026-12-01T00:00:00-03:00',
        hasta: '2026-12-02T00:00:00-03:00',
        profesionalId: ana,
      }).turnos.map((t) => t.id),
    ).toEqual([tAna.id]);

    expect(
      consultarAgenda(db, {
        desde: '2026-12-01T00:00:00-03:00',
        hasta: '2026-12-02T00:00:00-03:00',
        incluirCancelados: true,
      }).turnos.map((t) => t.id),
    ).toEqual([tAna.id, tCancelado.id]);
  });

  it('rechaza rangos invertidos con SOLICITUD_INVALIDA sin modificar turnos ni auditoría', () => {
    crearTurno(
      db,
      {
        pacienteId: SEED.pacientes.uno,
        profesionalId: ana,
        sillonId: sillon1,
        prestacionId: limpieza,
        inicio: '2026-12-01T10:00:00-03:00',
      },
      relojFijo,
    );
    const antes = [contar('turno'), contar('evento_auditoria')];

    expect(() =>
      consultarAgenda(db, {
        desde: '2026-12-01T12:00:00-03:00',
        hasta: '2026-12-01T10:00:00-03:00',
      }),
    ).toThrow(ErrorDeNegocio);

    expect([contar('turno'), contar('evento_auditoria')]).toEqual(antes);
  });
});
