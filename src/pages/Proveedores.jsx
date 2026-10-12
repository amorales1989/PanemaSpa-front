import { useCallback, useEffect, useMemo, useState } from 'react'
import { Check, Copy, Landmark, Mail, MessageCircle, Pencil, Phone, Plus, Search, Star, Trash2, Truck } from 'lucide-react'
import { api } from '../lib/api'
import { copiar } from '../lib/copiar'
import { normalizarRut } from '../lib/rut'
import { dinero, etiquetaDia } from '../lib/format'
import { useDatos } from '../context/DataContext'
import Modal from '../components/Modal'

const TIPOS_CUENTA = { corriente: 'Cuenta corriente', vista: 'Cuenta vista', rut: 'CuentaRUT', ahorro: 'Cuenta de ahorro' }
const BANCOS = ['Banco de Chile', 'BancoEstado', 'Santander', 'BCI', 'Scotiabank', 'Itaú', 'BICE', 'Security', 'Banco Falabella',
  'Banco Ripley', 'Consorcio', 'Banco Internacional', 'Coopeuch', 'Tenpo', 'Mercado Pago', 'MACH', 'Prepago Los Héroes']

// Texto listo para pegar en la app del banco
const datosTransferencia = (c) => [
  `Nombre: ${c.titular}`,
  c.rutTitular && `RUT: ${c.rutTitular}`,
  `Banco: ${c.banco}`,
  `Tipo de cuenta: ${TIPOS_CUENTA[c.tipoCuenta]}`,
  `N° de cuenta: ${c.numero}`,
  c.email && `Email: ${c.email}`,
].filter(Boolean).join('\n')

const soloDigitos = (t) => String(t ?? '').replace(/\D/g, '')
// WhatsApp: números chilenos de 9 dígitos sin el 56 adelante
const whatsapp = (tel) => {
  const d = soloDigitos(tel)
  return d.length === 9 ? `56${d}` : d
}

function BotonCopiar({ texto, etiqueta, onCopiado, grande }) {
  const [hecho, setHecho] = useState(false)
  const accion = async () => {
    if (await copiar(texto)) {
      setHecho(true)
      onCopiado?.(etiqueta)
      setTimeout(() => setHecho(false), 1500)
    }
  }
  if (grande) {
    return (
      <button type="button" className="btn btn-primary btn-copiar-todo" onClick={accion}>
        {hecho ? <Check size={18} /> : <Copy size={18} />} {hecho ? 'Copiado' : 'Copiar datos para transferir'}
      </button>
    )
  }
  return (
    <button type="button" className="icon-btn btn-copiar" onClick={accion} aria-label={`Copiar ${etiqueta}`} title={`Copiar ${etiqueta}`}>
      {hecho ? <Check size={15} color="var(--ingreso)" /> : <Copy size={15} />}
    </button>
  )
}

// Fila "etiqueta · valor [copiar]"
function Dato({ etiqueta, valor, onCopiado, href }) {
  if (!valor) return null
  return (
    <div className="dato-copiable">
      <span>{etiqueta}</span>
      {href ? <a href={href}>{valor}</a> : <strong>{valor}</strong>}
      <BotonCopiar texto={valor} etiqueta={etiqueta.toLowerCase()} onCopiado={onCopiado} />
    </div>
  )
}

function Cuenta({ c, gestiona, onEditar, onEliminar, onCopiado }) {
  return (
    <div className={`cuenta-banco ${c.principal ? 'principal' : ''}`}>
      <div className="cuenta-banco-head">
        <Landmark size={16} />
        <strong>{c.banco}</strong>
        <span className="sub">· {TIPOS_CUENTA[c.tipoCuenta]}</span>
        {c.principal && <span className="badge bien"><Star size={11} /> Principal</span>}
        {gestiona && (
          <span className="cuenta-banco-acciones">
            <button className="icon-btn" onClick={onEditar} aria-label="Editar cuenta" title="Editar cuenta"><Pencil size={15} /></button>
            <button className="icon-btn" onClick={onEliminar} aria-label="Eliminar cuenta" title="Eliminar cuenta"><Trash2 size={15} /></button>
          </span>
        )}
      </div>
      <Dato etiqueta="N° de cuenta" valor={c.numero} onCopiado={onCopiado} />
      <Dato etiqueta="Titular" valor={c.titular} onCopiado={onCopiado} />
      <Dato etiqueta="RUT" valor={c.rutTitular} onCopiado={onCopiado} />
      <Dato etiqueta="Email" valor={c.email} onCopiado={onCopiado} />
      <BotonCopiar texto={datosTransferencia(c)} etiqueta="datos para transferir" onCopiado={onCopiado} grande />
    </div>
  )
}

