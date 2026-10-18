import { useCallback, useEffect, useState } from 'react'
import { Check, Mail, MessageCircle, Pencil, Phone, Plus, Search, Trash2, Users } from 'lucide-react'
import { api } from '../lib/api'
import { dinero, etiquetaDia } from '../lib/format'
import { ventaDesdeApi } from '../lib/mapeo'
import { useDatos } from '../context/DataContext'
import { useAuth } from '../context/AuthContext'
import Modal from '../components/Modal'
import DetalleRegistro from '../components/DetalleRegistro'
import { useDialogo } from '../components/Dialogo'
import { numeroWhatsapp, usePais } from '../lib/paises'

const camposCliente = (pais) => [
  { id: 'nombre', label: 'Nombre', requerido: true, placeholder: 'Ej: Juana Pérez' },
  { id: 'documento', label: pais.documento, placeholder: pais.documentoEjemplo },
  { id: 'telefono', label: 'Teléfono', tipo: 'tel', placeholder: pais.telefonoEjemplo },
  { id: 'email', label: 'Email', tipo: 'email' },
  { id: 'direccion', label: 'Dirección' },
  { id: 'notas', label: 'Notas', tipo: 'area', placeholder: 'Preferencias, datos de despacho…' },
]

const soloDigitos = (t) => String(t ?? '').replace(/\D/g, '')
// '' → null en los opcionales (para poder borrarlos al editar)
const limpiar = (form) => Object.fromEntries(Object.entries(form).map(([id, v]) => [id, typeof v === 'string' ? (v.trim() || null) : (v ?? null)]))
const mensajeDe = (e) => Object.values(e.detalles ?? {})[0]?.[0] ?? e.message

function Formulario({ cliente, onGuardado, onClose }) {
  const campos = camposCliente(usePais())
  const [form, setForm] = useState(() => Object.fromEntries(campos.map(({ id }) => [id, cliente?.[id] ?? ''])))
  const [error, setError] = useState('')
  const [enviando, setEnviando] = useState(false)

  const enviar = async (e) => {
    e.preventDefault()
    setEnviando(true)
    setError('')
    try {
      const c = await api(cliente ? `/clientes/${cliente.id}` : '/clientes', { metodo: cliente ? 'PATCH' : 'POST', body: limpiar(form) })
      onGuardado(c)
    } catch (err) {
      setError(mensajeDe(err))
      setEnviando(false)
    }
  }

  return (
    <Modal titulo={cliente ? 'Editar cliente' : 'Nuevo cliente'} onClose={onClose}>
      <form className="form" onSubmit={enviar}>
        {campos.map((c) => (
          <div className="campo" key={c.id}>
            <label htmlFor={`cli-${c.id}`}>{c.label}{!c.requerido && <span style={{ fontWeight: 400 }}> (opcional)</span>}</label>
            {c.tipo === 'area' ? (
              <textarea id={`cli-${c.id}`} className="input" rows={3} maxLength={1000} placeholder={c.placeholder}
                value={form[c.id]} onChange={(e) => setForm((f) => ({ ...f, [c.id]: e.target.value }))} />
            ) : (
              <input id={`cli-${c.id}`} className="input" required={c.requerido} type={c.tipo ?? 'text'} placeholder={c.placeholder}
                autoFocus={c.id === 'nombre'} maxLength={c.id === 'nombre' ? 100 : 200}
                value={form[c.id]} onChange={(e) => setForm((f) => ({ ...f, [c.id]: e.target.value }))} />
            )}
          </div>
        ))}
        {error && <div className="alerta-error" role="alert">{error}</div>}
        <button className="btn btn-primary" disabled={enviando}><Check size={18} /> {enviando ? 'Guardando…' : 'Guardar'}</button>
      </form>
    </Modal>
  )
}

