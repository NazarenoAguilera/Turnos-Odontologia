/** Zona del consultorio (RN-AG-04). El offset se calcula siempre a partir de ella. */
export const ZONA_CONSULTORIO = 'America/Argentina/Buenos_Aires'

const MS_POR_MINUTO = 60_000

const formateadores = new Map<string, Intl.DateTimeFormat>()

function formateadorDeOffset(zona: string): Intl.DateTimeFormat {
  let f = formateadores.get(zona)
  if (!f) {
    f = new Intl.DateTimeFormat('en-US', { timeZone: zona, timeZoneName: 'longOffset' })
    formateadores.set(zona, f)
  }
  return f
}

/** Minutos que la zona está desplazada respecto de UTC en ese instante ("GMT-03:00" → -180, "GMT" → 0). */
function offsetEnMinutos(instanteMs: number, zona: string): number {
  const nombre = formateadorDeOffset(zona)
    .formatToParts(new Date(instanteMs))
    .find((p) => p.type === 'timeZoneName')?.value ?? 'GMT'
  const m = /^GMT(?:([+-])(\d{2}):(\d{2}))?$/.exec(nombre)
  if (!m || !m[1]) return 0
  const minutos = Number(m[2]) * 60 + Number(m[3])
  return m[1] === '-' ? -minutos : minutos
}

const dosDigitos = (n: number) => String(n).padStart(2, '0')

function formatearOffset(minutos: number): string {
  const signo = minutos < 0 ? '-' : '+'
  const abs = Math.abs(minutos)
  return `${signo}${dosDigitos(Math.floor(abs / 60))}:${dosDigitos(abs % 60)}`
}

/**
 * Arma el `inicio` ISO 8601 que espera `POST /turnos` a partir de la fecha y la hora
 * de pared elegidas en el formulario, con el offset que la zona tiene en ese momento
 * (design D7). Nunca usa un offset fijo ni el huso de la máquina.
 *
 * @param fecha `YYYY-MM-DD` (valor de un `<input type="date">`)
 * @param hora `HH:MM` (valor de un `<input type="time">`)
 */
export function inicioIso(fecha: string, hora: string, zona: string = ZONA_CONSULTORIO): string {
  const [anio, mes, dia] = fecha.split('-').map(Number)
  const [hh, mm] = hora.split(':').map(Number)
  const paredComoUtc = Date.UTC(anio ?? 0, (mes ?? 1) - 1, dia ?? 1, hh ?? 0, mm ?? 0)
  // Primera aproximación con el offset en la hora de pared tomada como UTC; se recalcula
  // en el instante real para acertar si el offset cambia entre ambos (horario de verano).
  const aproximado = paredComoUtc - offsetEnMinutos(paredComoUtc, zona) * MS_POR_MINUTO
  const offset = offsetEnMinutos(aproximado, zona)
  return `${fecha}T${hora}:00${formatearOffset(offset)}`
}

/** "2026-12-01T10:30:00-03:00" → "10:30". La API ya devuelve la hora local del consultorio. */
export function horaDeIso(iso: string): string {
  return iso.slice(11, 16)
}

/** Fecha de hoy (`YYYY-MM-DD`) en la zona del consultorio, para el valor inicial del formulario. */
export function hoyEnZona(ahora: Date = new Date(), zona: string = ZONA_CONSULTORIO): string {
  // en-CA formatea como YYYY-MM-DD.
  return new Intl.DateTimeFormat('en-CA', { timeZone: zona, year: 'numeric', month: '2-digit', day: '2-digit' }).format(ahora)
}

const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado']

/** "2026-12-01T10:00:00-03:00" → "martes 1/12" (texto del aviso de turno reservado). */
export function diaLegible(iso: string): string {
  const [anio, mes, dia] = iso.slice(0, 10).split('-').map(Number)
  const diaSemana = new Date(Date.UTC(anio ?? 0, (mes ?? 1) - 1, dia ?? 1)).getUTCDay()
  return `${DIAS[diaSemana] ?? ''} ${dia}/${mes}`
}
