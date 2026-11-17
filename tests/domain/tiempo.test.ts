import { describe, expect, it } from 'vitest';
import { aIsoLocal, horaLocal, instanteDesdeIso } from '../../src/domain/tiempo.js';
import { ErrorDeNegocio } from '../../src/domain/errores.js';

const UTC_13H_1_DIC_2026 = Date.UTC(2026, 11, 1, 13, 0, 0);

function codigoDe(fn: () => unknown): string | undefined {
  try {
    fn();
  } catch (e) {
    return e instanceof ErrorDeNegocio ? e.codigo : 'OTRO_ERROR';
  }
  return undefined;
}

describe('instanteDesdeIso', () => {
  it('convierte un ISO con offset de Argentina al instante absoluto', () => {
    expect(instanteDesdeIso('2026-12-01T10:00:00-03:00')).toBe(UTC_13H_1_DIC_2026);
  });

  it('acepta el mismo instante expresado en UTC (Z)', () => {
    expect(instanteDesdeIso('2026-12-01T13:00:00Z')).toBe(UTC_13H_1_DIC_2026);
  });

  it('rechaza un inicio sin offset con SOLICITUD_INVALIDA', () => {
    expect(codigoDe(() => instanteDesdeIso('2026-12-01T10:00:00'))).toBe('SOLICITUD_INVALIDA');
  });

  it('rechaza un texto que no es fecha con SOLICITUD_INVALIDA', () => {
    expect(codigoDe(() => instanteDesdeIso('mañana a las diez'))).toBe('SOLICITUD_INVALIDA');
  });
});

describe('horaLocal (zona del consultorio)', () => {
  it('devuelve la hora de pared en America/Argentina/Buenos_Aires', () => {
    expect(horaLocal(UTC_13H_1_DIC_2026)).toEqual({
      anio: 2026, mes: 12, dia: 1, hora: 10, minuto: 0, segundo: 0,
    });
  });

  it('cambia de día local según la zona y no según UTC', () => {
    // 02:30 UTC del 2 de diciembre son las 23:30 del 1 de diciembre en Argentina.
    const local = horaLocal(Date.UTC(2026, 11, 2, 2, 30, 0));
    expect([local.dia, local.hora, local.minuto]).toEqual([1, 23, 30]);
  });
});

describe('aIsoLocal', () => {
  it('formatea un instante en ISO 8601 con el offset local de la zona', () => {
    expect(aIsoLocal(UTC_13H_1_DIC_2026)).toBe('2026-12-01T10:00:00-03:00');
  });

  it('ida y vuelta: un ISO en UTC vuelve expresado en hora local', () => {
    expect(aIsoLocal(instanteDesdeIso('2026-12-01T14:30:00Z'))).toBe('2026-12-01T11:30:00-03:00');
  });
});
