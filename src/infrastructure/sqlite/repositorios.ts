import type { DatabaseSync } from 'node:sqlite';
import type { TurnoOcupante } from '../../domain/conflictos.js';
import type { EstadoTurno } from '../../domain/turno.js';

// Todas las consultas usan sentencias preparadas con parámetros (regla dura del proyecto).

export type TipoRecurso = 'paciente' | 'profesional' | 'sillon';

export interface RecursoActivo {
  id: number;
  activo: boolean;
}

const CONSULTA_RECURSO: Record<TipoRecurso, string> = {
  paciente: 'SELECT id, 1 AS activo FROM paciente WHERE id = ?',
  profesional: 'SELECT id, activo FROM profesional WHERE id = ?',
  sillon: 'SELECT id, activo FROM sillon WHERE id = ?',
};

export function obtenerRecurso(db: DatabaseSync, tipo: TipoRecurso, id: number): RecursoActivo | undefined {
  const fila = db.prepare(CONSULTA_RECURSO[tipo]).get(id) as { id: number; activo: number } | undefined;
  return fila ? { id: fila.id, activo: fila.activo === 1 } : undefined;
}

export interface PrestacionActiva extends RecursoActivo {
  duracionMin: number;
}

export function obtenerPrestacion(db: DatabaseSync, id: number): PrestacionActiva | undefined {
  const fila = db
    .prepare('SELECT id, activa, duracion_min FROM prestacion WHERE id = ?')
    .get(id) as { id: number; activa: number; duracion_min: number } | undefined;
  return fila ? { id: fila.id, activo: fila.activa === 1, duracionMin: fila.duracion_min } : undefined;
}

export interface FiltroCandidatos {
  profesionalId: number;
  sillonId: number;
  inicioMin: number;
  finMin: number;
}

/**
 * Pre-filtro indexado de turnos no cancelados del mismo profesional o sillón que
 * podrían superponerse. La decisión final la toma el dominio con Intervalo (design D2).
 */
export function buscarTurnosQuePodrianChocar(db: DatabaseSync, f: FiltroCandidatos): TurnoOcupante[] {
  const filas = db
    .prepare(
      `SELECT id, profesional_id, sillon_id, inicio_min, fin_min, estado
         FROM turno
        WHERE estado <> 'cancelado'
          AND inicio_min < :fin AND :inicio < fin_min
          AND (profesional_id = :profesional OR sillon_id = :sillon)`,
    )
    .all({ fin: f.finMin, inicio: f.inicioMin, profesional: f.profesionalId, sillon: f.sillonId }) as Array<{
    id: number; profesional_id: number; sillon_id: number; inicio_min: number; fin_min: number; estado: EstadoTurno;
  }>;
  return filas.map((r) => ({
    id: r.id,
    profesionalId: r.profesional_id,
    sillonId: r.sillon_id,
    inicioMin: r.inicio_min,
    finMin: r.fin_min,
    estado: r.estado,
  }));
}

export interface NuevoTurno {
  pacienteId: number;
  profesionalId: number;
  sillonId: number;
  prestacionId: number;
  inicioMin: number;
  finMin: number;
  duracionMin: number;
  estado: EstadoTurno;
  creadoEn: string;
}

export function insertarTurno(db: DatabaseSync, t: NuevoTurno): number {
  const r = db
    .prepare(
      `INSERT INTO turno (paciente_id, profesional_id, sillon_id, prestacion_id, inicio_min, fin_min,
                          duracion_min, estado, creado_en, actualizado_en)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(t.pacienteId, t.profesionalId, t.sillonId, t.prestacionId, t.inicioMin, t.finMin,
      t.duracionMin, t.estado, t.creadoEn, t.creadoEn);
  return Number(r.lastInsertRowid);
}

export interface NuevoEventoAuditoria {
  turnoId: number;
  accion: 'creado' | 'cancelado' | 'reprogramado' | 'estado_cambiado';
  ocurridoEn: string;
  usuarioId?: number | null;
  antes?: unknown;
  despues?: unknown;
}

export function insertarEventoAuditoria(db: DatabaseSync, e: NuevoEventoAuditoria): number {
  const r = db
    .prepare(
      `INSERT INTO evento_auditoria (turno_id, accion, usuario_id, ocurrido_en, antes, despues)
       VALUES (?, ?, ?, ?, ?, ?)`,
    )
    .run(e.turnoId, e.accion, e.usuarioId ?? null, e.ocurridoEn,
      e.antes === undefined ? null : JSON.stringify(e.antes),
      e.despues === undefined ? null : JSON.stringify(e.despues));
  return Number(r.lastInsertRowid);
}
