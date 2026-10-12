import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, Ban, CalendarPlus, Check, RotateCcw } from 'lucide-react'
import { api } from '../../lib/api'
import { dinero } from '../../lib/format'
import Modal from '../../components/Modal'
import { ESTADO_EMPRESA, ESTADO_SUSCRIPCION, fecha, haceCuanto, sumarDias } from './adminFormato'

const ESTADOS_SUSCRIPCION = ['prueba', 'activa', 'vencida', 'cancelada']

function Dato({ titulo, children }) {
  return (
    <div className="dato">
      <span>{titulo}</span>
      <strong>{children}</strong>
    </div>
  )
}

// Edición de plan, estado y fechas de la suscripción actual
function Suscripcion({ empresa, planes, onGuardar }) {
  const [form, setForm] = useState(() => ({
    planCodigo: empresa.planCodigo ?? 'basico',
    estado: empresa.suscripcion ?? 'activa',
    pruebaHasta: empresa.pruebaHasta ?? '',
    periodoFin: empresa.periodoFin ?? '',
  }))
  const set = (campo) => (e) => setForm((f) => ({ ...f, [campo]: e.target.value }))
  const [guardando, setGuardando] = useState(false)

  const guardar = async (cambios) => {
    setGuardando(true)
    try {
      await onGuardar(cambios)
    } finally {
      setGuardando(false)
    }
  }

  const extenderPrueba = () => {
    const pruebaHasta = sumarDias(empresa.pruebaHasta, 14)
    setForm((f) => ({ ...f, pruebaHasta, estado: 'prueba' }))
    guardar({ pruebaHasta, estado: 'prueba' })
  }

  return (
    <div className="card">
      <div className="card-head">
        <h2>Suscripción</h2>
        <button className="btn btn-registrar btn-sm" onClick={extenderPrueba} disabled={guardando}>
          <CalendarPlus size={16} /> +14 días de prueba
        </button>
      </div>
      <form className="form" onSubmit={(e) => {
        e.preventDefault()
        guardar({
          planCodigo: form.planCodigo,
          estado: form.estado,
          pruebaHasta: form.pruebaHasta || null,
          ...(form.periodoFin && { periodoFin: form.periodoFin }),
        })
      }}>
        <div className="grid grid-2-eq">
          <div className="campo">
            <label htmlFor="plan">Plan</label>
            <select id="plan" className="input" value={form.planCodigo} onChange={set('planCodigo')}>
              {planes.map((p) => (
                <option key={p.codigo} value={p.codigo}>{p.nombre} · {dinero(p.precioMensual)}/mes</option>
              ))}
            </select>
          </div>
          <div className="campo">
            <label htmlFor="estado-sus">Estado</label>
            <select id="estado-sus" className="input" value={form.estado} onChange={set('estado')}>
              {ESTADOS_SUSCRIPCION.map((e) => <option key={e} value={e}>{ESTADO_SUSCRIPCION[e].texto}</option>)}
            </select>
          </div>
          <div className="campo">
            <label htmlFor="prueba-hasta">Prueba hasta</label>
            <input id="prueba-hasta" type="date" className="input" value={form.pruebaHasta} onChange={set('pruebaHasta')} />
          </div>
          <div className="campo">
            <label htmlFor="periodo-fin">Período pagado hasta</label>
            <input id="periodo-fin" type="date" className="input" value={form.periodoFin} onChange={set('periodoFin')} />
          </div>
        </div>
        <button className="btn btn-primary" disabled={guardando}><Check size={18} /> {guardando ? 'Guardando…' : 'Guardar suscripción'}</button>
      </form>
    </div>
  )
}

