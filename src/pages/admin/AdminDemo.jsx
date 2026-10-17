import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ExternalLink, RefreshCw, Sparkles, Trash2 } from 'lucide-react'
import { api } from '../../lib/api'
import { dinero } from '../../lib/format'
import { useAuth } from '../../context/AuthContext'
import Modal from '../../components/Modal'

const PERIODOS = [
  { dias: 90, texto: '3 meses' },
  { dias: 180, texto: '6 meses' },
  { dias: 365, texto: '1 año' },
]

const mensajeDe = (e) => Object.values(e.detalles ?? {})[0]?.[0] ?? e.message
const entero = (n) => Number(n ?? 0).toLocaleString('es-CL')

// Cuánto historial y cuánto movimiento inventar
function CamposGeneracion({ form, setForm }) {
  return (
    <div className="grid grid-2-eq">
      <div className="campo">
        <label htmlFor="demo-dias">Historial</label>
        <select id="demo-dias" className="input" value={form.dias} onChange={(e) => setForm((f) => ({ ...f, dias: Number(e.target.value) }))}>
          {PERIODOS.map((p) => <option key={p.dias} value={p.dias}>{p.texto}</option>)}
        </select>
      </div>
      <div className="campo">
        <label htmlFor="demo-ventas">Ventas por día (aprox.)</label>
        <input id="demo-ventas" type="number" className="input" min={5} max={300} value={form.ventasDia}
          onChange={(e) => setForm((f) => ({ ...f, ventasDia: e.target.value }))} />
      </div>
    </div>
  )
}

const cuerpoGeneracion = (form) => ({ dias: form.dias, ventasDia: Math.min(300, Math.max(5, Number(form.ventasDia) || 30)) })

// Lleva al superadmin a la app con la demo como empresa activa
function useAbrirDemo() {
  const { recargarPerfil, elegirEmpresa } = useAuth()
  const navigate = useNavigate()
  return async (id) => {
    await recargarPerfil() // una demo recién creada todavía no está en su lista de empresas
    elegirEmpresa(id)
    navigate('/')
  }
}

export function NuevaDemo({ onClose }) {
  const navigate = useNavigate()
  const [form, setForm] = useState({ nombre: '', catalogo: true, dias: 180, ventasDia: 30 })
  const [creando, setCreando] = useState(false)
  const [error, setError] = useState('')

  const crear = async (e) => {
    e.preventDefault()
    setCreando(true)
    setError('')
    try {
      const r = await api('/admin/demos', { metodo: 'POST', body: { nombre: form.nombre, catalogo: form.catalogo, ...cuerpoGeneracion(form) } })
      navigate(`/admin/empresas/${r.id}`)
    } catch (err) {
      setError(mensajeDe(err))
      setCreando(false)
    }
  }

  return (
    <Modal titulo="Nueva demo" onClose={onClose}>
      <form className="form" onSubmit={crear}>
        <p className="sub">Una empresa de muestra para enseñarle la app a un posible cliente. Tú quedas como dueño y la ves en el selector de empresas.</p>
        <div className="campo">
          <label htmlFor="demo-nombre">Nombre del negocio</label>
          <input id="demo-nombre" className="input" required minLength={2} maxLength={100} autoFocus
            placeholder="Ej: Panadería La Espiga" value={form.nombre} onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))} />
        </div>
        <label className="fila-switch">
          <button type="button" className={`switch ${form.catalogo ? 'on' : ''}`} role="switch" aria-checked={form.catalogo}
            onClick={() => setForm((f) => ({ ...f, catalogo: !f.catalogo }))}>
            <span />
          </button>
          Cargar catálogo de ejemplo y generar movimientos
        </label>
        {form.catalogo
          ? <CamposGeneracion form={form} setForm={setForm} />
          : <div className="alerta">Queda vacía: carga sus productos (o importa su planilla) y después genera los movimientos desde el detalle de la demo.</div>}
        {error && <div className="alerta-error" role="alert">{error}</div>}
        <button className="btn btn-primary" disabled={creando}><Sparkles size={18} /> {creando ? 'Creando…' : 'Crear demo'}</button>
      </form>
    </Modal>
  )
}

// Panel del detalle de una demo: abrirla, regenerar sus movimientos o eliminarla
export function PanelDemo({ empresa, onCambio, onAviso }) {
  const navigate = useNavigate()
  const abrirDemo = useAbrirDemo()
  const [form, setForm] = useState({ dias: 180, ventasDia: 30 })
  const [trabajando, setTrabajando] = useState(false)
  const [error, setError] = useState('')
  const [confirmando, setConfirmando] = useState(false)

  const regenerar = async (e) => {
    e.preventDefault()
    setTrabajando(true)
    setError('')
    try {
      const r = await api(`/admin/empresas/${empresa.id}/demo/regenerar`, { metodo: 'POST', body: cuerpoGeneracion(form) })
      await onCambio()
      onAviso(`${entero(r.ventas)} ventas por ${dinero(r.montoVentas)} generadas`)
    } catch (err) {
      setError(mensajeDe(err))
    } finally {
      setTrabajando(false)
    }
  }

  const eliminar = async () => {
    setTrabajando(true)
    try {
      await api(`/admin/empresas/${empresa.id}/demo`, { metodo: 'DELETE' })
      navigate('/admin')
    } catch (err) {
      setConfirmando(false)
      setError(mensajeDe(err))
      setTrabajando(false)
    }
  }

  return (
    <div className="card">
      <div className="card-head">
        <h2>Demo</h2>
        <button className="btn btn-primary btn-sm" onClick={() => abrirDemo(empresa.id)}><ExternalLink size={16} /> Abrir en la app</button>
      </div>
      <ol className="pasos-demo">
        <li>Ábrela en la app y ponle el nombre y el logo del cliente en <strong>Configuración</strong>.</li>
        <li>Ajusta productos, promos y precios, o importa su planilla en <strong>Productos</strong>.</li>
        <li>Vuelve acá y regenera los movimientos: se inventan con su catálogo y quedan al día.</li>
      </ol>
      <form className="form" onSubmit={regenerar}>
        <CamposGeneracion form={form} setForm={setForm} />
        <p className="sub">Borra todos los movimientos de la demo (también los que cargues a mano) y genera otros hasta hoy.</p>
        {error && <div className="alerta-error" role="alert">{error}</div>}
        <button className="btn btn-registrar" disabled={trabajando}>
          <RefreshCw size={18} /> {trabajando ? 'Generando…' : 'Regenerar movimientos'}
        </button>
        <button type="button" className="btn btn-ghost" onClick={() => setConfirmando(true)} disabled={trabajando}>
          <Trash2 size={18} /> Eliminar demo
        </button>
      </form>

      {confirmando && (
        <Modal titulo="¿Eliminar demo?" onClose={() => setConfirmando(false)}>
          <div className="form">
            <p>Se borra <strong>{empresa.nombre}</strong> con su catálogo y sus movimientos. No se puede deshacer.</p>
            <button className="btn btn-peligro" onClick={eliminar} disabled={trabajando}><Trash2 size={18} /> Eliminar</button>
            <button className="btn btn-ghost" onClick={() => setConfirmando(false)}>Cancelar</button>
          </div>
        </Modal>
      )}
    </div>
  )
}
