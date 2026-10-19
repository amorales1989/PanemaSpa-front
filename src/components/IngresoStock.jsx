import { useState } from 'react'
import { Trash2 } from 'lucide-react'
import Modal from './Modal'
import { useDatos } from '../context/DataContext'
import { dinero, porcentaje } from '../lib/format'
import { num } from '../lib/items'
import { cantStock, llevaStock } from '../lib/stock'

const soloCantidad = (v) => v.replace('.', ',').replace(/[^\d,]/g, '').replace(/,(?=.*,)/g, '')
const soloNumeros = (v) => v.replace(/\D/g, '')
const conPuntos = (v) => (v ? Number(v).toLocaleString('es-CL') : '')

// Costo actual de referencia: en productos el costo; en insumos el último precio de compra
const costoDe = (x) => (x.tipo === 'producto' ? x.costo : x.precio)

// Ingreso de mercadería: suma stock y permite cargar el costo nuevo (si llegó con aumento)
// y trasladar ese mismo % al precio de venta del producto.
export default function IngresoStock({ tipoInicial = 'producto', onClose }) {
  const { productos, insumos, puede, ingresarStock } = useDatos()
  const verCostos = puede('productos.ver_costos')
  const ajustaPrecios = puede('precios.ajustar')
  const opciones = {
    producto: puede('productos.gestionar') ? productos.filter((p) => p.activo !== false && llevaStock(p)).map((p) => ({ ...p, tipo: 'producto' })) : [],
    insumo: puede('insumos.gestionar') ? insumos.filter((i) => i.activo !== false).map((i) => ({ ...i, tipo: 'insumo' })) : [],
  }
  const [lineas, setLineas] = useState([]) // [{ clave, tipo, id, cantidad, costo, trasladar }]
  const [motivo, setMotivo] = useState('')
  const [intentado, setIntentado] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')

  const clave = (tipo, id) => `${tipo}:${id}`
  const agregar = (valor) => {
    if (!valor) return
    const [tipo, id] = valor.split(':')
    const ref = opciones[tipo].find((x) => x.id === id)
    const costo = costoDe(ref)
    setLineas((l) => [...l, { clave: valor, tipo, id, cantidad: '', costo: costo ? String(Math.round(costo)) : '', trasladar: false }])
  }
  const cambiar = (c, cambios) => setLineas((l) => l.map((x) => (x.clave === c ? { ...x, ...cambios } : x)))

  const filas = lineas.map((l) => {
    const ref = opciones[l.tipo].find((x) => x.id === l.id)
    const cant = num(l.cantidad)
    const costoAntes = costoDe(ref) ?? 0
    const costoNuevo = l.costo === '' ? costoAntes : parseInt(l.costo) || 0
    const editaCosto = l.tipo === 'insumo' || verCostos
    const cambiaCosto = editaCosto && l.costo !== '' && costoNuevo !== Math.round(costoAntes)
    const pct = cambiaCosto && costoAntes > 0 ? ((costoNuevo - costoAntes) / costoAntes) * 100 : 0
    const puedeTrasladar = l.tipo === 'producto' && ajustaPrecios && pct !== 0
    const precioNuevo = puedeTrasladar ? Math.round(ref.precio * (1 + pct / 100)) : ref.precio
    const errorCantidad = !(cant > 0) ? 'Indica cuánto entra' : ref.unidad === 'un' && !Number.isInteger(cant) ? 'Solo unidades enteras' : ''
    return { ...l, ref, cant, costoAntes, costoNuevo, editaCosto, cambiaCosto, pct, puedeTrasladar, precioNuevo, errorCantidad }
  })
  const hayErrores = filas.some((f) => f.errorCantidad)
  const yaElegidos = new Set(lineas.map((l) => l.clave))
  const grupos = [['producto', 'Productos'], ['insumo', 'Insumos']]
    .map(([tipo, label]) => [tipo, label, opciones[tipo].filter((x) => !yaElegidos.has(clave(tipo, x.id)))])
    .filter(([, , lista]) => lista.length)
  // El selector arranca mostrando primero el tipo de la pestaña en la que se abrió
  if (tipoInicial === 'insumo') grupos.reverse()

  const guardar = async (e) => {
    e.preventDefault()
    if (!filas.length) return
    if (hayErrores) {
      setIntentado(true)
      return
    }
    setGuardando(true)
    setError('')
    try {
      await ingresarStock(filas.map((f) => ({
        tipo: f.tipo, id: f.id, cantidad: f.cant,
        ...(f.cambiaCosto && { costo: f.costoNuevo }),
        ...(f.puedeTrasladar && f.trasladar && { precio: f.precioNuevo }),
      })), motivo.trim() || undefined)
      onClose()
    } catch (err) {
      setError(err.message)
      setGuardando(false)
    }
  }

  return (
    <Modal titulo="Ingresar stock" onClose={onClose}>
      <form className="form" onSubmit={guardar}>
        {filas.map((f) => (
          <div className="ingreso-linea" key={f.clave}>
            <div className="ingreso-linea-head">
              <div style={{ minWidth: 0 }}>
                <div className="linea-nombre">{f.ref.nombre}</div>
                <div className="linea-precio">
                  #{f.ref.codigo} · hay {cantStock(f.ref.stock, f.ref.unidad)}
                  {!f.errorCantidad && <> → <b>{cantStock(f.ref.stock + f.cant, f.ref.unidad)}</b></>}
                </div>
              </div>
              <button type="button" className="icon-btn icon-peligro" aria-label={`Quitar ${f.ref.nombre}`} onClick={() => setLineas((l) => l.filter((x) => x.clave !== f.clave))}><Trash2 size={15} /></button>
            </div>
            <div className="fila">
              <div className={`campo ${intentado && f.errorCantidad ? 'campo-error' : ''}`}>
                <label htmlFor={`ing-cant-${f.clave}`}>Cantidad que entra ({f.ref.unidad})</label>
                <input id={`ing-cant-${f.clave}`} className="input" inputMode="decimal" placeholder="0" autoFocus value={f.cantidad}
                  onChange={(e) => cambiar(f.clave, { cantidad: soloCantidad(e.target.value) })} />
                {intentado && f.errorCantidad && <div className="texto-error">{f.errorCantidad}</div>}
              </div>
              {f.editaCosto && (
                <div className="campo">
                  <label htmlFor={`ing-costo-${f.clave}`}>{f.tipo === 'producto' ? 'Costo' : 'Precio de compra'} por {f.ref.unidad === 'un' ? 'unidad' : f.ref.unidad}</label>
                  <div className="input-unidad input-unidad-sm"><span>$</span>
                    <input id={`ing-costo-${f.clave}`} inputMode="numeric" placeholder="0" value={conPuntos(f.costo)}
                      onChange={(e) => cambiar(f.clave, { costo: soloNumeros(e.target.value) })} />
                  </div>
                </div>
              )}
            </div>
            {f.cambiaCosto && (
              <div className="sub">
                {f.costoAntes > 0 ? <>{f.pct > 0 ? 'Aumento' : 'Baja'} de costo: {dinero(f.costoAntes)} → <b>{dinero(f.costoNuevo)}</b> ({f.pct > 0 ? '+' : ''}{porcentaje(f.pct, 1)})</> : <>Costo nuevo: <b>{dinero(f.costoNuevo)}</b></>}
                {f.tipo === 'insumo' && '. Se actualiza el costo de los productos que lo usan.'}
              </div>
            )}
            {f.puedeTrasladar && (
              <label className="check-ingreso">
                <input type="checkbox" checked={f.trasladar} onChange={(e) => cambiar(f.clave, { trasladar: e.target.checked })} />
                <span>{f.pct > 0 ? 'Subir' : 'Bajar'} también el precio de venta {f.pct > 0 ? '+' : ''}{porcentaje(f.pct, 1)}: {dinero(f.ref.precio)} → <b>{dinero(f.precioNuevo)}</b></span>
              </label>
            )}
          </div>
        ))}

        {grupos.length > 0 ? (
          <select className="input" value="" aria-label="Agregar producto o insumo" onChange={(e) => agregar(e.target.value)}>
            <option value="">{filas.length ? '+ Agregar otro…' : 'Elige qué ingresa…'}</option>
            {grupos.map(([tipo, label, lista]) => (
              <optgroup key={tipo} label={label}>
                {lista.map((x) => <option key={x.id} value={clave(tipo, x.id)}>#{x.codigo} · {x.nombre} (hay {cantStock(x.stock, x.unidad)})</option>)}
              </optgroup>
            ))}
          </select>
        ) : !filas.length && <div className="sub">No hay productos sin receta ni insumos para ingresar.</div>}
        {opciones.producto.length < productos.length && puede('productos.gestionar') && (
          <div className="sub">Los productos con receta no aparecen: su stock son sus insumos.</div>
        )}

        <div className="campo">
          <label htmlFor="ing-motivo">Nota <span style={{ fontWeight: 400 }}>(opcional)</span></label>
          <input id="ing-motivo" className="input" maxLength={200} placeholder="Ej: pedido del proveedor, factura 123" value={motivo} onChange={(e) => setMotivo(e.target.value)} />
        </div>

        {error && <div className="alerta-error" role="alert">{error}</div>}
        <button className="btn btn-primary btn-guardar" disabled={guardando || !filas.length}>
          {guardando ? 'Guardando…' : filas.length > 1 ? `Ingresar ${filas.length} ítems` : 'Ingresar stock'}
        </button>
      </form>
    </Modal>
  )
}
