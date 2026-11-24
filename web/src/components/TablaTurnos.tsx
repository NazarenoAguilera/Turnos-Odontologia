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
}

/** Tabla de turnos de la agenda; la columna Acciones queda reservada para C-05. */
export function TablaTurnos({ turnos }: Props) {
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
          {turnos.map((t) => (
            <tr key={t.id} className={t.estado === 'cancelado' ? 'cancelado' : undefined}>
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
              <td />
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
