import { ErrorDeNegocio } from './errores.js';
import { Intervalo } from './intervalo.js';
import { horaLocal, MS_POR_MINUTO } from './tiempo.js';

/** Estados posibles de un turno (RN-TU-09). En C-01 solo se crean turnos `reservado`. */
export type EstadoTurno = 'reservado' | 'confirmado' | 'cancelado' | 'ausente' | 'atendido';

/** Paso de la grilla de inicio y de la duración, en minutos (RN-TU-05, RN-TU-06). */
export const PASO_GRILLA_MIN = 15;

/** Valida la duración: entera, mayor que cero y múltiplo de 15 (RN-TU-06, PA-02). */
export function validarDuracion(duracionMin: number): void {
  if (!Number.isInteger(duracionMin) || duracionMin <= 0 || duracionMin % PASO_GRILLA_MIN !== 0) {
    throw new ErrorDeNegocio(
      'DURACION_INVALIDA',
      `La duración debe ser un número entero de minutos mayor que cero y múltiplo de ${PASO_GRILLA_MIN}.`,
      { duracionMin },
    );
  }
}

/** Valida que el inicio caiga en la grilla de 15 minutos de la hora local (RN-TU-05). */
export function validarInicioEnGrilla(inicioMs: number): void {
  const local = horaLocal(inicioMs);
  const enGrilla =
    inicioMs % 1000 === 0 && local.segundo === 0 && local.minuto % PASO_GRILLA_MIN === 0;
  if (!enGrilla) {
    throw new ErrorDeNegocio(
      'INICIO_FUERA_DE_GRILLA',
      `El turno debe empezar en un múltiplo de ${PASO_GRILLA_MIN} minutos (:00, :15, :30 o :45).`,
      { inicioLocal: local },
    );
  }
}

/**
 * Calcula el intervalo [inicio, fin) del turno en minutos Unix, con fin = inicio + duración,
 * después de validar la grilla y la duración.
 */
export function intervaloDelTurno(inicioMs: number, duracionMin: number): Intervalo {
  validarInicioEnGrilla(inicioMs);
  validarDuracion(duracionMin);
  const inicioMin = inicioMs / MS_POR_MINUTO;
  return new Intervalo(inicioMin, inicioMin + duracionMin);
}
