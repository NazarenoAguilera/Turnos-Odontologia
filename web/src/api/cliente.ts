import type {
  Catalogos,
  CatalogosAgenda,
  DatosReserva,
  ErrorApi,
  FiltrosAgenda,
  Profesional,
  RespuestaAgenda,
  Resultado,
  Sillon,
  TurnoCreado,
  TurnoEnAgenda,
} from './tipos'

/** Prefijo que el proxy de Vite reenvía a la API sin el `/api` (design D5). */
const BASE = '/api'

const SIN_CONEXION: ErrorApi = {
  estado: 0,
  codigo: 'SIN_CONEXION',
  mensaje: 'No pudimos conectar con el servidor.',
  detalle: {},
}

function esErrorDeApi(cuerpo: unknown): cuerpo is { error: { codigo: string; mensaje: string; detalle?: unknown } } {
  if (typeof cuerpo !== 'object' || cuerpo === null || !('error' in cuerpo)) return false
  const e = (cuerpo as { error: unknown }).error
  return typeof e === 'object' && e !== null
    && typeof (e as { codigo?: unknown }).codigo === 'string'
    && typeof (e as { mensaje?: unknown }).mensaje === 'string'
}

/**
 * Hace el pedido y devuelve el resultado como valor: nunca lanza.
 * Si la API no responde, o responde algo que no es su formato de error
 * (por ejemplo, el proxy sin la API levantada), el error es SIN_CONEXION.
 */
async function pedir<T>(ruta: string, init?: RequestInit): Promise<Resultado<T>> {
  let respuesta: Response
  try {
    respuesta = await fetch(`${BASE}${ruta}`, init)
  } catch {
    return { ok: false, error: SIN_CONEXION }
  }

  let cuerpo: unknown
  try {
    cuerpo = await respuesta.json()
  } catch {
    return { ok: false, error: SIN_CONEXION }
  }

  if (respuesta.ok) return { ok: true, valor: cuerpo as T }
  if (esErrorDeApi(cuerpo)) {
    const { codigo, mensaje, detalle } = cuerpo.error
    return {
      ok: false,
      error: {
        estado: respuesta.status,
        codigo,
        mensaje,
        detalle: typeof detalle === 'object' && detalle !== null ? (detalle as Record<string, unknown>) : {},
      },
    }
  }
  return { ok: false, error: SIN_CONEXION }
}

/** Los 4 GET de catálogos en paralelo. Si falla uno, devuelve el primer error. */
export async function obtenerCatalogos(): Promise<Resultado<Catalogos>> {
  const [pacientes, profesionales, sillones, prestaciones] = await Promise.all([
    pedir<Catalogos['pacientes']>('/pacientes'),
    pedir<Catalogos['profesionales']>('/profesionales'),
    pedir<Catalogos['sillones']>('/sillones'),
    pedir<Catalogos['prestaciones']>('/prestaciones'),
  ])
  if (!pacientes.ok) return pacientes
  if (!profesionales.ok) return profesionales
  if (!sillones.ok) return sillones
  if (!prestaciones.ok) return prestaciones
  return {
    ok: true,
    valor: {
      pacientes: pacientes.valor,
      profesionales: profesionales.valor,
      sillones: sillones.valor,
      prestaciones: prestaciones.valor,
    },
  }
}

/** `POST /turnos`. No manda `duracionMin`: vale la de la prestación (design D8). */
export function reservarTurno(datos: DatosReserva): Promise<Resultado<TurnoCreado>> {
  return pedir<TurnoCreado>('/turnos', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(datos),
  })
}

/** Carga en paralelo los catálogos usados en los filtros de la pantalla Agenda. */
export async function obtenerCatalogosAgenda(): Promise<Resultado<CatalogosAgenda>> {
  const [profesionales, sillones] = await Promise.all([
    pedir<Profesional[]>('/profesionales'),
    pedir<Sillon[]>('/sillones'),
  ])
  if (!profesionales.ok) return profesionales
  if (!sillones.ok) return sillones
  return {
    ok: true,
    valor: {
      profesionales: profesionales.valor,
      sillones: sillones.valor,
    },
  }
}

/** `GET /turnos` para un rango [desde, hasta) con filtros opcionales. */
export async function consultarAgenda(filtros: FiltrosAgenda): Promise<Resultado<TurnoEnAgenda[]>> {
  const params = new URLSearchParams({
    desde: filtros.desde,
    hasta: filtros.hasta,
  })
  if (filtros.profesionalId !== undefined) {
    params.set('profesionalId', String(filtros.profesionalId))
  }
  if (filtros.sillonId !== undefined) {
    params.set('sillonId', String(filtros.sillonId))
  }
  if (filtros.incluirCancelados === true) {
    params.set('incluirCancelados', 'true')
  }

  const r = await pedir<RespuestaAgenda>(`/turnos?${params.toString()}`)
  if (!r.ok) return r
  return { ok: true, valor: r.valor.turnos }
}

/** Acciones de la Agenda sobre un turno (C-05). Ausente y Atendido quedan solo en la API. */
export type AccionTurno = 'cancelar' | 'confirmar'

/** `POST /turnos/:id/<accion>` sin cuerpo. Devuelve el turno actualizado o el error normalizado. */
export function cambiarEstado(id: number, accion: AccionTurno): Promise<Resultado<TurnoCreado>> {
  return pedir<TurnoCreado>(`/turnos/${id}/${accion}`, { method: 'POST' })
}
