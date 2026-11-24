import { useState } from 'react'
import { Layout, type Pagina } from './components/Layout'
import { NuevoTurno } from './pages/NuevoTurno'

/** Una sola página real por ahora; la Agenda llega con C-07 (design D4). */
export default function App() {
  const [pagina, setPagina] = useState<Pagina>('nuevo-turno')
  return (
    <Layout pagina={pagina} onNavegar={setPagina}>
      {pagina === 'nuevo-turno' && <NuevoTurno />}
    </Layout>
  )
}
