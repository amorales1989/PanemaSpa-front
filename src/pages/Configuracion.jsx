import { useEffect, useRef, useState } from 'react'
import { Check, ImagePlus, Loader2, Printer } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useDatos } from '../context/DataContext'
import { api, urlArchivo } from '../lib/api'
import { reducirLogo } from '../lib/imagen'
import { VENTA_EJEMPLO, imprimirComprobante } from '../lib/comprobante'
import { useDialogo } from '../components/Dialogo'
import Equipo from '../components/Equipo'
import ListaEditable from '../components/config/ListaEditable'
import Importar from '../components/config/Importar'

const PESTANAS = [
  { id: 'equipo', label: 'Equipo', permisos: ['usuarios.gestionar'] },
  { id: 'listas', label: 'Listas', permisos: ['configuracion.gestionar', 'sucursales.gestionar'] },
  { id: 'importar', label: 'Importar catálogo', permisos: ['productos.gestionar', 'insumos.gestionar', 'promos.gestionar'] },
  { id: 'empresa', label: 'Empresa', permisos: ['configuracion.gestionar'] },
]

// Logo: se muestra en el menú y en los informes PDF
function Logo({ empresa, onCambio }) {
  const { confirmar, avisar } = useDialogo()
  const inputRef = useRef(null)
  const [subiendo, setSubiendo] = useState(false)
  const url = urlArchivo(empresa.logoUrl)

  const subir = async (archivo) => {
    if (!archivo) return
    setSubiendo(true)
    try {
      await api('/empresa/logo', { metodo: 'PUT', body: { imagen: await reducirLogo(archivo) } })
      await onCambio()
    } catch (e) {
      avisar({ tipo: 'error', titulo: 'No se pudo subir el logo', mensaje: e.message === 'El archivo no es una imagen' ? 'Elige una imagen (PNG o JPG).' : e.message })
    } finally {
      setSubiendo(false)
    }
  }

  const quitar = async () => {
    if (!(await confirmar({ titulo: '¿Quitar el logo?', mensaje: 'El menú y los informes vuelven a mostrar la inicial del negocio.', textoAceptar: 'Quitar logo', peligro: true }))) return
    await api('/empresa/logo', { metodo: 'DELETE' })
    await onCambio()
  }

  return (
    <div className="campo">
      <label>Logo</label>
      <div className="logo-editor">
        <button type="button" className="logo-vista" onClick={() => inputRef.current?.click()}
          onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); subir(e.dataTransfer.files[0]) }}
          aria-label={url ? 'Cambiar logo' : 'Subir logo'}>
          {subiendo ? <Loader2 size={22} className="girando" />
            : url ? <img src={url} alt={`Logo de ${empresa.nombre}`} />
              : <span className="logo-vacio">{empresa.nombre.charAt(0).toUpperCase()}</span>}
        </button>
        <div>
          <div className="acciones-form">
            <button type="button" className="btn btn-registrar btn-sm" onClick={() => inputRef.current?.click()} disabled={subiendo}>
              <ImagePlus size={16} /> {url ? 'Cambiar logo' : 'Subir logo'}
            </button>
            {url && <button type="button" className="btn btn-ghost btn-sm" onClick={quitar} disabled={subiendo}>Quitar</button>}
          </div>
          <div className="sub" style={{ marginTop: 6 }}>PNG o JPG. Mejor con fondo transparente. Aparece en el menú y en los informes PDF.</div>
        </div>
      </div>
      <input ref={inputRef} type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={(e) => { subir(e.target.files[0]); e.target.value = '' }} />
    </div>
  )
}