function Formulario({ titulo, campos, inicial, onGuardar, onClose }) {
  const [form, setForm] = useState(inicial)
  const [error, setError] = useState('')
  const [enviando, setEnviando] = useState(false)
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  const enviar = async (e) => {
    e.preventDefault()
    // RUT: aviso inmediato si el dígito verificador no calza
    for (const c of campos) {
      if (c.rut && form[c.id] && !normalizarRut(form[c.id])) return setError(`${c.label} inválido: revisa el dígito verificador`)
    }
    setEnviando(true)
    setError('')
    try {
      await onGuardar(form)
      onClose()
    } catch (err) {
      setError(err.codigo === 'DUPLICADO' ? 'Ya existe un proveedor con ese nombre' : Object.values(err.detalles ?? {})[0]?.[0] ?? err.message)
      setEnviando(false)
    }
  }

  return (
    <Modal titulo={titulo} onClose={onClose}>
      <form className="form" onSubmit={enviar}>
        {campos.map((c) => (
          <div className="campo" key={c.id}>
            <label htmlFor={`f-${c.id}`}>{c.label}{!c.requerido && c.tipo !== 'interruptor' && <span style={{ fontWeight: 400 }}> (opcional)</span>}</label>
            {c.tipo === 'chips' ? (
              <div className="chips">
                {Object.entries(c.opciones).map(([v, t]) => (
                  <button type="button" key={v} className={`chip ${form[c.id] === v ? 'on' : ''}`} onClick={() => set(c.id, v)}>{t}</button>
                ))}
              </div>
            ) : c.tipo === 'interruptor' ? (
              <button type="button" role="switch" aria-checked={!!form[c.id]} className={`switch ${form[c.id] ? 'on' : ''}`} onClick={() => set(c.id, !form[c.id])}><span /></button>
            ) : c.tipo === 'area' ? (
              <textarea id={`f-${c.id}`} className="input" rows={3} maxLength={1000} placeholder={c.placeholder} value={form[c.id] ?? ''} onChange={(e) => set(c.id, e.target.value)} />
            ) : (
              <input id={`f-${c.id}`} className="input" required={c.requerido} list={c.lista} type={c.tipo ?? 'text'} inputMode={c.inputMode}
                placeholder={c.placeholder} value={form[c.id] ?? ''} onChange={(e) => set(c.id, e.target.value)}
                onBlur={c.rut ? () => normalizarRut(form[c.id]) && set(c.id, normalizarRut(form[c.id])) : undefined} />
            )}
          </div>
        ))}
        <datalist id="bancos">{BANCOS.map((b) => <option key={b} value={b} />)}</datalist>
        {error && <div className="alerta-error" role="alert">{error}</div>}
        <button className="btn btn-primary" disabled={enviando}><Check size={18} /> {enviando ? 'Guardando…' : 'Guardar'}</button>
      </form>
    </Modal>
  )
}

const CAMPOS_PROVEEDOR = [
  { id: 'nombre', label: 'Nombre', requerido: true, placeholder: 'Ej: Molinera del Sur' },
  { id: 'rut', label: 'RUT', rut: true, placeholder: '76.123.456-7' },
  { id: 'contacto', label: 'Persona de contacto', placeholder: 'Ej: Pedro (vendedor)' },
  { id: 'telefono', label: 'Teléfono', tipo: 'tel', placeholder: '+56 9 1234 5678' },
  { id: 'email', label: 'Email', tipo: 'email' },
  { id: 'direccion', label: 'Dirección' },
  { id: 'notas', label: 'Notas', tipo: 'area', placeholder: 'Días de entrega, pedido mínimo, condiciones de pago…' },
  { id: 'activo', label: 'Activo', tipo: 'interruptor' },
]
const CAMPOS_CUENTA = [
  { id: 'banco', label: 'Banco', requerido: true, lista: 'bancos', placeholder: 'Elige o escribe' },
  { id: 'tipoCuenta', label: 'Tipo de cuenta', requerido: true, tipo: 'chips', opciones: TIPOS_CUENTA },
  { id: 'numero', label: 'Número de cuenta', requerido: true, inputMode: 'numeric' },
  { id: 'titular', label: 'Titular', requerido: true, placeholder: 'Nombre o razón social' },
  { id: 'rutTitular', label: 'RUT del titular', rut: true },
  { id: 'email', label: 'Email para el aviso de transferencia', tipo: 'email' },
  { id: 'principal', label: 'Cuenta principal', tipo: 'interruptor' },
]