export default function AdminEmpresa() {
  const { id } = useParams()
  const [empresa, setEmpresa] = useState(null)
  const [planes, setPlanes] = useState([])
  const [error, setError] = useState('')
  const [aviso, setAviso] = useState('')
  const [confirmando, setConfirmando] = useState(false)

  const cargar = useCallback(() => api(`/admin/empresas/${id}`).then(setEmpresa).catch((e) => setError(e.message)), [id])

  useEffect(() => {
    cargar()
    api('/admin/planes').then(setPlanes).catch(() => {})
  }, [cargar])

  const mostrarAviso = (texto) => {
    setAviso(texto)
    setTimeout(() => setAviso(''), 2600)
  }

  const cambiarEstado = async (estado) => {
    setConfirmando(false)
    try {
      setEmpresa(await api(`/admin/empresas/${id}/estado`, { metodo: 'PATCH', body: { estado } }))
      mostrarAviso(estado === 'activa' ? 'Empresa reactivada' : 'Empresa suspendida')
    } catch (e) {
      setError(e.message)
    }
  }

  const guardarSuscripcion = async (cambios) => {
    try {
      setEmpresa(await api(`/admin/empresas/${id}/suscripcion`, { metodo: 'PATCH', body: cambios }))
      setError('')
      mostrarAviso('Suscripción actualizada')
    } catch (e) {
      setError(Object.values(e.detalles ?? {})[0]?.[0] ?? e.message)
    }
  }

  if (error && !empresa) return <div className="alerta-error" role="alert">{error}</div>
  if (!empresa) return <div className="vacio">Cargando…</div>

  const est = ESTADO_EMPRESA[empresa.estado]
  const suspendida = empresa.estado === 'suspendida'

  return (
    <>
      <Link to="/admin" className="link volver"><ArrowLeft size={16} /> Empresas</Link>
      <div className="page-head">
        <div>
          <h1 className="serif">{empresa.nombre}</h1>
          <p>/{empresa.slug} · desde {fecha(empresa.createdAt)} · <span className={`badge ${est?.clase ?? ''}`}>{est?.texto}</span></p>
        </div>
        {suspendida ? (
          <button className="btn btn-primary" onClick={() => cambiarEstado('activa')}><RotateCcw size={18} /> Reactivar</button>
        ) : (
          <button className="btn btn-peligro" onClick={() => setConfirmando(true)}><Ban size={18} /> Suspender</button>
        )}
      </div>

      {error && <div className="alerta-error" role="alert" style={{ marginBottom: 16 }}>{error}</div>}
      {suspendida && (
        <div className="alerta" style={{ marginBottom: 16 }}>
          Sus usuarios no pueden usar la app hasta que la reactives. Los datos se conservan.
        </div>
      )}

      <div className="grid grid-2" style={{ marginBottom: 16 }}>
        <Suscripcion key={`${empresa.planCodigo}-${empresa.suscripcion}-${empresa.pruebaHasta}-${empresa.periodoFin}`}
          empresa={empresa} planes={planes} onGuardar={guardarSuscripcion} />
        <div className="card">
          <div className="card-head"><h2>Uso</h2></div>
          <div className="datos">
            <Dato titulo="Ventas registradas">{Number(empresa.ventas).toLocaleString('es-CL')}</Dato>
            <Dato titulo="Monto vendido">{dinero(empresa.montoVentas)}</Dato>
            <Dato titulo="Productos">{empresa.productos}</Dato>
            <Dato titulo="Sucursales">{empresa.sucursales}</Dato>
            <Dato titulo="Moneda">{empresa.moneda}</Dato>
            <Dato titulo="Zona horaria"><span title={empresa.zonaHoraria}>{empresa.zonaHoraria.split('/').pop().replace(/_/g, ' ')}</span></Dato>
          </div>
        </div>
      </div>

      <div className="grid grid-2">
        <div className="card">
          <div className="card-head"><h2>Usuarios</h2><span className="sub">{empresa.usuarios.length}</span></div>
          <div className="tabla-scroll">
            <table className="tabla">
              <thead><tr><th>Usuario</th><th>Rol</th><th>Último acceso</th></tr></thead>
              <tbody>
                {empresa.usuarios.map((u) => (
                  <tr key={u.membresiaId}>
                    <td><strong>{u.nombre}</strong><div className="sub">{u.email}</div></td>
                    <td>{u.rol}{u.estado !== 'activo' && <span className="badge mal">Suspendido</span>}</td>
                    <td>{haceCuanto(u.ultimoAccesoEn)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div className="card">
          <div className="card-head"><h2>Historial de suscripciones</h2></div>
          <table className="tabla">
            <thead><tr><th>Plan</th><th>Estado</th><th>Período</th></tr></thead>
            <tbody>
              {empresa.suscripciones.map((s) => (
                <tr key={s.id}>
                  <td>{s.plan}</td>
                  <td><span className={`badge ${ESTADO_SUSCRIPCION[s.estado]?.clase ?? ''}`}>{ESTADO_SUSCRIPCION[s.estado]?.texto ?? s.estado}</span></td>
                  <td className="sub">{fecha(s.periodoInicio)} → {fecha(s.estado === 'prueba' ? s.pruebaHasta : s.periodoFin)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {confirmando && (
        <Modal titulo="¿Suspender empresa?" onClose={() => setConfirmando(false)}>
          <div className="form">
            <p>Los usuarios de <strong>{empresa.nombre}</strong> dejarán de poder usar la app de inmediato. Los datos no se borran y puedes reactivarla cuando quieras.</p>
            <button className="btn btn-peligro" onClick={() => cambiarEstado('suspendida')}><Ban size={18} /> Suspender</button>
            <button className="btn btn-ghost" onClick={() => setConfirmando(false)}>Cancelar</button>
          </div>
        </Modal>
      )}
      {aviso && <div className="toast"><Check size={18} color="#7fd1a8" />{aviso}</div>}
    </>
  )
}
