import { describe, expect, it } from 'vitest';
import { filtrarTurnosEnRango, intervaloDeRango } from '../../src/domain/agenda.js';
import { ErrorDeNegocio } from '../../src/domain/errores.js';
import { MS_POR_MINUTO } from '../../src/domain/tiempo.js';

const min = (iso: string) => Math.trunc(Date.parse(iso) / MS_POR_MINUTO);

function codigoDe(fn: () => unknown): string | undefined {
  try {
    fn();
  } catch (e) {
    if (e instanceof ErrorDeNegocio) return e.codigo;
    throw e;
  }
  return undefined;
}

describe('intervaloDeRango', () => {
  it('construye el Intervalo semiabierto en minutos Unix para un rango diario válido', () => {
    const rango = intervaloDeRango('2026-12-01T00:00:00-03:00', '2026-12-02T00:00:00-03:00');
    expect(rango.inicio).toBe(min('2026-12-01T00:00:00-03:00'));
    expect(rango.fin).toBe(min('2026-12-02T00:00:00-03:00'));
  });

  it('redondea con floor/ceil cuando los extremos incluyen segundos', () => {
    const rango = intervaloDeRango('2026-12-01T10:00:30-03:00', '2026-12-01T11:59:30-03:00');
    expect(rango.inicio).toBe(min('2026-12-01T10:00:00-03:00'));
    expect(rango.fin).toBe(min('2026-12-01T12:00:00-03:00'));
  });

  it('rechaza un rango vacío o invertido con SOLICITUD_INVALIDA', () => {
    expect(
      codigoDe(() => intervaloDeRango('2026-12-01T10:00:00-03:00', '2026-12-01T10:00:00-03:00')),
    ).toBe('SOLICITUD_INVALIDA');
    expect(
      codigoDe(() => intervaloDeRango('2026-12-01T12:00:00-03:00', '2026-12-01T10:00:00-03:00')),
    ).toBe('SOLICITUD_INVALIDA');
  });

  it('rechaza fechas sin offset en desde o hasta con SOLICITUD_INVALIDA', () => {
    expect(
      codigoDe(() => intervaloDeRango('2026-12-01T00:00:00', '2026-12-02T00:00:00-03:00')),
    ).toBe('SOLICITUD_INVALIDA');
    expect(
      codigoDe(() => intervaloDeRango('2026-12-01T00:00:00-03:00', '2026-12-02T00:00:00')),
    ).toBe('SOLICITUD_INVALIDA');
  });
});

describe('filtrarTurnosEnRango', () => {
  const rango = intervaloDeRango('2026-12-01T10:00:00-03:00', '2026-12-01T12:00:00-03:00');

  it('incluye turnos que cruzan el borde inicial, el borde final o están contenidos', () => {
    const candidatos = [
      { id: 1, inicioMin: min('2026-12-01T09:30:00-03:00'), finMin: min('2026-12-01T10:30:00-03:00') },
      { id: 2, inicioMin: min('2026-12-01T10:30:00-03:00'), finMin: min('2026-12-01T11:00:00-03:00') },
      { id: 3, inicioMin: min('2026-12-01T11:30:00-03:00'), finMin: min('2026-12-01T12:30:00-03:00') },
    ];
    expect(filtrarTurnosEnRango(rango, candidatos).map((t) => t.id)).toEqual([1, 2, 3]);
  });

  it('excluye turnos contiguos en ambos bordes del rango', () => {
    const candidatos = [
      { id: 1, inicioMin: min('2026-12-01T09:30:00-03:00'), finMin: min('2026-12-01T10:00:00-03:00') },
      { id: 2, inicioMin: min('2026-12-01T12:00:00-03:00'), finMin: min('2026-12-01T12:30:00-03:00') },
    ];
    expect(filtrarTurnosEnRango(rango, candidatos)).toEqual([]);
  });
});
