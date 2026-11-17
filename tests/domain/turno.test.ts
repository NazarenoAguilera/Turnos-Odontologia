import { describe, expect, it } from 'vitest';
import { intervaloDelTurno } from '../../src/domain/turno.js';
import { instanteDesdeIso } from '../../src/domain/tiempo.js';
import { ErrorDeNegocio } from '../../src/domain/errores.js';

const minutos = (iso: string) => instanteDesdeIso(iso) / 60_000;

function codigoDe(fn: () => unknown): string | undefined {
  try {
    fn();
  } catch (e) {
    return e instanceof ErrorDeNegocio ? e.codigo : 'OTRO_ERROR';
  }
  return undefined;
}

describe('intervaloDelTurno', () => {
  it('calcula [inicio, fin) con fin = inicio + duración', () => {
    const intervalo = intervaloDelTurno(instanteDesdeIso('2026-12-01T10:00:00-03:00'), 30);
    expect(intervalo.inicio).toBe(minutos('2026-12-01T10:00:00-03:00'));
    expect(intervalo.fin).toBe(minutos('2026-12-01T10:30:00-03:00'));
  });

  it('acepta inicios en :00, :15, :30 y :45', () => {
    for (const hhmm of ['09:00', '09:15', '09:30', '09:45']) {
      expect(() => intervaloDelTurno(instanteDesdeIso(`2026-12-01T${hhmm}:00-03:00`), 15)).not.toThrow();
    }
  });

  it('rechaza un inicio 10:10 con INICIO_FUERA_DE_GRILLA', () => {
    expect(codigoDe(() => intervaloDelTurno(instanteDesdeIso('2026-12-01T10:10:00-03:00'), 30)))
      .toBe('INICIO_FUERA_DE_GRILLA');
  });

  it('rechaza un inicio con segundos distintos de cero con INICIO_FUERA_DE_GRILLA', () => {
    expect(codigoDe(() => intervaloDelTurno(instanteDesdeIso('2026-12-01T10:15:30-03:00'), 30)))
      .toBe('INICIO_FUERA_DE_GRILLA');
  });

  it('evalúa la grilla en hora local aunque el ISO venga en UTC', () => {
    // 13:15Z = 10:15 en Argentina: dentro de la grilla.
    expect(() => intervaloDelTurno(instanteDesdeIso('2026-12-01T13:15:00Z'), 30)).not.toThrow();
  });

  it('rechaza una duración de 20 minutos con DURACION_INVALIDA', () => {
    expect(codigoDe(() => intervaloDelTurno(instanteDesdeIso('2026-12-01T10:00:00-03:00'), 20)))
      .toBe('DURACION_INVALIDA');
  });

  it('rechaza una duración de 0 y una negativa con DURACION_INVALIDA', () => {
    const inicio = instanteDesdeIso('2026-12-01T10:00:00-03:00');
    expect(codigoDe(() => intervaloDelTurno(inicio, 0))).toBe('DURACION_INVALIDA');
    expect(codigoDe(() => intervaloDelTurno(inicio, -15))).toBe('DURACION_INVALIDA');
  });
});
