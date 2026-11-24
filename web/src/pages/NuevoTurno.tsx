import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { obtenerCatalogos, reservarTurno } from '../api/cliente'
import { describirError } from '../api/mensajes'
import type { Catalogos, Conflicto, ErrorApi, TurnoCreado } from '../api/tipos'
import { Aviso } from '../components/Aviso'
import { diaLegible, horaDeIso, hoyEnZona, inicioIso } from '../fechas'

type EstadoCatalogos =
  | { tipo: 'cargando' }
  | { tipo: 'error'; error: ErrorApi }
  | { tipo: 'listo'; catalogos: Catalogos }

interface Formulario {
  pacienteId: string
  prestacionId: string
  profesionalId: string
  sillonId: string
  fecha: string
  hora: string
}

/** Lo que se mandó, con nombres, para armar el texto del resultado. */
interface Pedido {
  paciente: string
  profesional: string
  sillon: string
  prestacion: string
}

type Resultado =
  | { tipo: 'exito'; turno: TurnoCreado; pedido: Pedido }
  | { tipo: 'error'; error: ErrorApi; pedido: Pedido }

const nombreDe = <T extends { id: number; nombre: string }>(lista: T[], id: string) =>
  lista.find((x) => String(x.id) === id)?.nombre ?? ''

function formularioInicial(c: Catalogos): Formulario {
  const primero = (lista: { id: number }[]) => (lista[0] ? String(lista[0].id) : '')
  return {
    pacienteId: primero(c.pacientes),
    prestacionId: primero(c.prestaciones),
    profesionalId: primero(c.profesionales),
    sillonId: primero(c.sillones),
    fecha: hoyEnZona(),
    hora: '',
  }
}

function conflictosDe(error: ErrorApi): Conflicto[] {
  const lista = error.detalle.conflictos
  return Array.isArray(lista) ? (lista as Conflicto[]) : []
}

/**
 * Pantalla Nuevo turno (design D8). No valida reglas de negocio: la API decide
 * solapamientos, grilla y duración, y la pantalla muestra lo que responde.
 */
