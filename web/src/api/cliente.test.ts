import { afterEach, describe, expect, it, vi } from 'vitest'
import { obtenerCatalogos, reservarTurno } from './cliente'

const datos = {
  pacienteId: 1, profesionalId: 1, sillonId: 1, prestacionId: 2, inicio: '2026-12-01T10:00:00-03:00',
}

function respuestaJson(estado: number, cuerpo: unknown) {
  return new Response(JSON.stringify(cuerpo), { status: estado, headers: { 'Content-Type': 'application/json' } })
}

afterEach(() => { vi.unstubAllGlobals() })

describe('reservarTurno', () => {
  it('manda POST /api/turnos con el cuerpo en JSON y devuelve el turno creado', async () => {
    const turno = { id: 7, ...datos, fin: '2026-12-01T10:30:00-03:00', duracionMin: 30, estado: 'reservado' }
    const fetchFalso = vi.fn().mockResolvedValue(respuestaJson(201, turno))
    vi.stubGlobal('fetch', fetchFalso)

    expect(await reservarTurno(datos)).toEqual({ ok: true, valor: turno })
    const [url, init] = fetchFalso.mock.calls[0] as [string, RequestInit]
    expect(url).toBe('/api/turnos')
    expect(init.method).toBe('POST')
    expect(JSON.parse(init.body as string)).toEqual(datos)
  })

  it('normaliza el error de negocio de la API con su estado', async () => {
    const detalle = { conflictos: [{ recurso: 'sillon', turnoId: 3, inicio: 'a', fin: 'b' }] }
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(respuestaJson(409, {
      error: { codigo: 'TURNO_SOLAPADO_SILLON', mensaje: 'El sillón ya tiene un turno.', detalle },
    })))
    expect(await reservarTurno(datos)).toEqual({
      ok: false,
      error: { estado: 409, codigo: 'TURNO_SOLAPADO_SILLON', mensaje: 'El sillón ya tiene un turno.', detalle },
    })
  })

  it('devuelve SIN_CONEXION si fetch falla', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')))
    const r = await reservarTurno(datos)
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error).toMatchObject({ estado: 0, codigo: 'SIN_CONEXION' })
  })

  it('devuelve SIN_CONEXION si la respuesta no es el formato de la API (proxy sin API)', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('', { status: 500 })))
    const r = await reservarTurno(datos)
    if (r.ok) throw new Error('debía fallar')
    expect(r.error.codigo).toBe('SIN_CONEXION')
  })
})

describe('obtenerCatalogos', () => {
  it('pide los 4 catálogos y los junta', async () => {
    const porRuta: Record<string, unknown> = {
      '/api/pacientes': [{ id: 1, nombre: 'Paciente', apellido: 'Ficticio Uno' }],
      '/api/profesionales': [{ id: 1, nombre: 'Dra. Ana Prueba' }],
      '/api/sillones': [{ id: 1, nombre: 'Sillón 1' }],
      '/api/prestaciones': [{ id: 2, nombre: 'Limpieza', duracionMin: 30 }],
    }
    vi.stubGlobal('fetch', vi.fn((url: string) => Promise.resolve(respuestaJson(200, porRuta[url]))))
    expect(await obtenerCatalogos()).toEqual({
      ok: true,
      valor: {
        pacientes: porRuta['/api/pacientes'],
        profesionales: porRuta['/api/profesionales'],
        sillones: porRuta['/api/sillones'],
        prestaciones: porRuta['/api/prestaciones'],
      },
    })
  })

  it('si falla uno, devuelve el error', async () => {
    vi.stubGlobal('fetch', vi.fn((url: string) => url === '/api/sillones'
      ? Promise.reject(new TypeError('Failed to fetch'))
      : Promise.resolve(respuestaJson(200, []))))
    const r = await obtenerCatalogos()
    if (r.ok) throw new Error('debía fallar')
    expect(r.error.codigo).toBe('SIN_CONEXION')
  })
})
