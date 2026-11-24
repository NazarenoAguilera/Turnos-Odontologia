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
const DIAS_CAP = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
const MESES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
]
const MESES_CORTOS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']

export type VistaAgenda = 'dia' | 'semana'

/** "2026-12-01T10:00:00-03:00" → "martes 1/12" (texto del aviso de turno reservado). */
export function diaLegible(iso: string): string {
  const [anio, mes, dia] = iso.slice(0, 10).split('-').map(Number)
  const diaSemana = new Date(Date.UTC(anio ?? 0, (mes ?? 1) - 1, dia ?? 1)).getUTCDay()
  return `${DIAS[diaSemana] ?? ''} ${dia}/${mes}`
}

/** "2026-12-01T10:00:00-03:00" → "2026-12-01". */
export function fechaDeIso(iso: string): string {
  return iso.slice(0, 10)
}

function aFechaUtc(fechaYmd: string): Date {
  const [anio, mes, dia] = fechaYmd.split('-').map(Number)
  return new Date(Date.UTC(anio ?? 0, (mes ?? 1) - 1, dia ?? 1))
}

function formatearYmdUtc(fecha: Date): string {
  return `${fecha.getUTCFullYear()}-${dosDigitos(fecha.getUTCMonth() + 1)}-${dosDigitos(fecha.getUTCDate())}`
}

/** Suma o resta días calendario sobre una fecha `YYYY-MM-DD`. */
export function sumarDias(fechaYmd: string, dias: number): string {
  const fecha = aFechaUtc(fechaYmd)
  fecha.setUTCDate(fecha.getUTCDate() + dias)
  return formatearYmdUtc(fecha)
}

/** Devuelve el lunes (`YYYY-MM-DD`) de la semana ISO que contiene a `fechaYmd`. */
export function lunesDeSemana(fechaYmd: string): string {
  const diaSemana = aFechaUtc(fechaYmd).getUTCDay()
  const desplazamiento = diaSemana === 0 ? -6 : 1 - diaSemana
  return sumarDias(fechaYmd, desplazamiento)
}

/** Calcula el rango semiabierto `[desde, hasta)` en la zona del consultorio. */
export function rangoAgenda(
  fechaBase: string,
  vista: VistaAgenda,
  zona: string = ZONA_CONSULTORIO,
): { desde: string; hasta: string } {
  const inicioDia = vista === 'dia' ? fechaBase : lunesDeSemana(fechaBase)
  const finDia = sumarDias(inicioDia, vista === 'dia' ? 1 : 7)
  return {
    desde: inicioIso(inicioDia, '00:00', zona),
    hasta: inicioIso(finDia, '00:00', zona),
  }
}

/** "2026-12-01" → "Martes 1 de diciembre". */
export function tituloDia(fechaYmd: string): string {
  const fecha = aFechaUtc(fechaYmd)
  const nombreDia = DIAS_CAP[fecha.getUTCDay()] ?? ''
  const numero = fecha.getUTCDate()
  const mes = MESES[fecha.getUTCMonth()] ?? ''
  return `${nombreDia} ${numero} de ${mes}`
}

/** "2026-12-01" → "30 nov – 6 dic 2026". */
export function tituloSemana(fechaBase: string): string {
  const lunes = aFechaUtc(lunesDeSemana(fechaBase))
  const domingo = aFechaUtc(sumarDias(formatearYmdUtc(lunes), 6))
  const d1 = lunes.getUTCDate()
  const m1 = MESES_CORTOS[lunes.getUTCMonth()] ?? ''
  const a1 = lunes.getUTCFullYear()
  const d2 = domingo.getUTCDate()
  const m2 = MESES_CORTOS[domingo.getUTCMonth()] ?? ''
  const a2 = domingo.getUTCFullYear()

  if (a1 !== a2) {
    return `${d1} ${m1} ${a1} – ${d2} ${m2} ${a2}`
  }
  if (m1 === m2) {
    return `${d1} – ${d2} ${m2} ${a2}`
  }
  return `${d1} ${m1} – ${d2} ${m2} ${a2}`
}
