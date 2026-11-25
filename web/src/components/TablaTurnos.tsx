import { useEffect, useRef, type KeyboardEvent } from 'react'
import type { EstadoTurno, TurnoEnAgenda } from '../api/tipos'
import { horaDeIso } from '../fechas'

const ETIQUETA_ESTADO: Record<EstadoTurno, string> = {
  reservado: 'Reservado',
  confirmado: 'Confirmado',
  atendido: 'Atendido',
  ausente: 'Ausente',
  cancelado: 'Cancelado',
}

interface Props {
  turnos: TurnoEnAgenda[]
  /** "Cancelar": abre la confirmación en la fila, sin llamar a la API (design D9). */
  onPedirCancelacion?: (turno: TurnoEnAgenda) => void
  /** "Sí, cancelar turno". */
  onCancelar?: (turno: TurnoEnAgenda) => void
  onConfirmar?: (turno: TurnoEnAgenda) => void
  /** "Volver" o Escape: cierra la confirmación sin cambios. */
  onVolver?: () => void
  /** Turno cuya fila muestra la confirmación de cancelación. */
  turnoConfirmandoId?: number | null
  /** Turno con una acción en curso (esperando la API). */
  turnoOcupadoId?: number | null
}

// Los botones se muestran solo donde la transición tiene sentido; es presentación:
// la regla la decide la API (RN-TU-09) y, si no corresponde, responde 422.
const puedeConfirmar = (t: TurnoEnAgenda) => t.estado === 'reservado'
const puedeCancelar = (t: TurnoEnAgenda) => t.estado === 'reservado' || t.estado === 'confirmado'

interface PropsConfirmacion {
  turno: TurnoEnAgenda
  ocupado: boolean
  onCancelar: () => void
  onVolver: () => void
}

/** Confirmación dentro de la fila: la salida segura ("Volver") recibe el foco y Escape equivale a Volver. */
function ConfirmacionFila({ turno, ocupado, onCancelar, onVolver }: PropsConfirmacion) {
  const volverRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    volverRef.current?.focus()
  }, [])

  function alPresionarTecla(e: KeyboardEvent<HTMLDivElement>) {
    if (e.key === 'Escape' && !ocupado) {
      e.preventDefault()
      onVolver()
    }
  }

  return (
    <div
      className="confirmacion-fila"
      role="group"
      aria-label={`Confirmar la cancelación del turno de las ${horaDeIso(turno.inicio)}`}
      onKeyDown={alPresionarTecla}
    >
      <span className="pregunta">¿Cancelar este turno? No se puede deshacer.</span>
      <button
        className="btn btn-danger btn-sm"
        type="button"
        disabled={ocupado}
        aria-busy={ocupado || undefined}
        onClick={onCancelar}
      >
        {ocupado ? 'Cancelando…' : 'Sí, cancelar turno'}
      </button>
      <button ref={volverRef} className="btn btn-secondary btn-sm" type="button" disabled={ocupado} onClick={onVolver}>
        Volver
      </button>
    </div>
  )
}

/**
 * Tabla de turnos de la agenda. Presentacional: las acciones (C-05) aparecen solo si
 * la pantalla pasa los manejadores, y se usan igual en la vista Día y en la Semana.
 */
export function TablaTurnos({
  turnos,
  onPedirCancelacion,
  onCancelar,
  onConfirmar,
  onVolver,
  turnoConfirmandoId = null,
  turnoOcupadoId = null,
}: Props) {
  // Una sola confirmación o acción a la vez: mientras hay una, el resto de las acciones se deshabilita.
  const hayAccionAbierta = turnoConfirmandoId !== null || turnoOcupadoId !== null

  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th scope="col">Hora</th>
            <th scope="col">Paciente</th>
            <th scope="col">Profesional</th>
            <th scope="col">Sillón</th>
            <th scope="col">Prestación</th>
            <th scope="col">Estado</th>
            <th scope="col"><span className="sr-only">Acciones</span></th>
          </tr>
        </thead>
        <tbody>
          {turnos.map((t) => {
            const confirmando = t.id === turnoConfirmandoId
            const ocupado = t.id === turnoOcupadoId
            const clases = [t.estado === 'cancelado' ? 'cancelado' : '', confirmando ? 'confirmando' : '']
              .filter(Boolean)
              .join(' ')
            return (
              <tr key={t.id} className={clases || undefined}>
                <td className="hora">{horaDeIso(t.inicio)}–{horaDeIso(t.fin)}</td>
                <td className="paciente">{t.pacienteNombre}</td>
                <td>{t.profesionalNombre}</td>
                <td>{t.sillonNombre}</td>
                <td>{t.prestacionNombre}</td>
                <td>
                  <span className={`badge badge-${t.estado}`}>
                    {ETIQUETA_ESTADO[t.estado]}
                  </span>
                </td>
                <td>
                  {confirmando && onCancelar && onVolver ? (
                    <ConfirmacionFila
                      turno={t}
                      ocupado={ocupado}
                      onCancelar={() => onCancelar(t)}
                      onVolver={onVolver}
                    />
                  ) : (
                    (puedeConfirmar(t) && onConfirmar) || (puedeCancelar(t) && onPedirCancelacion) ? (
                      <div className="acciones-fila">
                        {puedeConfirmar(t) && onConfirmar && (
                          <button
                            className="btn btn-secondary btn-sm"
                            type="button"
                            disabled={hayAccionAbierta}
                            aria-busy={ocupado || undefined}
                            onClick={() => onConfirmar(t)}
                          >
                            {ocupado ? 'Confirmando…' : 'Confirmar'}
                          </button>
                        )}
                        {puedeCancelar(t) && onPedirCancelacion && (
                          <button
                            className="btn btn-danger btn-sm"
                            type="button"
                            disabled={hayAccionAbierta}
                            onClick={() => onPedirCancelacion(t)}
                          >
                            Cancelar
                          </button>
                        )}
                      </div>
                    ) : null
                  )}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