export function NuevoTurno() {
  const [catalogos, setCatalogos] = useState<EstadoCatalogos>({ tipo: 'cargando' })
  const [form, setForm] = useState<Formulario | null>(null)
  const [enviando, setEnviando] = useState(false)
  const [resultado, setResultado] = useState<Resultado | null>(null)

  const aplicarCatalogos = useCallback((r: Awaited<ReturnType<typeof obtenerCatalogos>>) => {
    if (r.ok) {
      setCatalogos({ tipo: 'listo', catalogos: r.valor })
      setForm((anterior) => anterior ?? formularioInicial(r.valor))
    } else {
      setCatalogos({ tipo: 'error', error: r.error })
    }
  }, [])

  // El estado inicial ya es "cargando": el efecto solo actualiza cuando llega la respuesta.
  useEffect(() => {
    let cancelado = false
    void obtenerCatalogos().then((r) => { if (!cancelado) aplicarCatalogos(r) })
    return () => { cancelado = true }
  }, [aplicarCatalogos])

  function reintentar() {
    setCatalogos({ tipo: 'cargando' })
    void obtenerCatalogos().then(aplicarCatalogos)
  }

  const cambiar = (campo: keyof Formulario) => (e: { target: { value: string } }) =>
    setForm((f) => (f ? { ...f, [campo]: e.target.value } : f))

  async function reservar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!form || catalogos.tipo !== 'listo' || enviando) return
    const c = catalogos.catalogos
    const paciente = c.pacientes.find((p) => String(p.id) === form.pacienteId)
    const pedido: Pedido = {
      paciente: paciente ? `${paciente.nombre} ${paciente.apellido}` : '',
      profesional: nombreDe(c.profesionales, form.profesionalId),
      sillon: nombreDe(c.sillones, form.sillonId),
      prestacion: nombreDe(c.prestaciones, form.prestacionId),
    }

    setEnviando(true)
    setResultado(null)
    const r = await reservarTurno({
      pacienteId: Number(form.pacienteId),
      profesionalId: Number(form.profesionalId),
      sillonId: Number(form.sillonId),
      prestacionId: Number(form.prestacionId),
      inicio: inicioIso(form.fecha, form.hora),
    })
    setEnviando(false)

    if (r.ok) {
      setResultado({ tipo: 'exito', turno: r.valor, pedido })
      setForm((f) => (f ? { ...f, hora: '' } : f)) // se conserva el resto para reservar otro rápido
    } else {
      setResultado({ tipo: 'error', error: r.error, pedido })
    }
  }

  const horaInvalida = resultado?.tipo === 'error' && resultado.error.codigo === 'INICIO_FUERA_DE_GRILLA'

  return (
    <div className="page">
      <header className="page-header">
        <h1>Nuevo turno</h1>
        <p>Elegí paciente, profesional, sillón y prestación. El sistema avisa si el horario choca con otro turno.</p>
      </header>

      {catalogos.tipo === 'cargando' && (
        <div className="card" aria-busy="true">
          <p className="cargando" role="status">Cargando…</p>
        </div>
      )}

      {catalogos.tipo === 'error' && (() => {
        const d = describirError(catalogos.error)
        return (
          <Aviso tono="danger" titulo={d.titulo}>
            <p>{d.ayuda} No se reservó ningún turno. <code>{d.codigoTecnico}</code></p>
            <div className="acciones">
              <button className="btn btn-secondary btn-sm" type="button" onClick={reintentar}>Reintentar</button>
            </div>
          </Aviso>
        )
      })()}

      {catalogos.tipo === 'listo' && form && (
        <form className="card stack" onSubmit={reservar}>
          <div className="form-grid">
            <div className="field">
              <label htmlFor="f-paciente">Paciente</label>
              <select className="control" id="f-paciente" required disabled={enviando}
                value={form.pacienteId} onChange={cambiar('pacienteId')}>
                {catalogos.catalogos.pacientes.map((p) => (
                  <option key={p.id} value={p.id}>{p.nombre} {p.apellido}</option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="f-prestacion">Prestación</label>
              <select className="control" id="f-prestacion" required disabled={enviando}
                value={form.prestacionId} onChange={cambiar('prestacionId')}>
                {catalogos.catalogos.prestaciones.map((p) => (
                  <option key={p.id} value={p.id}>{p.nombre} ({p.duracionMin} min)</option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="f-profesional">Profesional</label>
              <select className="control" id="f-profesional" required disabled={enviando}
                value={form.profesionalId} onChange={cambiar('profesionalId')}>
                {catalogos.catalogos.profesionales.map((p) => (
                  <option key={p.id} value={p.id}>{p.nombre}</option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="f-sillon">Sillón</label>
              <select className="control" id="f-sillon" required disabled={enviando}
                value={form.sillonId} onChange={cambiar('sillonId')}>
                {catalogos.catalogos.sillones.map((s) => (
                  <option key={s.id} value={s.id}>{s.nombre}</option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="f-fecha">Fecha</label>
              <input className="control" id="f-fecha" type="date" required disabled={enviando}
                value={form.fecha} onChange={cambiar('fecha')} />
            </div>
            <div className={`field${horaInvalida ? ' invalid' : ''}`}>
              <label htmlFor="f-hora">Hora</label>
              {/* Sin `step`: el navegador bloquearía 10:10 antes de llegar a la API, y la grilla la decide el backend (DD-08). */}
              <input className="control" id="f-hora" type="time" required disabled={enviando}
                aria-describedby="f-hora-ayuda" aria-invalid={horaInvalida || undefined}
                value={form.hora} onChange={cambiar('hora')} />
              <span className="hint" id="f-hora-ayuda">Turnos cada 15 minutos: :00, :15, :30 o :45.</span>
            </div>
          </div>

          {resultado?.tipo === 'exito' && (
            <Aviso tono="success" titulo="Turno reservado">
              <p>
                {resultado.pedido.paciente} · {resultado.pedido.profesional} · {resultado.pedido.sillon} · {resultado.pedido.prestacion}
                {' · '}{diaLegible(resultado.turno.inicio)}, {horaDeIso(resultado.turno.inicio)} a {horaDeIso(resultado.turno.fin)}.
              </p>
            </Aviso>
          )}

          {resultado?.tipo === 'error' && (() => {
            const d = describirError(resultado.error)
            const conflictos = conflictosDe(resultado.error)
            return (
              <Aviso tono={d.tono} titulo={d.titulo}>
                {conflictos.length > 0 && (
                  <ul>
                    {conflictos.map((c) => (
                      <li key={`${c.recurso}-${c.turnoId}`}>
                        Choca con el turno de {horaDeIso(c.inicio)} a {horaDeIso(c.fin)}
                        {c.recurso === 'sillon' ? ` en ${resultado.pedido.sillon}` : ` de ${resultado.pedido.profesional}`}.
                      </li>
                    ))}
                  </ul>
                )}
                <p>{d.ayuda && `${d.ayuda} `}<code>{d.codigoTecnico}</code></p>
              </Aviso>
            )
          })()}

          <div className="row">
            <button className="btn btn-primary" type="submit" disabled={enviando} aria-busy={enviando || undefined}>
              {enviando ? 'Reservando…' : 'Reservar turno'}
            </button>
            <button className="btn btn-secondary" type="button" disabled={enviando}
              onClick={() => { setForm(formularioInicial(catalogos.catalogos)); setResultado(null) }}>
              Limpiar
            </button>
          </div>
        </form>
      )}
    </div>
  )
}
