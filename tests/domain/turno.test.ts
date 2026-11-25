import { describe, expect, it } from 'vitest';
import { exigirTransicion, intervaloDelTurno, transicionValida } from '../../src/domain/turno.js';
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

// RN-TU-09: tabla completa de transiciones (5 x 5 = 25 combinaciones).
describe('máquina de estados del turno (RN-TU-09)', () => {
  const ESTADOS = ['reservado', 'confirmado', 'cancelado', 'ausente', 'atendido'] as const;
  const VALIDAS = new Set([
    'reservado>confirmado', 'reservado>cancelado', 'reservado>ausente', 'reservado>atendido',
    'confirmado>cancelado', 'confirmado>ausente', 'confirmado>atendido',
  ]);

  for (const desde of ESTADOS) {
    for (const hacia of ESTADOS) {
      const esperado = VALIDAS.has(`${desde}>${hacia}`);
      it(`${desde} → ${hacia} es ${esperado ? 'válida' : 'inválida'}`, () => {
        expect(transicionValida(desde, hacia)).toBe(esperado);
      });
    }
  }

  it('los estados finales no tienen salida', () => {
    for (const final of ['cancelado', 'ausente', 'atendido'] as const) {
      expect(ESTADOS.filter((h) => transicionValida(final, h))).toEqual([]);
    }
  });

  it('exigirTransicion no lanza en una transición válida', () => {
    expect(codigoDe(() => exigirTransicion('reservado', 'cancelado'))).toBeUndefined();
  });

  it('exigirTransicion lanza TRANSICION_INVALIDA con el detalle y un mensaje en español', () => {
    let error: unknown;
    try {
      exigirTransicion('atendido', 'cancelado');
    } catch (e) {
      error = e;
    }
    expect(error).toBeInstanceOf(ErrorDeNegocio);
    const e = error as ErrorDeNegocio;
    expect(e.codigo).toBe('TRANSICION_INVALIDA');
    expect(e.detalle).toEqual({ estadoActual: 'atendido', estadoPedido: 'cancelado' });
    expect(e.message).toBe('No se puede pasar un turno atendido a cancelado.');
  });

  it('repetir el estado actual también es inválido', () => {
    expect(codigoDe(() => exigirTransicion('confirmado', 'confirmado'))).toBe('TRANSICION_INVALIDA');
  });
});
