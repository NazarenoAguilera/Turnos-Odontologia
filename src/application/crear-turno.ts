import type { DatabaseSync } from 'node:sqlite';
import { verificarSinConflictos } from '../domain/conflictos.js';
import { ErrorDeNegocio } from '../domain/errores.js';
import { aIsoLocal, instanteDesdeIso, MS_POR_MINUTO } from '../domain/tiempo.js';
import { intervaloDelTurno, type EstadoTurno } from '../domain/turno.js';
import { enTransaccionInmediata } from '../infrastructure/sqlite/conexion.js';
import {
  buscarTurnosQuePodrianChocar,
  insertarEventoAuditoria,
  insertarTurno,
  obtenerPrestacion,
  obtenerRecurso,
  type RecursoActivo,
  type TipoRecurso,
} from '../infrastructure/sqlite/repositorios.js';

/** Reloj inyectable para fechas deterministas en tests y auditoría (design D9). */
export interface Reloj {
  ahora(): Date;
}

export const relojDelSistema: Reloj = { ahora: () => new Date() };

export interface DatosCrearTurno {
  pacienteId: number;
  profesionalId: number;
  sillonId: number;
  prestacionId: number;
  /** ISO 8601 con offset obligatorio. */
  inicio: string;
  /** Opcional: por defecto, la duración de la prestación. */
  duracionMin?: number;
}

export interface TurnoCreado {
  id: number;
  pacienteId: number;
  profesionalId: number;
  sillonId: number;
  prestacionId: number;
  inicio: string;
  fin: string;
  duracionMin: number;
  estado: EstadoTurno;
}

type TipoConPrestacion = TipoRecurso | 'prestacion';

function exigirActivo<T extends RecursoActivo>(recurso: T | undefined, tipo: TipoConPrestacion, id: number): T {
  if (!recurso) {
    throw new ErrorDeNegocio('RECURSO_INEXISTENTE', `No existe ${tipo} con id ${id}.`, { recurso: tipo, id });
  }
  if (!recurso.activo) {
    throw new ErrorDeNegocio('RECURSO_INACTIVO', `El ${tipo} con id ${id} está inactivo.`, { recurso: tipo, id });
  }
  return recurso;
}

/**
 * Caso de uso: crear un turno sin solapamientos por profesional ni por sillón/box.
 * Todo ocurre dentro de BEGIN IMMEDIATE: lectura de recursos, búsqueda de conflictos,
 * inserción del turno y del evento de auditoría (RN-TU-13, RN-AU-01, RN-GL-01).
 */
export function crearTurno(db: DatabaseSync, datos: DatosCrearTurno, reloj: Reloj = relojDelSistema): TurnoCreado {
  const inicioMs = instanteDesdeIso(datos.inicio);

  return enTransaccionInmediata(db, () => {
    exigirActivo(obtenerRecurso(db, 'paciente', datos.pacienteId), 'paciente', datos.pacienteId);
    exigirActivo(obtenerRecurso(db, 'profesional', datos.profesionalId), 'profesional', datos.profesionalId);
    exigirActivo(obtenerRecurso(db, 'sillon', datos.sillonId), 'sillon', datos.sillonId);
    const prestacion = exigirActivo(obtenerPrestacion(db, datos.prestacionId), 'prestacion', datos.prestacionId);

    const duracionMin = datos.duracionMin ?? prestacion.duracionMin;
    const intervalo = intervaloDelTurno(inicioMs, duracionMin);

    const candidatos = buscarTurnosQuePodrianChocar(db, {
      profesionalId: datos.profesionalId,
      sillonId: datos.sillonId,
      inicioMin: intervalo.inicio,
      finMin: intervalo.fin,
    });
    verificarSinConflictos({ profesionalId: datos.profesionalId, sillonId: datos.sillonId, intervalo }, candidatos);

    const ahora = reloj.ahora().toISOString();
    const estado: EstadoTurno = 'reservado';
    const id = insertarTurno(db, {
      pacienteId: datos.pacienteId,
      profesionalId: datos.profesionalId,
      sillonId: datos.sillonId,
      prestacionId: datos.prestacionId,
      inicioMin: intervalo.inicio,
      finMin: intervalo.fin,
      duracionMin,
      estado,
      creadoEn: ahora,
    });

    const turno: TurnoCreado = {
      id,
      pacienteId: datos.pacienteId,
      profesionalId: datos.profesionalId,
      sillonId: datos.sillonId,
      prestacionId: datos.prestacionId,
      inicio: aIsoLocal(intervalo.inicio * MS_POR_MINUTO),
      fin: aIsoLocal(intervalo.fin * MS_POR_MINUTO),
      duracionMin,
      estado,
    };
    insertarEventoAuditoria(db, { turnoId: id, accion: 'creado', ocurridoEn: ahora, despues: turno });
    return turno;
  });
}
