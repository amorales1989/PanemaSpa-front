import { Link, Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { DataProvider } from '../context/DataContext'

// Secciones de la app y el permiso que necesita cada una (el menú usa la misma lista)
export const SECCIONES = [
  { ruta: '/', permisos: ['dashboard.ver'] },
  { ruta: '/ingresos', permisos: ['ventas.ver', 'ventas.ver_todas'] },
  { ruta: '/egresos', permisos: ['egresos.ver'] },
  { ruta: '/merma', permisos: ['mermas.ver'] },
  { ruta: '/productos', permisos: ['productos.ver_costos'] },
  { ruta: '/promos', permisos: ['promos.gestionar', 'estadisticas.ver'] },
  { ruta: '/clientes', permisos: ['clientes.ver'] },
  { ruta: '/proveedores', permisos: ['proveedores.ver'] },
  { ruta: '/estadisticas', permisos: ['estadisticas.ver'] },
  { ruta: '/reportes', permisos: ['reportes.descargar'] },
  { ruta: '/configuracion', permisos: ['usuarios.gestionar', 'configuracion.gestionar', 'sucursales.gestionar', 'productos.gestionar', 'insumos.gestionar', 'promos.gestionar'] },
]

export const seccionDe = (pathname) =>
  SECCIONES.find((s) => (s.ruta === '/' ? pathname === '/' : pathname.startsWith(s.ruta)))

// La app necesita sesión y una empresa. Los datos se cargan por empresa:
// al cambiar de empresa el DataProvider se vuelve a montar (key).
export default function RequiereSesion({ children }) {
  const { cargando, usuario, empresa, puede } = useAuth()
  const { pathname } = useLocation()

  if (cargando) return <div className="cargando-app">Cargando…</div>
  if (!usuario) return <Navigate to={`/login?siguiente=${encodeURIComponent(pathname)}`} replace />

  if (!empresa) {
    return (
      <div className="login">
        <div className="card login-card form">
          <h2 className="serif">Sin empresa asignada</h2>
          <p className="sub">Tu cuenta todavía no tiene acceso a ninguna empresa. Pídele al dueño del negocio que te agregue.</p>
          {usuario.esSuperadmin && <Link className="btn btn-primary" to="/admin">Ir a la plataforma</Link>}
        </div>
      </div>
    )
  }

  // Sección sin permiso: a la primera que sí pueda ver
  const seccion = seccionDe(pathname)
  if (seccion && !puede(...seccion.permisos)) {
    const primera = SECCIONES.find((s) => puede(...s.permisos))
    if (primera && primera.ruta !== pathname) return <Navigate to={primera.ruta} replace />
    if (!primera) {
      return (
        <div className="login">
          <div className="card login-card form">
            <h2 className="serif">Sin secciones disponibles</h2>
            <p className="sub">Tu rol en {empresa.nombre} no tiene acceso a ninguna sección. Pídele al dueño que revise tus permisos.</p>
          </div>
        </div>
      )
    }
  }

  return <DataProvider key={empresa.id}>{children}</DataProvider>
}
