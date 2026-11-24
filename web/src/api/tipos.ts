// Contratos de la API (specs `catalogos` y `agenda-turnos`). La interfaz no tiene reglas propias.

export interface Paciente { id: number; nombre: string; apellido: string }
export interface Profesional { id: number; nombre: string }
export interface Sillon { id: number; nombre: string }
export interface Prestacion { id: number; nombre: string; duracionMin: number }

export interface Catalogos {
  pacientes: Paciente[]
  profesionales: Profesional[]
  sillones: Sillon[]
  prestaciones: Prestacion[]
}

export interface DatosReserva {
  pacienteId: number
  profesionalId: number
  sillonId: number
  prestacionId: number
  /** ISO 8601 con offset (ver `inicioIso`). */
  inicio: string
}

export interface TurnoCreado {
  id: number
  pacienteId: number
  profesionalId: number
  sillonId: number
  prestacionId: number
  inicio: string
  fin: string
  duracionMin: number
  estado: string
}

export type EstadoTurno = 'reservado' | 'confirmado' | 'cancelado' | 'ausente' | 'atendido'

export interface TurnoEnAgenda {
  id: number
  pacienteId: number
  pacienteNombre: string
  profesionalId: number
  profesionalNombre: string
  sillonId: number
  sillonNombre: string
  prestacionId: number
  prestacionNombre: string
  inicio: string
  fin: string
  duracionMin: number
  estado: EstadoTurno
}

export interface FiltrosAgenda {
  desde: string
  hasta: string
  profesionalId?: number
  sillonId?: number
  incluirCancelados?: boolean
}

export interface RespuestaAgenda {
  turnos: TurnoEnAgenda[]
}

export interface CatalogosAgenda {
  profesionales: Profesional[]
  sillones: Sillon[]
}

export interface Conflicto {
  recurso: 'profesional' | 'sillon'
  turnoId: number
  inicio: string
  fin: string
}

/** Error normalizado. `estado` 0 y `codigo` SIN_CONEXION cuando la API no respondió (design D6). */
export interface ErrorApi {
  estado: number
  codigo: string
  mensaje: string
  detalle: Record<string, unknown>
}

export type Resultado<T> = { ok: true; valor: T } | { ok: false; error: ErrorApi }
