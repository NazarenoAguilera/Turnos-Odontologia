import { useEffect, useState } from 'react'
import { cambiarEstado, consultarAgenda, obtenerCatalogosAgenda, type AccionTurno } from '../api/cliente'
import { describirError, type Tono } from '../api/mensajes'
import type { CatalogosAgenda, ErrorApi, TurnoEnAgenda } from '../api/tipos'
import { Aviso } from '../components/Aviso'
import { TablaTurnos } from '../components/TablaTurnos'
import {
  fechaDeIso,
  horaDeIso,
  hoyEnZona,
  rangoAgenda,
  sumarDias,
  tituloDia,
  tituloSemana,
  type VistaAgenda,
} from '../fechas'

type EstadoAgenda =
  | { tipo: 'cargando' }
  | { tipo: 'error'; error: ErrorApi }
  | { tipo: 'listo'; turnos: TurnoEnAgenda[] }

/** Resultado de la última acción sobre un turno (C-05), mostrado arriba de la tabla. */
interface AvisoAccion {
  tono: Tono
  titulo: string
  texto: string
  codigo?: string
}

interface GrupoDia {
  fecha: string
  turnos: TurnoEnAgenda[]
}

function agruparPorDia(turnos: TurnoEnAgenda[]): GrupoDia[] {
  const grupos: GrupoDia[] = []
  for (const turno of turnos) {
    const fecha = fechaDeIso(turno.inicio)
    const ultimo = grupos[grupos.length - 1]
    if (ultimo && ultimo.fecha === fecha) {
      ultimo.turnos.push(turno)
    } else {
      grupos.push({ fecha, turnos: [turno] })
    }
  }
  return grupos
}

/**
 * Pantalla Agenda diaria y semanal (C-07). Consume GET /turnos con el rango
 * calculado en la zona del consultorio sin duplicar reglas de negocio.
 */
