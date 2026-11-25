import type { ErrorApi } from './tipos'

export type Tono = 'success' | 'warning' | 'danger'

export interface DescripcionError {
  titulo: string
  ayuda: string
  tono: Tono
  /** Va al final del aviso, en monoespaciada (design-system/brand.md). */
  codigoTecnico: string
}

/**
 * Textos por código (tabla del explore y design D6). Solo traduce: la regla la
 * decidió la API. Español rioplatense, en segunda persona.
 */
const TEXTOS: Record<string, { titulo: string; ayuda: string; tono: Tono }> = {
  TURNO_SOLAPADO_SILLON: {
    titulo: 'El sillón ya está ocupado en ese horario',
    ayuda: 'Probá otro horario u otro sillón.',
    tono: 'danger',
  },
  TURNO_SOLAPADO_PROFESIONAL: {
    titulo: 'El profesional ya tiene un turno en ese horario',
    ayuda: 'Probá otro horario u otro profesional.',
    tono: 'danger',
  },
  INICIO_FUERA_DE_GRILLA: {
    titulo: 'La hora tiene que caer en la grilla de 15 minutos',
    ayuda: 'Elegí :00, :15, :30 o :45.',
    tono: 'warning',
  },
  DURACION_INVALIDA: {
    titulo: 'La duración no es válida',
    ayuda: 'Tiene que ser mayor que cero y múltiplo de 15 minutos.',
    tono: 'warning',
  },
  RECURSO_INACTIVO: {
    titulo: 'Uno de los datos elegidos está dado de baja',
    ayuda: 'Recargá la página y elegí de nuevo.',
    tono: 'warning',
  },
  RECURSO_INEXISTENTE: {
    titulo: 'No encontramos uno de los datos elegidos',
    ayuda: 'Recargá la página y elegí de nuevo.',
    tono: 'danger',
  },
  SOLICITUD_INVALIDA: {
    titulo: 'Faltan datos o tienen otro formato',
    ayuda: 'Revisá que estén completos todos los campos.',
    tono: 'danger',
  },
  TRANSICION_INVALIDA: {
    titulo: 'El turno ya no se puede cambiar a ese estado',
    ayuda: 'Alguien lo modificó antes. Actualizamos la agenda con su estado actual.',
    tono: 'warning',
  },
  SIN_CONEXION: {
    titulo: 'No pudimos conectar con el servidor',
    ayuda: 'Revisá que la API esté levantada y volvé a intentar.',
    tono: 'danger',
  },
}

export function describirError(error: ErrorApi): DescripcionError {
  const codigoTecnico = error.estado > 0 ? `${error.estado} ${error.codigo}` : error.codigo
  const conocido = TEXTOS[error.codigo]
  if (conocido) return { ...conocido, codigoTecnico }
  // Código que la interfaz todavía no conoce (p. ej. FUERA_DE_HORARIO de C-03): mensaje del backend tal cual.
  return {
    titulo: error.mensaje,
    ayuda: '',
    tono: error.estado === 422 ? 'warning' : 'danger',
    codigoTecnico,
  }
}
