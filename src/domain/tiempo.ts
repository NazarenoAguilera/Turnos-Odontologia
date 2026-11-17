import { ErrorDeNegocio } from './errores.js';

/** Zona horaria del consultorio (RN-AG-04). Nunca se fija un offset a mano. */
export const ZONA_CONSULTORIO = 'America/Argentina/Buenos_Aires';

export const MS_POR_MINUTO = 60_000;

export interface HoraLocal {
  anio: number;
  mes: number;
  dia: number;
  hora: number;
  minuto: number;
  segundo: number;
}

const ISO_CON_OFFSET = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d{1,3})?)?(Z|[+-]\d{2}:\d{2})$/;

const formateadores = new Map<string, Intl.DateTimeFormat>();

function formateador(zona: string): Intl.DateTimeFormat {
  let f = formateadores.get(zona);
  if (!f) {
    f = new Intl.DateTimeFormat('en-US', {
      timeZone: zona,
      hourCycle: 'h23',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
    formateadores.set(zona, f);
  }
  return f;
}

/**
 * Convierte un ISO 8601 con offset obligatorio a un instante en milisegundos.
 * Sin offset la hora sería ambigua: se rechaza con SOLICITUD_INVALIDA (design D3).
 */
export function instanteDesdeIso(iso: string): number {
  const ms = ISO_CON_OFFSET.test(iso) ? Date.parse(iso) : Number.NaN;
  if (Number.isNaN(ms)) {
    throw new ErrorDeNegocio(
      'SOLICITUD_INVALIDA',
      'El inicio debe ser una fecha y hora ISO 8601 con zona horaria, por ejemplo 2026-12-01T10:00:00-03:00.',
      { campo: 'inicio', valor: iso },
    );
  }
  return ms;
}

/** Hora de pared del instante en la zona indicada (por defecto, la del consultorio). */
export function horaLocal(ms: number, zona: string = ZONA_CONSULTORIO): HoraLocal {
  const partes = Object.fromEntries(
    formateador(zona)
      .formatToParts(new Date(ms))
      .filter((p) => p.type !== 'literal')
      .map((p) => [p.type, Number(p.value)]),
  ) as Record<string, number>;
  return {
    anio: partes.year ?? 0,
    mes: partes.month ?? 0,
    dia: partes.day ?? 0,
    hora: partes.hour ?? 0,
    minuto: partes.minute ?? 0,
    segundo: partes.second ?? 0,
  };
}

const dosDigitos = (n: number) => String(n).padStart(2, '0');

/** Formatea un instante como ISO 8601 con el offset que la zona tiene en ese momento. */
export function aIsoLocal(ms: number, zona: string = ZONA_CONSULTORIO): string {
  const l = horaLocal(ms, zona);
  const paredComoUtc = Date.UTC(l.anio, l.mes - 1, l.dia, l.hora, l.minuto, l.segundo);
  const offsetMin = Math.round((paredComoUtc - Math.floor(ms / 1000) * 1000) / MS_POR_MINUTO);
  const signo = offsetMin < 0 ? '-' : '+';
  const abs = Math.abs(offsetMin);
  return (
    `${l.anio}-${dosDigitos(l.mes)}-${dosDigitos(l.dia)}` +
    `T${dosDigitos(l.hora)}:${dosDigitos(l.minuto)}:${dosDigitos(l.segundo)}` +
    `${signo}${dosDigitos(Math.floor(abs / 60))}:${dosDigitos(abs % 60)}`
  );
}
