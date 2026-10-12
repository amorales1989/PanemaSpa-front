import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { DataProvider } from './context/DataContext'
import Layout from './components/Layout'
import Inicio from './pages/Inicio'
import Movimientos from './pages/Movimientos'
import Estadisticas from './pages/Estadisticas'
import Productos from './pages/Productos'
import ItemDetalle from './pages/ItemDetalle'
import Promos from './pages/Promos'
import Reportes from './pages/Reportes'

export default function App() {
  return (
    <DataProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<Inicio />} />
            <Route path="ingresos" element={<Movimientos key="ingresos" tipo="ingresos" />} />
            <Route path="egresos" element={<Movimientos key="egresos" tipo="egresos" />} />
            <Route path="merma" element={<Movimientos key="mermas" tipo="mermas" />} />
            <Route path="productos" element={<Productos />} />
            <Route path="productos/:tipo/:id" element={<ItemDetalle />} />
            <Route path="promos" element={<Promos />} />
            <Route path="reportes" element={<Reportes />} />
            <Route path="estadisticas" element={<Estadisticas />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </DataProvider>
  )
}
