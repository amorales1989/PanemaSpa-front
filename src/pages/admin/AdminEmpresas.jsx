import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Building2, CircleAlert, Clock, Plus, Search, ShoppingBag, Sparkles, Star, Users } from 'lucide-react'
import { api } from '../../lib/api'
import { dinero } from '../../lib/format'
import { Kpi } from '../../components/ui'
import { ESTADO_EMPRESA, ESTADO_SUSCRIPCION, diasHasta, fecha, haceCuanto } from './adminFormato'
import { NuevaDemo } from './AdminDemo'
import { NuevaEmpresa } from './AdminEmpresaNueva'
import { paisDe } from '../../lib/paises'

const FILTROS = [
  { id: '', label: 'Todas' },
  { id: 'activa', label: 'Activas' },
  { id: 'suspendida', label: 'Suspendidas' },
]
const entero = (n) => Number(n ?? 0).toLocaleString('es-CL')

function Vencimiento({ empresa }) {
  const fin = empresa.suscripcion === 'prueba' ? empresa.pruebaHasta : empresa.periodoFin
  if (!fin) return empresa.suscripcion === 'activa' ? <div className="sub">Sin vencimiento</div> : null
  const dias = diasHasta(fin)
  const texto = dias < 0 ? `venció hace ${-dias} d` : dias === 0 ? 'vence hoy' : `vence en ${dias} d`
  return <div className={`sub ${dias <= 3 ? 'texto-alerta' : ''}`}>{texto}</div>
}

export default function AdminEmpresas() {
  const navigate = useNavigate()
  const [resumen, setResumen] = useState(null)
  const [empresas, setEmpresas] = useState(null)
  const [buscar, setBuscar] = useState('')
  const [estado, setEstado] = useState('')
  const [error, setError] = useState('')
  const [creandoDemo, setCreandoDemo] = useState(false)
  const [creandoEmpresa, setCreandoEmpresa] = useState(false)

  useEffect(() => {
    api('/admin/resumen').then(setResumen).catch((e) => setError(e.message))
  }, [])

  // Búsqueda con una pequeña espera para no consultar en cada tecla
  useEffect(() => {
    const t = setTimeout(() => {
      const q = new URLSearchParams({ ...(buscar.trim() && { buscar: buscar.trim() }), ...(estado && { estado }) })
      api(`/admin/empresas?${q}`).then(setEmpresas).catch((e) => setError(e.message))
    }, 250)
    return () => clearTimeout(t)
  }, [buscar, estado])

  const contar = (n) => entero(n)

  return (
    <>
      <div className="page-head">
        <div>
          <h1 className="serif">Empresas</h1>
          <p>Negocios registrados en la plataforma</p>
        </div>
        <div className="acciones-head">
          <button className="btn btn-registrar" onClick={() => setCreandoDemo(true)}><Sparkles size={18} /> Nueva demo</button>
          <button className="btn btn-primary" onClick={() => setCreandoEmpresa(true)}><Plus size={18} /> Nueva empresa</button>
        </div>
      </div>

      {error && <div className="alerta-error" role="alert">{error}</div>}

      {resumen && (
        <div className="grid kpis">
          <Kpi titulo="Empresas" valor={resumen.empresas} formato={contar} Icono={Building2} color="var(--brand)" suave="var(--brand-soft)"
            nota={`${contar(resumen.activas)} activas · ${contar(resumen.nuevas30d)} nuevas en 30 días`} />
          <Kpi titulo="En prueba" valor={resumen.enPrueba} formato={contar} Icono={Clock} color="var(--merma)" suave="var(--merma-soft)"
            nota={`${contar(resumen.pruebasPorVencer)} vencen en 7 días o menos`} />
          <Kpi titulo="Usuarios" valor={resumen.usuarios} formato={contar} Icono={Users} color="var(--ingreso)" suave="var(--ingreso-soft)"
            nota={`${contar(resumen.suspendidas)} empresas suspendidas`} />
          <Kpi titulo="Ventas 30 días" valor={resumen.monto30d} Icono={ShoppingBag} color="var(--ingreso)" suave="var(--ingreso-soft)"
            nota={`${contar(resumen.ventas30d)} tickets en todas las empresas`} />
        </div>
      )}

      <div className="card">
        <div className="toolbar">
          <label className="search">
            <Search size={18} />
            <input placeholder="Buscar por nombre o email del dueño" value={buscar} onChange={(e) => setBuscar(e.target.value)} />
          </label>
          <div className="segmented" role="tablist" aria-label="Estado">
            {FILTROS.map((f) => (
              <button key={f.id} className={estado === f.id ? 'on' : ''} onClick={() => setEstado(f.id)}>{f.label}</button>
            ))}
          </div>
        </div>

        {!empresas ? <div className="vacio">Cargando…</div> : empresas.length === 0 ? (
          <div className="vacio">No hay empresas que coincidan</div>
        ) : (
          <div className="tabla-scroll">
            <table className="tabla tabla-click compacta-movil">
              <thead>
                <tr>
                  <th>Empresa</th>
                  <th>Plan</th>
                  <th className="num ocultar-movil">Usuarios</th>
                  <th className="num ocultar-movil">Ventas 30 días</th>
                  <th className="ocultar-movil">Última actividad</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {empresas.map((e) => {
                  const sus = ESTADO_SUSCRIPCION[e.suscripcion]
                  const est = ESTADO_EMPRESA[e.estado]
                  return (
                    <tr key={e.id} onClick={() => navigate(`/admin/empresas/${e.id}`)}>
                      <td>
                        <strong>{e.nombre}</strong> {e.fundadora && <span className="badge fundadora"><Star size={11} /> Fundadora</span>}
                        {e.esDemo && <span className="badge demo"><Sparkles size={11} /> Demo</span>}
                        <div className="sub">{paisDe(e.pais).nombre} · {e.duenoEmail ?? 'Sin dueño'} · desde {fecha(e.createdAt)}</div>
                      </td>
                      <td>
                        {e.esDemo ? 'Sin plan' : e.plan ?? '—'} {sus && <span className={`badge ${sus.clase}`}>{sus.texto}</span>}
                        <Vencimiento empresa={e} />
                      </td>
                      <td className="num ocultar-movil">{entero(e.usuarios)}</td>
                      <td className="num ocultar-movil">
                        {dinero(e.monto30d)}
                        <div className="sub">{entero(e.ventas30d)} tickets</div>
                      </td>
                      <td className="ocultar-movil">{haceCuanto(e.ultimaActividad)}</td>
                      <td>
                        <span className={`badge ${est?.clase ?? ''}`}>
                          {e.estado === 'suspendida' && <CircleAlert size={12} />} {est?.texto ?? e.estado}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {creandoDemo && <NuevaDemo onClose={() => setCreandoDemo(false)} />}
      {creandoEmpresa && <NuevaEmpresa onClose={() => setCreandoEmpresa(false)} />}
    </>
  )
}