function DatosEmpresa() {
  const { recargarPerfil, empresa } = useAuth()
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
      <Logo empresa={empresa} onCambio={recargarPerfil} />
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

const FORMATOS = [
  { id: 'ticket', label: 'Ticket 80 mm', ayuda: 'Impresora térmica de caja' },
  { id: 'carta', label: 'Hoja carta / A4', ayuda: 'Impresora común' },
]

// Al finalizar una venta, ofrecer imprimir el detalle para el cliente
function ComprobanteVenta() {
  const { recargarPerfil, empresa } = useAuth()
  const [form, setForm] = useState(() => ({
    comprobanteActivo: empresa.comprobanteActivo, comprobanteFormato: empresa.comprobanteFormato ?? 'ticket',
    direccion: empresa.direccion ?? '', telefono: empresa.telefono ?? '', comprobantePie: empresa.comprobantePie ?? '',
  }))
  const [estado, setEstado] = useState({ guardando: false, error: '', listo: false })
  const set = (campo) => (e) => { setForm((f) => ({ ...f, [campo]: e.target.value })); setEstado((s) => ({ ...s, listo: false })) }
  const cambiar = (cambios) => { setForm((f) => ({ ...f, ...cambios })); setEstado((s) => ({ ...s, listo: false })) }

  const guardar = async (e) => {
    e.preventDefault()
    setEstado({ guardando: true, error: '', listo: false })
    try {
      await api('/empresa', {
        metodo: 'PATCH',
        body: { ...form, direccion: form.direccion.trim(), telefono: form.telefono.trim(), comprobantePie: form.comprobantePie.trim() },
      })
      await recargarPerfil() // la caja toma la configuración nueva al instante
      setEstado({ guardando: false, error: '', listo: true })
    } catch (err) {
      setEstado({ guardando: false, error: Object.values(err.detalles ?? {})[0]?.[0] ?? err.message, listo: false })
    }
  }

  // La vista previa usa lo que está en pantalla, aunque todavía no se haya guardado
  const vistaPrevia = () => imprimirComprobante(VENTA_EJEMPLO, { ...empresa, ...form })

  return (
    <form className="card form" style={{ maxWidth: 560 }} onSubmit={guardar}>
      <div className="card-head" style={{ marginBottom: 0 }}><h2>Comprobante de venta</h2></div>
      <label className="fila-switch">
        <button type="button" className={`switch ${form.comprobanteActivo ? 'on' : ''}`} role="switch" aria-checked={form.comprobanteActivo}
          onClick={() => cambiar({ comprobanteActivo: !form.comprobanteActivo })}>
          <span />
        </button>
        Ofrecer imprimir el detalle al finalizar cada venta
      </label>
      <div className="campo">
        <label>Formato</label>
        <div className="segmented" role="radiogroup" aria-label="Formato del comprobante">
          {FORMATOS.map((f) => (
            <button type="button" key={f.id} role="radio" aria-checked={form.comprobanteFormato === f.id} title={f.ayuda}
              className={form.comprobanteFormato === f.id ? 'on' : ''} onClick={() => cambiar({ comprobanteFormato: f.id })}>{f.label}</button>
          ))}
        </div>
        <div className="sub" style={{ marginTop: 6 }}>{FORMATOS.find((f) => f.id === form.comprobanteFormato).ayuda}.</div>
      </div>
      <div className="campo">
        <label htmlFor="emp-direccion">Dirección <span style={{ fontWeight: 400 }}>(opcional)</span></label>
        <input id="emp-direccion" className="input" maxLength={200} value={form.direccion} onChange={set('direccion')} />
      </div>
      <div className="campo">
        <label htmlFor="emp-telefono">Teléfono <span style={{ fontWeight: 400 }}>(opcional)</span></label>
        <input id="emp-telefono" className="input" maxLength={30} value={form.telefono} onChange={set('telefono')} />
      </div>
      <div className="campo">
        <label htmlFor="emp-pie">Mensaje al pie <span style={{ fontWeight: 400 }}>(opcional)</span></label>
        <input id="emp-pie" className="input" maxLength={200} placeholder="¡Gracias por tu compra!" value={form.comprobantePie} onChange={set('comprobantePie')} />
      </div>
      <div className="sub">También usa el logo, la razón social y el RUT de arriba. Es un comprobante interno, no una boleta ni factura.</div>
      {estado.error && <div className="alerta-error" role="alert">{estado.error}</div>}
      <div className="acciones-form">
        <button type="button" className="btn btn-ghost" onClick={vistaPrevia}><Printer size={18} /> Vista previa</button>
        <button className="btn btn-primary" style={{ flex: 1 }} disabled={estado.guardando}>
          <Check size={18} /> {estado.guardando ? 'Guardando…' : estado.listo ? 'Guardado' : 'Guardar'}
        </button>
      </div>
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
          <ListaEditable titulo="Medios de pago" ayuda="Con el lápiz puedes darle un % de descuento en ventas (ej. transferencia)"
            lista="metodos-pago" filas={config.metodosPago} conDescuento onCambio={recargarConfig} />
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
      {actual === 'empresa' && (
        <div className="grid">
          <DatosEmpresa />
          <ComprobanteVenta />
        </div>
      )}
    </>
  )
}
