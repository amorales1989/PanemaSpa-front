import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { Home, TrendingUp, TrendingDown, PackageX, BarChart3, Plus, CheckCircle2, ShoppingBag, Package, BadgePercent, LayoutGrid, Check, FileText, ShieldCheck, KeyRound, LogOut, LogIn, CircleUser } from 'lucide-react'
import Registrar from './Registrar'
import DetalleRegistro from './DetalleRegistro'
import CambiarPassword from './CambiarPassword'
import { useDatos } from '../context/DataContext'
import { useAuth } from '../context/AuthContext'
import { seccionDe } from './RequiereSesion'
import { dinero } from '../lib/format'

const NAV = [
  { to: '/', label: 'Inicio', Icono: Home },
  { to: '/ingresos', label: 'Ingresos', Icono: TrendingUp },
  { to: '/egresos', label: 'Egresos', Icono: TrendingDown },
  { to: '/merma', label: 'Merma', Icono: PackageX },
  { to: '/productos', label: 'Productos', Icono: Package },
  { to: '/promos', label: 'Promos', Icono: BadgePercent },
  { to: '/estadisticas', label: 'Estadísticas', Icono: BarChart3 },
  { to: '/reportes', label: 'Reportes', Icono: FileText },
]

export default function Layout() {
  const [registrando, setRegistrando] = useState(false)
  const [detalle, setDetalle] = useState(null)
  const [menuMas, setMenuMas] = useState(false)
  const { pathname } = useLocation()
  const { usuario, empresa, empresas, elegirEmpresa, cerrarSesion, puede } = useAuth()
  // Solo las secciones que el rol puede ver
  const nav = NAV.filter((n) => puede(...seccionDe(n.to).permisos))
  const puedeVender = puede('ventas.crear')
  const puedeRegistrar = puede('ventas.crear', 'egresos.crear', 'mermas.crear')
  // En el celular la barra muestra 4 secciones; el resto va en "Más"
  const principales = nav.slice(0, 4)
  const secundarias = nav.slice(4)
  const enSecundaria = secundarias.some((n) => pathname.startsWith(n.to))
  const { toast, exito } = useDatos()
  const navigate = useNavigate()
  const [cambiandoPassword, setCambiandoPassword] = useState(false)
  const salir = async () => {
    setMenuMas(false)
    await cerrarSesion()
    navigate('/login', { replace: true })
  }

  // Atajo de teclado: "V" abre el registro de venta (si no se está escribiendo)
  useEffect(() => {
    const onKey = (e) => {
      if (!puedeVender || e.key.toLowerCase() !== 'v' || e.ctrlKey || e.metaKey || e.altKey) return
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName)) return
      if (document.querySelector('.overlay')) return
      e.preventDefault()
      setRegistrando((r) => r || 'venta')
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [puedeVender])

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="logo">
          <div className="logo-mark">{empresa.nombre.charAt(0).toUpperCase()}</div>
          <div className="logo-text">{empresa.nombre}<small>Control del negocio</small></div>
        </div>
        {empresas.length > 1 && (
          <select className="selector-empresa" value={empresa.id} onChange={(e) => elegirEmpresa(e.target.value)} aria-label="Empresa">
            {empresas.map((e) => <option key={e.id} value={e.id}>{e.nombre}</option>)}
          </select>
        )}
        {nav.map(({ to, label, Icono }) => (
          <NavLink key={to} to={to} end={to === '/'} className="nav-link"><Icono size={20} />{label}</NavLink>
        ))}
        {usuario?.esSuperadmin && <NavLink to="/admin" className="nav-link"><ShieldCheck size={20} />Plataforma</NavLink>}
        <div className="acciones-sidebar">
          {puedeVender && (
            <button className="btn btn-venta" onClick={() => setRegistrando('venta')}>
              <ShoppingBag size={18} /> Registrar venta <kbd>V</kbd>
            </button>
          )}
          {puedeRegistrar && (
            <button className="btn btn-registrar" onClick={() => setRegistrando(true)}><Plus size={18} /> {puedeVender ? 'Otro registro' : 'Registrar'}</button>
          )}
          {usuario ? (
            <div className="cuenta">
              <CircleUser size={18} />
              <div className="cuenta-datos" title={usuario.email}><strong>{usuario.nombre}</strong><span>{usuario.email}</span></div>
              <button className="cuenta-btn" onClick={() => setCambiandoPassword(true)} title="Cambiar contraseña" aria-label="Cambiar contraseña"><KeyRound size={17} /></button>
              <button className="cuenta-btn" onClick={salir} title="Cerrar sesión" aria-label="Cerrar sesión"><LogOut size={17} /></button>
            </div>
          ) : (
            <Link className="nav-link" to="/login"><LogIn size={20} />Ingresar</Link>
          )}
        </div>
      </aside>

      <main className="main"><Outlet context={{ abrirRegistro: setRegistrando, abrirDetalle: (tipo, registro) => setDetalle({ tipo, registro }) }} /></main>

      {/* Navegación móvil: barra inferior + botón flotante para registrar */}
      <nav className="bottom-nav">
        {principales.map(({ to, label, Icono }) => (
          <NavLink key={to} to={to} end={to === '/'}><Icono size={22} />{label}</NavLink>
        ))}
        <a href="#mas" className={enSecundaria ? 'active' : ''} onClick={(e) => { e.preventDefault(); setMenuMas(true) }}>
          <LayoutGrid size={22} />Más
        </a>
      </nav>
      {menuMas && (
        <div className="overlay" onMouseDown={(e) => e.target === e.currentTarget && setMenuMas(false)}>
          <div className="modal menu-mas">
            {secundarias.map(({ to, label, Icono }) => (
              <NavLink key={to} to={to} className="opcion-registro" onClick={() => setMenuMas(false)}>
                <div className="mov-icon" style={{ background: 'var(--brand-soft)', color: 'var(--brand)' }}><Icono size={22} /></div>
                <strong>{label}</strong>
              </NavLink>
            ))}
            {usuario?.esSuperadmin && (
              <NavLink to="/admin" className="opcion-registro" onClick={() => setMenuMas(false)}>
                <div className="mov-icon" style={{ background: 'var(--brand-soft)', color: 'var(--brand)' }}><ShieldCheck size={22} /></div>
                <strong>Plataforma</strong>
              </NavLink>
            )}
            {usuario ? (
              <>
                <div className="menu-cuenta sub">{usuario.nombre} · {usuario.email}</div>
                {empresas.length > 1 && (
                  <select className="input" value={empresa.id} onChange={(e) => { setMenuMas(false); elegirEmpresa(e.target.value) }} aria-label="Empresa">
                    {empresas.map((e) => <option key={e.id} value={e.id}>{e.nombre}</option>)}
                  </select>
                )}
                <button className="opcion-registro" onClick={() => { setMenuMas(false); setCambiandoPassword(true) }}>
                  <div className="mov-icon" style={{ background: 'var(--surface-2)', color: 'var(--ink)' }}><KeyRound size={22} /></div>
                  <strong>Cambiar contraseña</strong>
                </button>
                <button className="opcion-registro" onClick={salir}>
                  <div className="mov-icon" style={{ background: 'var(--egreso-soft)', color: 'var(--egreso)' }}><LogOut size={22} /></div>
                  <strong>Cerrar sesión</strong>
                </button>
              </>
            ) : (
              <Link to="/login" className="opcion-registro" onClick={() => setMenuMas(false)}>
                <div className="mov-icon" style={{ background: 'var(--brand-soft)', color: 'var(--brand)' }}><LogIn size={22} /></div>
                <strong>Ingresar</strong>
              </Link>
            )}
          </div>
        </div>
      )}
      {puedeVender
        ? <button className="fab" onClick={() => setRegistrando('venta')}><Plus size={22} /> Venta</button>
        : puedeRegistrar && <button className="fab" onClick={() => setRegistrando(true)}><Plus size={22} /> Registrar</button>}

      {registrando && (
        <Registrar
          tipoInicial={registrando === 'venta' ? 'ingresos' : typeof registrando === 'string' ? registrando : null}
          onClose={() => setRegistrando(false)}
        />
      )}
      {cambiandoPassword && <CambiarPassword onClose={() => setCambiandoPassword(false)} />}
      {detalle && <DetalleRegistro {...detalle} onClose={() => setDetalle(null)} />}
      {exito && (
        <div className="exito" key={exito.clave} role="status">
          <div className="exito-icono"><Check size={40} strokeWidth={3} /></div>
          <strong>¡Venta registrada!</strong>
          <span>{dinero(exito.monto)}</span>
        </div>
      )}
      {toast && <div className="toast"><CheckCircle2 size={18} color="#7fd1a8" />{toast}</div>}
    </div>
  )
}
