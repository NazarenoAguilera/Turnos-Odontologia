import type { ReactNode } from 'react'
import type { Tono } from '../api/mensajes'

interface Props {
  tono: Tono
  titulo: string
  /** Código técnico al final, en monoespaciada (brand.md). */
  codigo?: string
  children?: ReactNode
}

const ICONOS: Record<Tono, ReactNode> = {
  success: <><circle cx="12" cy="12" r="9" /><path d="m8 12 3 3 5-6" /></>,
  danger: <><circle cx="12" cy="12" r="9" /><path d="M12 7v6M12 17h.01" /></>,
  warning: <><path d="M12 3 2 20h20L12 3z" /><path d="M12 10v4M12 17h.01" /></>,
}

/** Aviso de resultado: éxito como `status`, errores como `alert`. */
export function Aviso({ tono, titulo, codigo, children }: Props) {
  return (
    <div className={`alert alert-${tono}`} role={tono === 'success' ? 'status' : 'alert'}>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
        {ICONOS[tono]}
      </svg>
      <div>
        <strong>{titulo}</strong>
        {children}
        {codigo && <p><code>{codigo}</code></p>}
      </div>
    </div>
  )
}