// '' → null en los opcionales (para poder borrarlos al editar)
const limpiar = (form) => Object.fromEntries(Object.entries(form).map(([k, v]) => [k, typeof v === 'string' ? (v.trim() || null) : v]))

export default function Proveedores() {
  const { puede, hoy, recargarConfig } = useDatos()
  const gestiona = puede('proveedores.gestionar')
  const [proveedores, setProveedores] = useState(null)
  const [busqueda, setBusqueda] = useState('')
  const [modal, setModal] = useState(null) // { tipo: 'proveedor'|'cuenta', proveedor?, cuenta? }
  const [aviso, setAviso] = useState('')
  const [error, setError] = useState('')

  const cargar = useCallback(() => api('/proveedores').then(setProveedores).catch((e) => setError(e.message)), [])
  useEffect(() => { cargar() }, [cargar])

  const mostrar = (t) => { setAviso(t); setTimeout(() => setAviso(''), 1800) }
  const reemplazar = (p) => setProveedores((l) => (l.some((x) => x.id === p.id) ? l.map((x) => (x.id === p.id ? p : x)) : [...l, p]))

  const filtrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase()
    if (!proveedores) return []
    if (!q) return proveedores
    return proveedores.filter((p) => [p.nombre, p.rut, p.contacto, p.email, ...p.cuentas.flatMap((c) => [c.banco, c.titular, c.numero])]
      .some((v) => v?.toLowerCase().includes(q)))
  }, [proveedores, busqueda])

  const guardarProveedor = async (form) => {
    const existe = modal.proveedor
    const cuerpo = limpiar(form)
    const p = await api(existe ? `/proveedores/${existe.id}` : '/proveedores', { metodo: existe ? 'PATCH' : 'POST', body: cuerpo })
    reemplazar(p)
    recargarConfig() // la lista de proveedores del formulario de compras
    mostrar('Proveedor guardado')
  }

  const guardarCuenta = async (form) => {
    const { proveedor, cuenta } = modal
    const ruta = `/proveedores/${proveedor.id}/cuentas${cuenta ? `/${cuenta.id}` : ''}`
    reemplazar(await api(ruta, { metodo: cuenta ? 'PATCH' : 'POST', body: limpiar(form) }))
    mostrar('Cuenta guardada')
  }

  const eliminarCuenta = async (p, c) => {
    if (!confirm(`¿Eliminar la cuenta ${c.banco} ${c.numero}?`)) return
    try {
      reemplazar(await api(`/proveedores/${p.id}/cuentas/${c.id}`, { metodo: 'DELETE' }))
      mostrar('Cuenta eliminada')
    } catch (e) {
      setError(e.message)
    }
  }

  const copiado = (que) => mostrar(`Copiado: ${que}`)

  return (
    <>
      <div className="page-head">
        <div>
          <h1 className="serif">Proveedores</h1>
          <p>Contactos y cuentas para transferir. Toca un dato para copiarlo.</p>
        </div>
        {gestiona && (
          <div className="acciones-head">
            <button className="btn btn-primary" onClick={() => setModal({ tipo: 'proveedor' })}><Plus size={18} /> Nuevo proveedor</button>
          </div>
        )}
      </div>

      <div className="toolbar">
        <label className="search">
          <Search size={18} />
          <input placeholder="Buscar por nombre, RUT, banco o número de cuenta" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
        </label>
      </div>

      {error && <div className="alerta-error" role="alert" style={{ marginBottom: 16 }}>{error}</div>}

      {!proveedores ? <div className="vacio">Cargando…</div> : !filtrados.length ? (
        <div className="card vacio">
          <Truck size={28} />
          <p>{busqueda ? 'No hay proveedores que coincidan.' : 'Todavía no hay proveedores. También se agregan solos al registrar una compra.'}</p>
        </div>
      ) : (
        <div className="grid grid-proveedores">
          {filtrados.map((p) => (
            <div key={p.id} className={`card proveedor ${p.activo ? '' : 'inactivo'}`}>
              <div className="proveedor-head">
                <div>
                  <h2>{p.nombre} {!p.activo && <span className="badge">Inactivo</span>}</h2>
                  {p.contacto && <div className="sub">{p.contacto}</div>}
                </div>
                {gestiona && <button className="icon-btn" onClick={() => setModal({ tipo: 'proveedor', proveedor: p })} aria-label={`Editar ${p.nombre}`} title="Editar"><Pencil size={16} /></button>}
              </div>

              <div className="proveedor-datos">
                <Dato etiqueta="RUT" valor={p.rut} onCopiado={copiado} />
                <Dato etiqueta="Teléfono" valor={p.telefono} href={p.telefono ? `tel:${soloDigitos(p.telefono)}` : undefined} onCopiado={copiado} />
                <Dato etiqueta="Email" valor={p.email} href={p.email ? `mailto:${p.email}` : undefined} onCopiado={copiado} />
                <Dato etiqueta="Dirección" valor={p.direccion} onCopiado={copiado} />
              </div>

              {(p.telefono || p.email) && (
                <div className="proveedor-contacto">
                  {p.telefono && <a className="btn btn-ghost btn-sm" href={`tel:${soloDigitos(p.telefono)}`}><Phone size={15} /> Llamar</a>}
                  {p.telefono && <a className="btn btn-ghost btn-sm" href={`https://wa.me/${whatsapp(p.telefono)}`} target="_blank" rel="noreferrer"><MessageCircle size={15} /> WhatsApp</a>}
                  {p.email && <a className="btn btn-ghost btn-sm" href={`mailto:${p.email}`}><Mail size={15} /> Email</a>}
                </div>
              )}

              {p.notas && <p className="proveedor-notas">{p.notas}</p>}

              {p.cuentas.map((c) => (
                <Cuenta key={c.id} c={c} gestiona={gestiona} onCopiado={copiado}
                  onEditar={() => setModal({ tipo: 'cuenta', proveedor: p, cuenta: c })}
                  onEliminar={() => eliminarCuenta(p, c)} />
              ))}
              {gestiona && (
                <button className="btn btn-registrar btn-sm" onClick={() => setModal({ tipo: 'cuenta', proveedor: p })}>
                  <Plus size={15} /> {p.cuentas.length ? 'Otra cuenta' : 'Agregar cuenta bancaria'}
                </button>
              )}

              <div className="proveedor-pie sub">
                {p.ultimaCompra ? `Última compra: ${etiquetaDia(p.ultimaCompra, hoy)} · ${dinero(p.comprado90d)} en 90 días` : 'Sin compras registradas'}
              </div>
            </div>
          ))}
        </div>
      )}

      {modal?.tipo === 'proveedor' && (
        <Formulario titulo={modal.proveedor ? 'Editar proveedor' : 'Nuevo proveedor'} campos={CAMPOS_PROVEEDOR}
          inicial={modal.proveedor ?? { activo: true }} onGuardar={guardarProveedor} onClose={() => setModal(null)} />
      )}
      {modal?.tipo === 'cuenta' && (
        <Formulario titulo={`${modal.cuenta ? 'Editar' : 'Nueva'} cuenta · ${modal.proveedor.nombre}`} campos={CAMPOS_CUENTA}
          inicial={modal.cuenta ?? { tipoCuenta: 'corriente', titular: modal.proveedor.nombre, rutTitular: modal.proveedor.rut ?? '', email: modal.proveedor.email ?? '', principal: !modal.proveedor.cuentas.length }}
          onGuardar={guardarCuenta} onClose={() => setModal(null)} />
      )}
      {aviso && <div className="toast"><Check size={18} color="#7fd1a8" />{aviso}</div>}
    </>
  )
}
