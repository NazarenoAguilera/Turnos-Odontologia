import { describe, expect, it } from 'vitest';
import { verificarSinConflictos, type TurnoOcupante } from '../../src/domain/conflictos.js';
import { Intervalo } from '../../src/domain/intervalo.js';
import { ErrorDeNegocio } from '../../src/domain/errores.js';

// Ids ficticios: profesional 1 = Dra. Ana Prueba, 2 = Dr. Bruno Ejemplo; sillón 1 y 2.
const ANA = 1;
const BRUNO = 2;
const SILLON_1 = 1;
const SILLON_2 = 2;

const turno = (
  id: number, profesionalId: number, sillonId: number, inicio: number, fin: number,
  estado: TurnoOcupante['estado'] = 'reservado',
): TurnoOcupante => ({ id, profesionalId, sillonId, inicioMin: inicio, finMin: fin, estado });

function errorDe(fn: () => unknown): ErrorDeNegocio | undefined {
  try {
    fn();
  } catch (e) {
    if (e instanceof ErrorDeNegocio) return e;
    throw e;
  }
  return undefined;
}

const recursos = (e: ErrorDeNegocio | undefined) =>
  ((e?.detalle.conflictos ?? []) as Array<{ recurso: string }>).map((c) => c.recurso).sort();

describe('verificarSinConflictos', () => {
  it('no falla cuando no hay candidatos', () => {
    expect(() =>
      verificarSinConflictos({ profesionalId: ANA, sillonId: SILLON_1, intervalo: new Intervalo(600, 630) }, []),
    ).not.toThrow();
  });

  it('detecta solo el conflicto por profesional (otro sillón)', () => {
    const e = errorDe(() =>
      verificarSinConflictos(
        { profesionalId: ANA, sillonId: SILLON_2, intervalo: new Intervalo(615, 645) },
        [turno(10, ANA, SILLON_1, 600, 630)],
      ),
    );
    expect(e?.codigo).toBe('TURNO_SOLAPADO_PROFESIONAL');
    expect(recursos(e)).toEqual(['profesional']);
  });

  it('detecta solo el conflicto por sillón (otro profesional)', () => {
    const e = errorDe(() =>
      verificarSinConflictos(
        { profesionalId: BRUNO, sillonId: SILLON_1, intervalo: new Intervalo(615, 645) },
        [turno(10, ANA, SILLON_1, 600, 630)],
      ),
    );
    expect(e?.codigo).toBe('TURNO_SOLAPADO_SILLON');
    expect(recursos(e)).toEqual(['sillon']);
  });

  it('informa ambos conflictos con código TURNO_SOLAPADO_PROFESIONAL', () => {
    const e = errorDe(() =>
      verificarSinConflictos(
        { profesionalId: ANA, sillonId: SILLON_1, intervalo: new Intervalo(600, 630) },
        [turno(10, ANA, SILLON_2, 600, 630), turno(11, BRUNO, SILLON_1, 600, 630)],
      ),
    );
    expect(e?.codigo).toBe('TURNO_SOLAPADO_PROFESIONAL');
    expect(recursos(e)).toEqual(['profesional', 'sillon']);
  });

  it('incluye en el detalle el id del turno en conflicto', () => {
    const e = errorDe(() =>
      verificarSinConflictos(
        { profesionalId: ANA, sillonId: SILLON_2, intervalo: new Intervalo(615, 645) },
        [turno(42, ANA, SILLON_1, 600, 630)],
      ),
    );
    expect((e?.detalle.conflictos as Array<{ turnoId: number }>)[0]?.turnoId).toBe(42);
  });

  it('ignora candidatos cancelados', () => {
    expect(() =>
      verificarSinConflictos(
        { profesionalId: ANA, sillonId: SILLON_1, intervalo: new Intervalo(600, 630) },
        [turno(10, ANA, SILLON_1, 600, 630, 'cancelado')],
      ),
    ).not.toThrow();
  });

  it('ignora candidatos contiguos y de otros recursos', () => {
    expect(() =>
      verificarSinConflictos(
        { profesionalId: ANA, sillonId: SILLON_1, intervalo: new Intervalo(630, 660) },
        [turno(10, ANA, SILLON_1, 600, 630), turno(11, BRUNO, SILLON_2, 630, 660)],
      ),
    ).not.toThrow();
  });
});
