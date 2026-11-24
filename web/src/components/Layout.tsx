import type { ReactNode } from 'react'
import logo from '../../../design-system/assets/logo.svg'

export type Pagina = 'nuevo-turno' | 'agenda'

const NOMBRE_MARCA = 'Turnos Odontología' // BRAND_NAME de design-system/brand.js

interface Props {
  pagina: Pagina
  onNavegar: (pagina: Pagina) => void
  children: ReactNode
}

/** Layout con menú lateral (Nuevo turno y Agenda). */
export function Layout({ pagina, onNavegar, children }: Props) {
  return (
    <div className="app">
      <aside className="sidebar" aria-label="Navegación principal">
        <div className="brand">
          <img src={logo} alt="" />
          <strong>{NOMBRE_MARCA}</strong>
        </div>
        <nav className="nav">
          <button
            type="button"
            className="nav-item"
            aria-current={pagina === 'nuevo-turno' ? 'page' : undefined}
            onClick={() => onNavegar('nuevo-turno')}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <circle cx="12" cy="12" r="9" /><path d="M12 8v8M8 12h8" />
            </svg>
            <span>Nuevo turno</span>
          </button>
          <button
            type="button"
            className="nav-item"
            aria-current={pagina === 'agenda' ? 'page' : undefined}
            onClick={() => onNavegar('agenda')}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 10h18M8 3v4M16 3v4" />
            </svg>
            <span>Agenda</span>
          </button>
        </nav>
      </aside>
      <main className="main">{children}</main>
    </div>
  )
}
