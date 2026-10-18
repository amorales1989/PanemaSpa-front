import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import CambioObligatorio from './components/CambioObligatorio'
import RequiereSesion from './components/RequiereSesion'
import { DialogoProvider } from './components/Dialogo'
import Layout from './components/Layout'
import Inicio from './pages/Inicio'
import Movimientos from './pages/Movimientos'
import Estadisticas from './pages/Estadisticas'
import Productos from './pages/Productos'
import ItemDetalle from './pages/ItemDetalle'
import Promos from './pages/Promos'
import Reportes from './pages/Reportes'
import Configuracion from './pages/Configuracion'
import Proveedores from './pages/Proveedores'
import Clientes from './pages/Clientes'
import Login from './pages/Login'
import AdminLayout from './pages/admin/AdminLayout'
import AdminEmpresas from './pages/admin/AdminEmpresas'
import AdminEmpresa from './pages/admin/AdminEmpresa'

// Con contraseña temporal no se entra a ninguna pantalla hasta cambiarla
function Puerta({ children }) {
  const { usuario } = useAuth()
  return usuario?.debeCambiarPassword ? <CambioObligatorio /> : children
}

export default function App() {
  return (
    <DialogoProvider>
      <AuthProvider>
        <Puerta>
          <BrowserRouter>
            <Routes>
              <Route path="login" element={<Login />} />
              {/* Panel de plataforma (solo superadmin) */}
              <Route path="admin" element={<AdminLayout />}>
                <Route index element={<AdminEmpresas />} />
                <Route path="empresas/:id" element={<AdminEmpresa />} />
              </Route>
              <Route element={<RequiereSesion><Layout /></RequiereSesion>}>
                <Route index element={<Inicio />} />
                <Route path="ingresos" element={<Movimientos key="ingresos" tipo="ingresos" />} />
                <Route path="egresos" element={<Movimientos key="egresos" tipo="egresos" />} />
                <Route path="merma" element={<Movimientos key="mermas" tipo="mermas" />} />
                <Route path="productos" element={<Productos />} />
                <Route path="productos/:tipo/:id" element={<ItemDetalle />} />
                <Route path="promos" element={<Promos />} />
                <Route path="reportes" element={<Reportes />} />
                <Route path="estadisticas" element={<Estadisticas />} />
                <Route path="configuracion" element={<Configuracion />} />
                <Route path="proveedores" element={<Proveedores />} />
                <Route path="clientes" element={<Clientes />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Route>
            </Routes>
          </BrowserRouter>
        </Puerta>
      </AuthProvider>
    </DialogoProvider>
  )
}
