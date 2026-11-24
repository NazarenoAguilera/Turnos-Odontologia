import { describe, expect, it } from 'vitest'
import { diaLegible, horaDeIso, hoyEnZona, inicioIso } from './fechas'

// design D7: el offset sale de la zona IANA con Intl, nunca de un "-03:00" fijo
// ni del huso de la máquina que corre el navegador.
describe('inicioIso', () => {
  it('arma el inicio con el offset de Buenos Aires por defecto', () => {
    expect(inicioIso('2026-12-01', '10:00')).toBe('2026-12-01T10:00:00-03:00')
  })

  it('usa el offset de la zona indicada (no está fijo en -03:00)', () => {
    expect(inicioIso('2026-12-01', '10:00', 'Europe/Madrid')).toBe('2026-12-01T10:00:00+01:00')
    expect(inicioIso('2026-07-01', '10:00', 'Europe/Madrid')).toBe('2026-07-01T10:00:00+02:00')
  })

  it('escribe +00:00 para una zona sin desplazamiento', () => {
    expect(inicioIso('2026-12-01', '09:45', 'UTC')).toBe('2026-12-01T09:45:00+00:00')
  })

  it('conserva fecha y hora de pared en bordes del día', () => {
    expect(inicioIso('2026-12-31', '23:45')).toBe('2026-12-31T23:45:00-03:00')
    expect(inicioIso('2027-01-01', '00:00')).toBe('2027-01-01T00:00:00-03:00')
  })

  it('se combina con hoyEnZona: la fecha de hoy se toma en la zona del consultorio', () => {
    // 2026-12-02 01:30 UTC todavía es 1/12 a las 22:30 en Buenos Aires.
    expect(hoyEnZona(new Date('2026-12-02T01:30:00Z'))).toBe('2026-12-01')
    expect(hoyEnZona(new Date('2026-12-02T03:30:00Z'))).toBe('2026-12-02')
  })

  it('no depende del huso de la máquina', () => {
    const anterior = process.env.TZ
    try {
      process.env.TZ = 'Asia/Tokyo'
      expect(inicioIso('2026-12-01', '10:00')).toBe('2026-12-01T10:00:00-03:00')
    } finally {
      process.env.TZ = anterior
    }
  })
})

describe('textos de fecha para los avisos', () => {
  it('horaDeIso toma la hora local que ya trae la API', () => {
    expect(horaDeIso('2026-12-01T10:30:00-03:00')).toBe('10:30')
    expect(horaDeIso('2026-12-01T09:05:00-03:00')).toBe('09:05')
  })

  it('diaLegible arma "martes 1/12"', () => {
    expect(diaLegible('2026-12-01T10:00:00-03:00')).toBe('martes 1/12')
    expect(diaLegible('2026-12-06T10:00:00-03:00')).toBe('domingo 6/12')
  })
})
