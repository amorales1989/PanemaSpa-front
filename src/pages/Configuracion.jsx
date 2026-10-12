import { useEffect, useState } from 'react'
import { Check } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useDatos } from '../context/DataContext'
import { api } from '../lib/api'
import Equipo from '../components/Equipo'
import ListaEditable from '../components/config/ListaEditable'
import Importar from '../components/config/Importar'

const PESTANAS = [
  { id: 'equipo', label: 'Equipo', permisos: ['usuarios.gestionar'] },
  { id: 'listas', label: 'Listas', permisos: ['configuracion.gestionar', 'sucursales.gestionar'] },
  { id: 'importar', label: 'Importar catálogo', permisos: ['productos.gestionar', 'insumos.gestionar', 'promos.gestionar'] },
  { id: 'empresa', label: 'Empresa', permisos: ['configuracion.gestionar'] },
]

function DatosEmpresa() {
  const { recargarPerfil } = useAuth()
  const [form, setForm] = useState(null)
  const [estado, setEstado] = useState({ guardando: false, error: '', listo: false })

  useEffect(() => {
    api('/empresa')
      .then((e) => setForm({ nombre: e.nombre, razonSocial: e.razonSocial ?? '', rut: e.rut ?? '' }))
      .catch((e) => setEstado((s) => ({ ...s, error: e.message })))
  }, [])

  const set = (campo) => (e) => setForm((f) => ({ ...f, [campo]: e.target.value }))

  const guardar = async (e) => {
    e.preventDefault()
    setEstado({ guardando: true, error: '', listo: false })
    try {
      await api('/empresa', { metodo: 'PATCH', body: { nombre: form.nombre.trim(), razonSocial: form.razonSocial.trim(), rut: form.rut.trim() } })
      await recargarPerfil() // el nombre nuevo aparece en el menú y los informes
      setEstado({ guardando: false, error: '', listo: true })
    } catch (err) {
      setEstado({ guardando: false, error: Object.values(err.detalles ?? {})[0]?.[0] ?? err.message, listo: false })
    }
  }

  if (!form) return estado.error ? <div className="alerta-error">{estado.error}</div> : <div className="vacio">Cargando…</div>

  return (
    <form className="card form" style={{ maxWidth: 560 }} onSubmit={guardar}>
      <div className="campo">
        <label htmlFor="emp-nombre">Nombre del negocio</label>
        <input id="emp-nombre" className="input" required maxLength={100} value={form.nombre} onChange={set('nombre')} />
        <div className="sub" style={{ marginTop: 6 }}>Aparece en el menú y en los informes PDF.</div>
      </div>
      <div className="campo">
        <label htmlFor="emp-razon">Razón social <span style={{ fontWeight: 400 }}>(opcional)</span></label>
        <input id="emp-razon" className="input" maxLength={150} value={form.razonSocial} onChange={set('razonSocial')} />
      </div>
      <div className="campo">
        <label htmlFor="emp-rut">RUT <span style={{ fontWeight: 400 }}>(opcional)</span></label>
        <input id="emp-rut" className="input" maxLength={20} placeholder="76.123.456-7" value={form.rut} onChange={set('rut')} />
      </div>
      {estado.error && <div className="alerta-error" role="alert">{estado.error}</div>}
      <button className="btn btn-primary" disabled={estado.guardando}>
        <Check size={18} /> {estado.guardando ? 'Guardando…' : estado.listo ? 'Guardado' : 'Guardar'}
      </button>
    </form>
  )
}

function Listas() {
  const { config, recargarConfig, puede } = useDatos()
  const generales = puede('configuracion.gestionar')
  const lleva = (f) => f.conItems && <span className="badge" style={{ marginLeft: 8 }}>lleva insumos</span>

  return (
    <div className="grid grid-listas">
      {generales && (
        <>
          <ListaEditable titulo="Canales de venta" ayuda="Por dónde entra cada venta" lista="canales" filas={config.canales} onCambio={recargarConfig} />
          <ListaEditable titulo="Medios de pago" lista="metodos-pago" filas={config.metodosPago} onCambio={recargarConfig} />
          <ListaEditable titulo="Categorías de productos" lista="categorias" extra={{ ambito: 'producto' }} filas={config.categorias.producto} onCambio={recargarConfig} />
          <ListaEditable titulo="Categorías de insumos" lista="categorias" extra={{ ambito: 'insumo' }} filas={config.categorias.insumo} onCambio={recargarConfig} />
          <ListaEditable titulo="Categorías de egresos" ayuda="Sueldos, arriendo, servicios…" lista="categorias" extra={{ ambito: 'egreso' }}
            filas={config.categorias.egreso} etiqueta={lleva} onCambio={recargarConfig} />
          <ListaEditable titulo="Motivos de merma" lista="motivos-merma" filas={config.motivosMerma} onCambio={recargarConfig} />
        </>
      )}
      {puede('sucursales.gestionar') && (
        <ListaEditable titulo="Locales" ayuda="Sucursales del negocio" lista="sucursales" filas={config.sucursales} onCambio={recargarConfig} />
      )}
    </div>
  )
}

export default function Configuracion() {
  const { usuario, empresa, puede } = useAuth()
  const pestanas = PESTANAS.filter((p) => puede(...p.permisos))
  const [actual, setActual] = useState(pestanas[0]?.id)

  return (
    <>
      <div className="page-head">
        <div>
          <h1 className="serif">Configuración</h1>
          <p>Equipo, listas, catálogo y datos de {empresa.nombre}</p>
        </div>
      </div>
      {pestanas.length > 1 && (
        <div className="segmented" role="tablist" style={{ marginBottom: 16 }}>
          {pestanas.map((p) => (
            <button key={p.id} role="tab" aria-selected={actual === p.id} className={actual === p.id ? 'on' : ''} onClick={() => setActual(p.id)}>{p.label}</button>
          ))}
        </div>
      )}
      {actual === 'equipo' && (
        <Equipo base="/equipo" yoId={usuario.id} puedeDuenos={empresa.rolCodigo === 'dueno'} />
      )}
      {actual === 'listas' && <Listas />}
      {actual === 'importar' && <Importar />}
      {actual === 'empresa' && <DatosEmpresa />}
    </>
  )
}