export function Agenda() {
  const [vista, setVista] = useState<VistaAgenda>('dia')
  const [fechaBase, setFechaBase] = useState<string>(() => hoyEnZona())
  const [profesionalId, setProfesionalId] = useState<string>('')
  const [sillonId, setSillonId] = useState<string>('')
  const [incluirCancelados, setIncluirCancelados] = useState<boolean>(false)
  const [intento, setIntento] = useState<number>(0)

  const [catalogos, setCatalogos] = useState<CatalogosAgenda>({ profesionales: [], sillones: [] })
  const [estado, setEstado] = useState<EstadoAgenda>({ tipo: 'cargando' })

  // C-05: una sola confirmación o acción a la vez (design D6 y D9).
  const [turnoConfirmandoId, setTurnoConfirmandoId] = useState<number | null>(null)
  const [turnoOcupadoId, setTurnoOcupadoId] = useState<number | null>(null)
  const [aviso, setAviso] = useState<AvisoAccion | null>(null)

  const rango = rangoAgenda(fechaBase, vista)
  const tituloRango = vista === 'dia' ? tituloDia(fechaBase) : tituloSemana(fechaBase)

  useEffect(() => {
    let cancelado = false
    void obtenerCatalogosAgenda().then((r) => {
      if (!cancelado && r.ok) {
        setCatalogos(r.valor)
      }
    })
    return () => {
      cancelado = true
    }
  }, [])

  useEffect(() => {
    let cancelado = false
    void consultarAgenda({
      desde: rango.desde,
      hasta: rango.hasta,
      profesionalId: profesionalId ? Number(profesionalId) : undefined,
      sillonId: sillonId ? Number(sillonId) : undefined,
      incluirCancelados,
    }).then((r) => {
      if (cancelado) return
      if (r.ok) {
        setEstado({ tipo: 'listo', turnos: r.valor })
      } else {
        setEstado({ tipo: 'error', error: r.error })
      }
    })
    return () => {
      cancelado = true
    }
  }, [rango.desde, rango.hasta, profesionalId, sillonId, incluirCancelados, intento])

  function limpiarAccion() {
    setTurnoConfirmandoId(null)
    setAviso(null)
  }

  function recargar() {
    setEstado({ tipo: 'cargando' })
    setIntento((n) => n + 1)
  }

  async function ejecutar(turno: TurnoEnAgenda, accion: AccionTurno) {
    setTurnoOcupadoId(turno.id)
    setAviso(null)
    const r = await cambiarEstado(turno.id, accion)
    setTurnoOcupadoId(null)
    setTurnoConfirmandoId(null)

    if (r.ok) {
      const resumen = `${turno.pacienteNombre} · ${turno.profesionalNombre} · ${turno.sillonNombre} · ${horaDeIso(turno.inicio)} a ${horaDeIso(turno.fin)}`
      setAviso(accion === 'cancelar'
        ? { tono: 'success', titulo: 'Turno cancelado', texto: `${resumen}. El horario quedó libre.` }
        : { tono: 'success', titulo: 'Turno confirmado', texto: `${resumen}.` })
      recargar()
      return
    }

    const d = describirError(r.error)
    setAviso({ tono: d.tono, titulo: d.titulo, texto: d.ayuda, codigo: d.codigoTecnico })
    // Sin conexión no tiene sentido recargar; con 422 o 404 se trae el estado real de la API.
    if (r.error.codigo !== 'SIN_CONEXION') recargar()
  }

  function cambiarVista(nuevaVista: VistaAgenda) {
    if (nuevaVista === vista) return
    limpiarAccion()
    setEstado({ tipo: 'cargando' })
    setVista(nuevaVista)
  }

  function moverPeriodo(direccion: -1 | 1) {
    const paso = vista === 'dia' ? 1 : 7
    limpiarAccion()
    setEstado({ tipo: 'cargando' })
    setFechaBase((actual) => sumarDias(actual, paso * direccion))
  }

  function irAHoy() {
    limpiarAccion()
    setEstado({ tipo: 'cargando' })
    setFechaBase(hoyEnZona())
  }

  function cambiarProfesional(valor: string) {
    limpiarAccion()
    setEstado({ tipo: 'cargando' })
    setProfesionalId(valor)
  }

  function cambiarSillon(valor: string) {
    limpiarAccion()
    setEstado({ tipo: 'cargando' })
    setSillonId(valor)
  }

  function cambiarIncluirCancelados(valor: boolean) {
    limpiarAccion()
    setEstado({ tipo: 'cargando' })
    setIncluirCancelados(valor)
  }

  function reintentar() {
    limpiarAccion()
    setEstado({ tipo: 'cargando' })
    setIntento((n) => n + 1)
  }

  const gruposSemana = vista === 'semana' && estado.tipo === 'listo' ? agruparPorDia(estado.turnos) : []

  return (
    <div className="page page-wide">
      <header className="page-header">
        <h1>Agenda</h1>
        <p>Consultá los turnos del día o de la semana, filtrados por profesional o por sillón.</p>
      </header>

      <section className="card stack" aria-label="Controles de agenda">
        <div className="toolbar">
          <div className="segmented" role="group" aria-label="Vista de agenda">
            <button
              type="button"
              aria-pressed={vista === 'dia'}
              onClick={() => cambiarVista('dia')}
            >
              Día
            </button>
            <button
              type="button"
              aria-pressed={vista === 'semana'}
              onClick={() => cambiarVista('semana')}
            >
              Semana
            </button>
          </div>

          <div className="date-nav">
            <button
              className="btn btn-secondary btn-sm"
              type="button"
              aria-label="Período anterior"
              onClick={() => moverPeriodo(-1)}
            >
              ‹
            </button>
            <strong className="date-label">{tituloRango}</strong>
            <button
              className="btn btn-secondary btn-sm"
              type="button"
              aria-label="Período siguiente"
              onClick={() => moverPeriodo(1)}
            >
              ›
            </button>
            <button className="btn btn-secondary btn-sm" type="button" onClick={irAHoy}>
              Hoy
            </button>
          </div>
        </div>

        <div className="filters-grid">
          <div className="field">
            <label htmlFor="f-agenda-profesional">Profesional</label>
            <select
              className="control"
              id="f-agenda-profesional"
              value={profesionalId}
              onChange={(e) => cambiarProfesional(e.target.value)}
            >
              <option value="">Todos los profesionales</option>
              {catalogos.profesionales.map((p) => (
                <option key={p.id} value={p.id}>{p.nombre}</option>
              ))}
            </select>
          </div>

          <div className="field">
            <label htmlFor="f-agenda-sillon">Sillón</label>
            <select
              className="control"
              id="f-agenda-sillon"
              value={sillonId}
              onChange={(e) => cambiarSillon(e.target.value)}
            >
              <option value="">Todos los sillones</option>
              {catalogos.sillones.map((s) => (
                <option key={s.id} value={s.id}>{s.nombre}</option>
              ))}
            </select>
          </div>

          <label className="check-field" htmlFor="f-agenda-cancelados">
            <input
              type="checkbox"
              id="f-agenda-cancelados"
              checked={incluirCancelados}
              onChange={(e) => cambiarIncluirCancelados(e.target.checked)}
            />
            <span>Mostrar cancelados</span>
          </label>
        </div>
      </section>

      {aviso && (
        <Aviso tono={aviso.tono} titulo={aviso.titulo}>
          <p>{aviso.texto}{aviso.codigo && <>{aviso.texto ? ' ' : ''}<code>{aviso.codigo}</code></>}</p>
        </Aviso>
      )}

      {estado.tipo === 'cargando' && (
        <div className="card stack" aria-busy="true" aria-label="Cargando agenda">
          <div className="skeleton" style={{ width: '72%' }} />
          <div className="skeleton" style={{ width: '92%' }} />
          <div className="skeleton" style={{ width: '60%' }} />
          <div className="skeleton" style={{ width: '84%' }} />
        </div>
      )}

      {estado.tipo === 'error' && (() => {
        const d = describirError(estado.error)
        return (
          <Aviso tono="danger" titulo={d.titulo}>
            <p>{d.ayuda ? `${d.ayuda} ` : ''}<code>{d.codigoTecnico}</code></p>
            <div className="acciones">
              <button className="btn btn-secondary btn-sm" type="button" onClick={reintentar}>
                Reintentar
              </button>
            </div>
          </Aviso>
        )
      })()}

      {estado.tipo === 'listo' && estado.turnos.length === 0 && (
        <div className="card empty">
          <strong>No hay turnos para este período</strong>
          <p>Probá otro día, limpiá los filtros o reservá un turno desde Nuevo turno.</p>
        </div>
      )}

      {estado.tipo === 'listo' && estado.turnos.length > 0 && vista === 'dia' && (
        <TablaTurnos
          turnos={estado.turnos}
          onPedirCancelacion={(t) => setTurnoConfirmandoId(t.id)}
          onCancelar={(t) => void ejecutar(t, 'cancelar')}
          onConfirmar={(t) => void ejecutar(t, 'confirmar')}
          onVolver={() => setTurnoConfirmandoId(null)}
          turnoConfirmandoId={turnoConfirmandoId}
          turnoOcupadoId={turnoOcupadoId}
        />
      )}

      {estado.tipo === 'listo' && estado.turnos.length > 0 && vista === 'semana' && (
        <div className="stack">
          {gruposSemana.map((grupo) => (
            <section className="day-group" key={grupo.fecha} aria-labelledby={`dia-${grupo.fecha}`}>
              <h2 className="day-heading" id={`dia-${grupo.fecha}`}>{tituloDia(grupo.fecha)}</h2>
              <TablaTurnos
                turnos={grupo.turnos}
                onPedirCancelacion={(t) => setTurnoConfirmandoId(t.id)}
                onCancelar={(t) => void ejecutar(t, 'cancelar')}
                onConfirmar={(t) => void ejecutar(t, 'confirmar')}
                onVolver={() => setTurnoConfirmandoId(null)}
                turnoConfirmandoId={turnoConfirmandoId}
                turnoOcupadoId={turnoOcupadoId}
              />
            </section>
          ))}
        </div>
      )}
    </div>
  )
}
