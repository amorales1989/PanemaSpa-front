import { useEffect, useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { Home, TrendingUp, TrendingDown, PackageX, BarChart3, Plus, CheckCircle2, ShoppingBag, Package, BadgePercent, LayoutGrid, Check, FileText, ShieldCheck } from 'lucide-react'
import Registrar from './Registrar'
import DetalleRegistro from './DetalleRegistro'
import { useDatos } from '../context/DataContext'
import { useAuth } from '../context/AuthContext'
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
  // En el celular la barra muestra 4 secciones; el resto va en "Más"
  const principales = NAV.slice(0, 4)
  const secundarias = NAV.slice(4)
  const enSecundaria = secundarias.some((n) => pathname.startsWith(n.to))
  const { toast, exito } = useDatos()
  const { usuario } = useAuth()

  // Atajo de teclado: "V" abre el registro de venta (si no se está escribiendo)
  useEffect(() => {
    const onKey = (e) => {
      if (e.key.toLowerCase() !== 'v' || e.ctrlKey || e.metaKey || e.altKey) return
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName)) return
      if (document.querySelector('.overlay')) return
      e.preventDefault()
      setRegistrando((r) => r || 'venta')
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="logo">
          <div className="logo-mark">P</div>
          <div className="logo-text">Panema<small>Control del negocio</small></div>
        </div>
        {NAV.map(({ to, label, Icono }) => (
          <NavLink key={to} to={to} end={to === '/'} className="nav-link"><Icono size={20} />{label}</NavLink>
        ))}
        {usuario?.esSuperadmin && <NavLink to="/admin" className="nav-link"><ShieldCheck size={20} />Plataforma</NavLink>}
        <div className="acciones-sidebar">
          <button className="btn btn-venta" onClick={() => setRegistrando('venta')}>
            <ShoppingBag size={18} /> Registrar venta <kbd>V</kbd>
          </button>
          <button className="btn btn-registrar" onClick={() => setRegistrando(true)}><Plus size={18} /> Otro registro</button>
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
          </div>
        </div>
      )}
      <button className="fab" onClick={() => setRegistrando('venta')}><Plus size={22} /> Venta</button>

      {registrando && (
        <Registrar
          tipoInicial={registrando === 'venta' ? 'ingresos' : typeof registrando === 'string' ? registrando : null}
          onClose={() => setRegistrando(false)}
        />
      )}
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
