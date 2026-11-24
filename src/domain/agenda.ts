import { ErrorDeNegocio } from './errores.js';
import { Intervalo } from './intervalo.js';
import { instanteDesdeIso, MS_POR_MINUTO } from './tiempo.js';

/**
 * Construye el intervalo semiabierto [desde, hasta) en minutos Unix enteros
 * a partir de dos fechas ISO 8601 con offset obligatorio (RN-TU-02, RN-AG-04).
 */
export function intervaloDeRango(desdeIso: string, hastaIso: string): Intervalo {
  const desdeMs = instanteDesdeIso(desdeIso, 'desde');
  const hastaMs = instanteDesdeIso(hastaIso, 'hasta');

  if (desdeMs >= hastaMs) {
    throw new ErrorDeNegocio(
      'SOLICITUD_INVALIDA',
      'El parámetro "desde" debe ser anterior a "hasta".',
      { desde: desdeIso, hasta: hastaIso },
    );
  }

  const desdeMin = Math.floor(desdeMs / MS_POR_MINUTO);
  const hastaMin = Math.ceil(hastaMs / MS_POR_MINUTO);
  return new Intervalo(desdeMin, hastaMin);
}

/**
 * Confirma la intersección semiabierta de cada turno contra el rango consultado
 * utilizando exclusivamente Intervalo.seSuperponeCon (regla dura / RN-TU-02).
 */
export function filtrarTurnosEnRango<T extends { inicioMin: number; finMin: number }>(
  rango: Intervalo,
  turnos: T[],
): T[] {
  return turnos.filter((t) => rango.seSuperponeCon(new Intervalo(t.inicioMin, t.finMin)));
}
