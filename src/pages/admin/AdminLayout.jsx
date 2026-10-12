import { useState } from 'react'
import { Link, Navigate, NavLink, Outlet, useLocation } from 'react-router-dom'
import { Building2, KeyRound, LogOut, ShieldCheck, Store } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import CambiarPassword from '../../components/CambiarPassword'

// Marco del panel de plataforma: solo para superadmins
export default function AdminLayout() {
  const { usuario, cargando, cerrarSesion } = useAuth()
  const { pathname } = useLocation()
  const [cambiandoPassword, setCambiandoPassword] = useState(false)
  const [saliendo, setSaliendo] = useState(false)

  // Al salir se va al login "limpio": el próximo usuario no hereda /admin como destino
  const salir = () => {
    setSaliendo(true)
    cerrarSesion()
  }

  if (cargando) return <div className="vacio">Cargando…</div>
  if (!usuario) return <Navigate to={saliendo ? '/login' : `/login?siguiente=${encodeURIComponent(pathname)}`} replace />
  if (!usuario.esSuperadmin) {
    return (
      <div className="login">
        <div className="card login-card form">
          <h2 className="serif">Sin acceso</h2>
          <p className="sub">Esta sección es solo para el equipo de la plataforma.</p>
          <Link className="btn btn-primary" to="/">Ir a la app</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="app admin-app">
      <aside className="sidebar">
        <div className="logo">
          <div className="logo-mark">P</div>
          <div className="logo-text">Panema<small>Plataforma</small></div>
        </div>
        <NavLink to="/admin" end className="nav-link"><Building2 size={20} />Empresas</NavLink>
        <div className="acciones-sidebar">
          <div className="admin-usuario">
            <ShieldCheck size={16} />
            <div>
              <strong>{usuario.nombre}</strong>
              <span>{usuario.email}</span>
            </div>
          </div>
          <Link className="nav-link" to="/"><Store size={20} />Ir a la app</Link>
          <button className="nav-link nav-boton" onClick={() => setCambiandoPassword(true)}><KeyRound size={20} />Cambiar contraseña</button>
          <button className="nav-link nav-boton" onClick={salir}><LogOut size={20} />Salir</button>
        </div>
      </aside>
      <main className="main"><Outlet /></main>
      {cambiandoPassword && <CambiarPassword onClose={() => setCambiandoPassword(false)} />}
    </div>
  )
}
