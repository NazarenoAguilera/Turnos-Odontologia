import type { DatabaseSync } from 'node:sqlite';
import { filtrarTurnosEnRango, intervaloDeRango } from '../domain/agenda.js';
import { aIsoLocal, MS_POR_MINUTO } from '../domain/tiempo.js';
import type { EstadoTurno } from '../domain/turno.js';
import { listarTurnosEnRango } from '../infrastructure/sqlite/repositorios.js';

export interface ConsultaAgenda {
  /** ISO 8601 con offset obligatorio. */
  desde: string;
  /** ISO 8601 con offset obligatorio. */
  hasta: string;
  profesionalId?: number;
  sillonId?: number;
  incluirCancelados?: boolean;
}

export interface TurnoEnAgenda {
  id: number;
  pacienteId: number;
  pacienteNombre: string;
  profesionalId: number;
  profesionalNombre: string;
  sillonId: number;
  sillonNombre: string;
  prestacionId: number;
  prestacionNombre: string;
  inicio: string;
  fin: string;
  duracionMin: number;
  estado: EstadoTurno;
}

export interface ResultadoAgenda {
  turnos: TurnoEnAgenda[];
}

/**
 * Caso de uso: consultar la agenda diaria o semanal en el rango semiabierto [desde, hasta).
 * Verifica la intersección mediante Intervalo (RN-TU-02) y expresa las horas en la zona
 * del consultorio (RN-AG-04).
 */
export function consultarAgenda(db: DatabaseSync, consulta: ConsultaAgenda): ResultadoAgenda {
  const rango = intervaloDeRango(consulta.desde, consulta.hasta);

  const candidatos = listarTurnosEnRango(db, {
    desdeMin: rango.inicio,
    hastaMin: rango.fin,
    profesionalId: consulta.profesionalId,
    sillonId: consulta.sillonId,
    incluirCancelados: consulta.incluirCancelados ?? false,
  });

  const turnos = filtrarTurnosEnRango(rango, candidatos).map((t) => ({
    id: t.id,
    pacienteId: t.pacienteId,
    pacienteNombre: `${t.pacienteNombre} ${t.pacienteApellido}`,
    profesionalId: t.profesionalId,
    profesionalNombre: t.profesionalNombre,
    sillonId: t.sillonId,
    sillonNombre: t.sillonNombre,
    prestacionId: t.prestacionId,
    prestacionNombre: t.prestacionNombre,
    inicio: aIsoLocal(t.inicioMin * MS_POR_MINUTO),
    fin: aIsoLocal(t.finMin * MS_POR_MINUTO),
    duracionMin: t.duracionMin,
    estado: t.estado,
  }));

  return { turnos };
}
