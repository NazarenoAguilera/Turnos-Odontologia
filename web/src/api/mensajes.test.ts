import { describe, expect, it } from 'vitest'
import { describirError } from './mensajes'

const error = (estado: number, codigo: string, mensaje = 'Mensaje del backend.') =>
  ({ estado, codigo, mensaje, detalle: {} })

describe('describirError', () => {
  it('409 por sillón: título claro, tono danger y código técnico al final', () => {
    expect(describirError(error(409, 'TURNO_SOLAPADO_SILLON'))).toEqual({
      titulo: 'El sillón ya está ocupado en ese horario',
      ayuda: 'Probá otro horario u otro sillón.',
      tono: 'danger',
      codigoTecnico: '409 TURNO_SOLAPADO_SILLON',
    })
  })

  it('409 por profesional usa su propio texto', () => {
    const d = describirError(error(409, 'TURNO_SOLAPADO_PROFESIONAL'))
    expect(d.titulo).toBe('El profesional ya tiene un turno en ese horario')
    expect(d.tono).toBe('danger')
  })

  it('422 de grilla es una advertencia', () => {
    const d = describirError(error(422, 'INICIO_FUERA_DE_GRILLA'))
    expect(d.titulo).toBe('La hora tiene que caer en la grilla de 15 minutos')
    expect(d.tono).toBe('warning')
    expect(d.codigoTecnico).toBe('422 INICIO_FUERA_DE_GRILLA')
  })

  it('sin conexión no muestra estado HTTP', () => {
    const d = describirError(error(0, 'SIN_CONEXION'))
    expect(d.titulo).toBe('No pudimos conectar con el servidor')
    expect(d.codigoTecnico).toBe('SIN_CONEXION')
  })

  it('un código desconocido muestra el mensaje del backend tal cual', () => {
    expect(describirError(error(422, 'FUERA_DE_HORARIO', 'El turno queda fuera del horario de atención.'))).toEqual({
      titulo: 'El turno queda fuera del horario de atención.',
      ayuda: '',
      tono: 'warning',
      codigoTecnico: '422 FUERA_DE_HORARIO',
    })
    expect(describirError(error(500, 'OTRO')).tono).toBe('danger')
  })
})
