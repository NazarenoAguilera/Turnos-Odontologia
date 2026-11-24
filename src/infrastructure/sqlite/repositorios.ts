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

export interface FiltroAgenda {
  desdeMin: number;
  hastaMin: number;
  profesionalId?: number;
  sillonId?: number;
  incluirCancelados: boolean;
}

export interface FilaTurnoEnAgenda {
  id: number;
  pacienteId: number;
  pacienteNombre: string;
  pacienteApellido: string;
  profesionalId: number;
  profesionalNombre: string;
  sillonId: number;
  sillonNombre: string;
  prestacionId: number;
  prestacionNombre: string;
  inicioMin: number;
  finMin: number;
  duracionMin: number;
  estado: EstadoTurno;
}

/**
 * Consulta turnos en el rango [desdeMin, hastaMin) unidos con sus recursos y ordenados por inicio.
 * La intersección final se confirma en aplicación/dominio con Intervalo (RN-TU-02).
 */
export function listarTurnosEnRango(db: DatabaseSync, f: FiltroAgenda): FilaTurnoEnAgenda[] {
  const filas = db
    .prepare(
      `SELECT t.id,
              t.paciente_id, pa.nombre AS paciente_nombre, pa.apellido AS paciente_apellido,
              t.profesional_id, pr.nombre AS profesional_nombre,
              t.sillon_id, s.nombre AS sillon_nombre,
              t.prestacion_id, pre.nombre AS prestacion_nombre,
              t.inicio_min, t.fin_min, t.duracion_min, t.estado
         FROM turno t
         JOIN paciente pa    ON pa.id  = t.paciente_id
         JOIN profesional pr ON pr.id  = t.profesional_id
         JOIN sillon s       ON s.id   = t.sillon_id
         JOIN prestacion pre ON pre.id = t.prestacion_id
        WHERE t.inicio_min < :hasta
          AND :desde < t.fin_min
          AND (:profesionalId IS NULL OR t.profesional_id = :profesionalId)
          AND (:sillonId IS NULL OR t.sillon_id = :sillonId)
          AND (:incluirCancelados = 1 OR t.estado <> 'cancelado')
        ORDER BY t.inicio_min ASC, t.id ASC`,
    )
    .all({
      desde: f.desdeMin,
      hasta: f.hastaMin,
      profesionalId: f.profesionalId ?? null,
      sillonId: f.sillonId ?? null,
      incluirCancelados: f.incluirCancelados ? 1 : 0,
    }) as Array<{
    id: number;
    paciente_id: number;
    paciente_nombre: string;
    paciente_apellido: string;
    profesional_id: number;
    profesional_nombre: string;
    sillon_id: number;
    sillon_nombre: string;
    prestacion_id: number;
    prestacion_nombre: string;
    inicio_min: number;
    fin_min: number;
    duracion_min: number;
    estado: EstadoTurno;
  }>;

  return filas.map((r) => ({
    id: r.id,
    pacienteId: r.paciente_id,
    pacienteNombre: r.paciente_nombre,
    pacienteApellido: r.paciente_apellido,
    profesionalId: r.profesional_id,
    profesionalNombre: r.profesional_nombre,
    sillonId: r.sillon_id,
    sillonNombre: r.sillon_nombre,
    prestacionId: r.prestacion_id,
    prestacionNombre: r.prestacion_nombre,
    inicioMin: r.inicio_min,
    finMin: r.fin_min,
    duracionMin: r.duracion_min,
    estado: r.estado,
  }));
}
