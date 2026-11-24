import { useEffect, useState } from 'react'
import { consultarAgenda, obtenerCatalogosAgenda } from '../api/cliente'
import { describirError } from '../api/mensajes'
import type { CatalogosAgenda, ErrorApi, TurnoEnAgenda } from '../api/tipos'
import { Aviso } from '../components/Aviso'
import { TablaTurnos } from '../components/TablaTurnos'
import {
  fechaDeIso,
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

  function cambiarVista(nuevaVista: VistaAgenda) {
    if (nuevaVista === vista) return
    setEstado({ tipo: 'cargando' })
    setVista(nuevaVista)
  }

  function moverPeriodo(direccion: -1 | 1) {
    const paso = vista === 'dia' ? 1 : 7
    setEstado({ tipo: 'cargando' })
    setFechaBase((actual) => sumarDias(actual, paso * direccion))
  }

  function irAHoy() {
    setEstado({ tipo: 'cargando' })
    setFechaBase(hoyEnZona())
  }

  function cambiarProfesional(valor: string) {
    setEstado({ tipo: 'cargando' })
    setProfesionalId(valor)
  }

  function cambiarSillon(valor: string) {
    setEstado({ tipo: 'cargando' })
    setSillonId(valor)
  }

  function cambiarIncluirCancelados(valor: boolean) {
    setEstado({ tipo: 'cargando' })
    setIncluirCancelados(valor)
  }

  function reintentar() {
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
        <TablaTurnos turnos={estado.turnos} />
      )}

      {estado.tipo === 'listo' && estado.turnos.length > 0 && vista === 'semana' && (
        <div className="stack">
          {gruposSemana.map((grupo) => (
            <section className="day-group" key={grupo.fecha} aria-labelledby={`dia-${grupo.fecha}`}>
              <h2 className="day-heading" id={`dia-${grupo.fecha}`}>{tituloDia(grupo.fecha)}</h2>
              <TablaTurnos turnos={grupo.turnos} />
            </section>
          ))}
        </div>
      )}
    </div>
  )
}
