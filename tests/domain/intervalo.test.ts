import { describe, expect, it } from 'vitest';
import { Intervalo } from '../../src/domain/intervalo.js';

// Minutos de ejemplo dentro de un mismo día: 600 = 10:00, 630 = 10:30, etc.
const i = (inicio: number, fin: number) => new Intervalo(inicio, fin);

describe('Intervalo semiabierto [inicio, fin)', () => {
  it('no se superpone con uno que empieza justo cuando termina (contiguo después)', () => {
    expect(i(600, 630).seSuperponeCon(i(630, 660))).toBe(false);
  });

  it('no se superpone con uno que termina justo cuando empieza (contiguo antes)', () => {
    expect(i(630, 660).seSuperponeCon(i(600, 630))).toBe(false);
  });

  it('se superpone parcialmente por el final', () => {
    expect(i(600, 630).seSuperponeCon(i(615, 645))).toBe(true);
  });

  it('se superpone parcialmente por el inicio', () => {
    expect(i(615, 645).seSuperponeCon(i(600, 630))).toBe(true);
  });

  it('se superpone cuando uno contiene al otro, en ambos sentidos', () => {
    expect(i(600, 690).seSuperponeCon(i(630, 660))).toBe(true);
    expect(i(630, 660).seSuperponeCon(i(600, 690))).toBe(true);
  });

  it('se superpone con un intervalo idéntico', () => {
    expect(i(600, 630).seSuperponeCon(i(600, 630))).toBe(true);
  });

  it('no se superpone con uno disjunto', () => {
    expect(i(600, 630).seSuperponeCon(i(700, 730))).toBe(false);
  });

  it('rechaza un intervalo con inicio mayor o igual que fin', () => {
    expect(() => i(630, 630)).toThrow(RangeError);
    expect(() => i(660, 630)).toThrow(RangeError);
  });

  it('rechaza extremos que no son enteros', () => {
    expect(() => i(600.5, 630)).toThrow(RangeError);
  });
});
