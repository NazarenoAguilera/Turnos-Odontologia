import { useState } from 'react'
import { Layout, type Pagina } from './components/Layout'
import { Agenda } from './pages/Agenda'
import { NuevoTurno } from './pages/NuevoTurno'

export default function App() {
  const [pagina, setPagina] = useState<Pagina>('nuevo-turno')
  return (
    <Layout pagina={pagina} onNavegar={setPagina}>
      {pagina === 'nuevo-turno' ? <NuevoTurno /> : <Agenda />}
    </Layout>
  )
}