// Ficha del cliente: contacto y sus últimas compras
function Ficha({ cliente, gestiona, onEditar, onEliminar, onClose }) {
  const { hoy, puede } = useDatos()
  const { empresa } = useAuth()
  const pais = usePais()
  const [ventas, setVentas] = useState(null)
  const [detalle, setDetalle] = useState(null)
  const veVentas = puede('ventas.ver_todas')

  useEffect(() => {
    if (!veVentas) return
    api(`/ventas?clienteId=${cliente.id}&limite=20`)
      .then((r) => setVentas(r.datos.map((v) => ventaDesdeApi(v, empresa.zonaHoraria))))
      .catch(() => setVentas([]))
  }, [cliente.id, veVentas, empresa.zonaHoraria])

  if (detalle) return <DetalleRegistro tipo="ingresos" registro={detalle} onClose={() => setDetalle(null)} />

  return (
    <Modal titulo={cliente.nombre} onClose={onClose}>
      <div className="detalle-datos">
        {[
          [pais.documento, cliente.documento], ['Teléfono', cliente.telefono], ['Email', cliente.email], ['Dirección', cliente.direccion],
          ['Compras', `${cliente.compras} · ${dinero(cliente.totalComprado)}`],
          ['Última compra', cliente.ultimaCompra ? etiquetaDia(cliente.ultimaCompra, hoy) : 'Todavía no compra'],
        ].filter(([, v]) => v).map(([k, v]) => <div key={k}><span>{k}</span><strong>{v}</strong></div>)}
      </div>
      {cliente.notas && <p className="proveedor-notas">{cliente.notas}</p>}
      {(cliente.telefono || cliente.email) && (
        <div className="proveedor-contacto" style={{ marginTop: 12 }}>
          {cliente.telefono && <a className="btn btn-ghost btn-sm" href={`tel:${soloDigitos(cliente.telefono)}`}><Phone size={15} /> Llamar</a>}
          {cliente.telefono && <a className="btn btn-ghost btn-sm" href={`https://wa.me/${numeroWhatsapp(cliente.telefono, pais.codigo)}`} target="_blank" rel="noreferrer"><MessageCircle size={15} /> WhatsApp</a>}
          {cliente.email && <a className="btn btn-ghost btn-sm" href={`mailto:${cliente.email}`}><Mail size={15} /> Email</a>}
        </div>
      )}

      {veVentas && (
        <>
          <h3 className="ficha-subtitulo">Últimas compras</h3>
          {!ventas ? <div className="sub">Cargando…</div> : !ventas.length ? <div className="sub">Sin compras registradas.</div> : (
            <table className="tabla tabla-click">
              <tbody>
                {ventas.map((v) => (
                  <tr key={v.id} onClick={() => setDetalle(v)}>
                    <td>#{v.numero}<div className="sub">{etiquetaDia(v.fecha, hoy)} · {v.metodo}</div></td>
                    <td className="sub">{v.items.length} {v.items.length === 1 ? 'producto' : 'productos'}</td>
                    <td className="num"><strong>{dinero(v.monto)}</strong></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </>
      )}

      {gestiona && (
        <div className="acciones-form" style={{ marginTop: 16 }}>
          <button type="button" className="btn btn-ghost" onClick={onEliminar}><Trash2 size={16} /> Eliminar</button>
          <button type="button" className="btn btn-registrar" style={{ flex: 1 }} onClick={onEditar}><Pencil size={16} /> Editar</button>
        </div>
      )}
    </Modal>
  )
}

export default function Clientes() {
  const { puede, hoy } = useDatos()
  const { confirmar } = useDialogo()
  const pais = usePais()
  const gestiona = puede('clientes.gestionar')
  const puedeCrear = gestiona || puede('ventas.crear')
  const [clientes, setClientes] = useState(null)
  const [busqueda, setBusqueda] = useState('')
  const [ficha, setFicha] = useState(null)
  const [editando, setEditando] = useState(null) // null | 'nuevo' | cliente
  const [aviso, setAviso] = useState('')
  const [error, setError] = useState('')

  const cargar = useCallback((q) =>
    api(`/clientes?limite=200${q ? `&buscar=${encodeURIComponent(q)}` : ''}`).then(setClientes).catch((e) => setError(e.message)), [])

  // Búsqueda en el servidor con una pequeña espera entre teclas
  useEffect(() => {
    const t = setTimeout(() => cargar(busqueda.trim()), 250)
    return () => clearTimeout(t)
  }, [busqueda, cargar])

  const mostrar = (t) => { setAviso(t); setTimeout(() => setAviso(''), 1800) }

  const guardado = (c) => {
    setClientes((l) => (l.some((x) => x.id === c.id) ? l.map((x) => (x.id === c.id ? c : x)) : [c, ...l]))
    setEditando(null)
    setFicha(c)
    mostrar('Cliente guardado')
  }

  const eliminar = async (c) => {
    const ok = await confirmar({
      titulo: `¿Eliminar a ${c.nombre}?`,
      mensaje: 'Deja de aparecer en la búsqueda. Sus ventas lo siguen mostrando.',
      textoAceptar: 'Eliminar', peligro: true,
    })
    if (!ok) return
    try {
      await api(`/clientes/${c.id}`, { metodo: 'DELETE' })
      setClientes((l) => l.filter((x) => x.id !== c.id))
      setFicha(null)
      mostrar('Cliente eliminado')
    } catch (e) {
      setError(e.message)
    }
  }

  return (
    <>
      <div className="page-head">
        <div>
          <h1 className="serif">Clientes</h1>
          <p>Para asociarlos a la venta y ver lo que compra cada uno.</p>
        </div>
        {puedeCrear && (
          <div className="acciones-head">
            <button className="btn btn-primary" onClick={() => setEditando('nuevo')}><Plus size={18} /> Nuevo cliente</button>
          </div>
        )}
      </div>

      <div className="toolbar">
        <label className="search">
          <Search size={18} />
          <input placeholder={`Buscar por nombre, ${pais.documento}, teléfono o email`} value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
        </label>
      </div>

      {error && <div className="alerta-error" role="alert" style={{ marginBottom: 16 }}>{error}</div>}

      {!clientes ? <div className="vacio">Cargando…</div> : !clientes.length ? (
        <div className="card vacio">
          <Users size={28} />
          <p>{busqueda ? 'No hay clientes que coincidan.' : 'Todavía no hay clientes. También se pueden agregar al registrar una venta.'}</p>
        </div>
      ) : (
        <div className="card">
          <div className="tabla-scroll">
            <table className="tabla tabla-click compacta-movil">
              <thead>
                <tr>
                  <th>Cliente</th>
                  <th className="ocultar-movil">Contacto</th>
                  <th className="num">Compras</th>
                  <th className="ocultar-movil">Última compra</th>
                </tr>
              </thead>
              <tbody>
                {clientes.map((c) => (
                  <tr key={c.id} onClick={() => setFicha(c)}>
                    <td><strong>{c.nombre}</strong>{c.documento && <div className="sub">{c.documento}</div>}</td>
                    <td className="ocultar-movil">{c.telefono ?? '—'}{c.email && <div className="sub">{c.email}</div>}</td>
                    <td className="num">{dinero(c.totalComprado)}<div className="sub">{c.compras} {c.compras === 1 ? 'compra' : 'compras'}</div></td>
                    <td className="ocultar-movil">{c.ultimaCompra ? etiquetaDia(c.ultimaCompra, hoy) : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {ficha && !editando && (
        <Ficha cliente={ficha} gestiona={gestiona} onClose={() => setFicha(null)}
          onEditar={() => setEditando(ficha)} onEliminar={() => eliminar(ficha)} />
      )}
      {editando && (
        <Formulario cliente={editando === 'nuevo' ? null : editando} onGuardado={guardado} onClose={() => setEditando(null)} />
      )}
      {aviso && <div className="toast"><Check size={18} color="#7fd1a8" />{aviso}</div>}
    </>
  )
}
