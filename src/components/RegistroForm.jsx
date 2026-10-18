import { useState } from 'react'
import { Check } from 'lucide-react'
import { useDatos } from '../context/DataContext'
import { TIPOS, categoriasDe } from '../lib/tipos'
import { dinero, isoLocal } from '../lib/format'
import { num, totalItems } from '../lib/items'
import { Catalogo, Ticket, sumarAlTicket } from './Items'
import SelectorCliente from './SelectorCliente'

function Chips({ opciones, valor, onChange, etiqueta }) {
  return (
    <div className="chips">
      {opciones.map((o) => (
        <button type="button" key={o} className={`chip ${valor === o ? 'on' : ''}`} onClick={() => onChange(o)}>{o}{etiqueta?.(o)}</button>
      ))}
    </div>
  )
}

const ahora = () => {
  const d = new Date()
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

export default function RegistroForm({ tipo, onDone }) {
  const { agregar, hoy, catalogo, listas, config, puede } = useDatos()
  const t = TIPOS[tipo]
  const categorias = categoriasDe(tipo, listas)
  const metodoInicial = tipo === 'egresos' ? 'Transferencia' : 'Efectivo'

  const [items, setItems] = useState([])
  const [categoria, setCategoria] = useState(categorias[0])
  const [metodo, setMetodo] = useState(listas.metodosPago.includes(metodoInicial) ? metodoInicial : listas.metodosPago[0])
  const [fecha, setFecha] = useState(isoLocal(hoy))
  const [proveedor, setProveedor] = useState('')
  const [motivo, setMotivo] = useState(listas.motivosMerma[0])
  const [cliente, setCliente] = useState(null)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')
  // Egresos sin ítems (sueldos, arriendo...)
  const [monto, setMonto] = useState('')
  const [descripcion, setDescripcion] = useState('')

  const conItems = tipo !== 'egresos' || listas.egresosConItems.includes(categoria)
  // Ventas: descuento según el medio de pago (el servidor lo vuelve a calcular al guardar)
  const pctDe = (nombre) => (tipo === 'ingresos' ? config.metodosPago.find((m) => m.nombre === nombre)?.descuentoPct ?? 0 : 0)
  const descuentoPct = pctDe(metodo)
  const subtotalVenta = conItems ? totalItems(items) : parseInt(monto) || 0
  const descuento = Math.round((subtotalVenta * descuentoPct) / 100)
  const total = subtotalVenta - descuento
  // La merma la valoriza el servidor (quien no ve costos ve $0): basta con tener ítems
  const valido = !guardando && (tipo === 'mermas' ? items.some((i) => num(i.cantidad) > 0) : total > 0)

  const guardar = async (e) => {
    e.preventDefault()
    if (!valido) return
    const lineas = items
      .map((i) => ({ ...i, cantidad: num(i.cantidad), precio: num(i.precio) }))
      .filter((i) => i.cantidad > 0)
      .map((i) => {
        if (i.tipo !== 'promo') return i
        // Si se cambió el precio de la promo, se reparte de nuevo entre sus productos
        const base = i.componentes.reduce((t, c) => t + c.precio * c.cantidad, 0)
        const factor = base ? i.precio / base : 0
        return { ...i, componentes: i.componentes.map((c) => ({ ...c, precio: Math.round(c.precio * factor) })) }
      })
    setGuardando(true)
    setError('')
    try {
      let venta
      if (tipo === 'ingresos') venta = await agregar('ingresos', { fecha, hora: ahora(), categoria, metodo, cliente, items: lineas, monto: total })
      else if (tipo === 'mermas') await agregar('mermas', { fecha, motivo, items: lineas, monto: total })
      else if (conItems) await agregar('egresos', { fecha, categoria, descripcion: proveedor.trim() || 'Compra de insumos', proveedor: proveedor.trim(), metodo, items: lineas, monto: total })
      else await agregar('egresos', { fecha, categoria, descripcion: descripcion.trim() || categoria, metodo, monto: total })
      onDone(venta)
    } catch (err) {
      setError(err.message)
      setGuardando(false)
    }
  }

  // Registrar con otra fecha requiere permiso; sin él (Vendedor, Producción) siempre es hoy
  const campoFecha = puede('movimientos.fecha_anterior') && (
    <div className="campo">
      <label htmlFor="fecha">Fecha</label>
      <input id="fecha" type="date" className="input" value={fecha} max={isoLocal(hoy)} onChange={(e) => setFecha(e.target.value)} />
    </div>
  )
  const textoGuardar = guardando ? 'Guardando…' : tipo === 'ingresos' ? 'Finalizar venta' : `Guardar ${t.singular.toLowerCase()}`
  const avisoError = error && <div className="alerta-error" role="alert">{error}</div>
  const botonGuardar = (
    <button className="btn btn-color btn-guardar" style={{ background: t.color, opacity: valido ? 1 : 0.45 }} disabled={!valido}>
      <Check size={18} /> {textoGuardar}{valido && total > 0 ? ` · ${dinero(total)}` : ''}
    </button>
  )

  const catalogos = {
    ingresos: [
      { id: 'producto', label: 'Productos', items: catalogo.productos, frecuentes: catalogo.frecuentes.venta, tituloFrecuentes: 'Más vendidos' },
      { id: 'promo', label: 'Promos', items: catalogo.promos, frecuentes: catalogo.frecuentes.promos, tituloFrecuentes: 'Promos activas' },
    ],
    egresos: [{ id: 'insumo', label: 'Insumos', items: catalogo.insumos, frecuentes: catalogo.frecuentes.compra, tituloFrecuentes: 'Más comprados' }],
    mermas: [
      { id: 'producto', label: 'Productos', items: catalogo.productosCosto, frecuentes: catalogo.frecuentes.mermaProducto, tituloFrecuentes: 'Lo que más se pierde' },
      { id: 'insumo', label: 'Insumos', items: catalogo.insumos, frecuentes: catalogo.frecuentes.mermaInsumo, tituloFrecuentes: 'Lo que más se pierde' },
    ],
  }[tipo]

  return (
    <form className="form" onSubmit={guardar}>
      {tipo === 'egresos' && (
        <div className="campo"><label>Categoría</label><Chips opciones={categorias} valor={categoria} onChange={setCategoria} /></div>
      )}

      {conItems ? (
        <div className="pos">
          <Catalogo catalogos={catalogos} items={items} pedirPeso={tipo === 'ingresos'} onAgregar={(p, cantidad) => setItems((it) => sumarAlTicket(it, p, cantidad))} />

          <div className="pos-ticket">
            <div className="catalogo-head">
              <span>{tipo === 'ingresos' ? 'Venta' : tipo === 'mermas' ? 'Lo que se perdió' : 'Compra'}</span>
              {items.length > 0 && <button type="button" className="link" style={{ border: 0, background: 'none', padding: 0 }} onClick={() => setItems([])}>Vaciar</button>}
            </div>
            <Ticket
              items={items} onChange={setItems} precioEditable={tipo === 'egresos' || (tipo === 'ingresos' && puede('ventas.modificar_precio'))}
              etiquetaPrecio={tipo === 'mermas' ? 'costo c/u' : 'c/u'}
              vacio={tipo === 'ingresos' ? 'Toca un producto o escribe su código para agregarlo' : 'Agrega lo que corresponda tocando o escribiendo el código'}
            />
            {descuento > 0 && (
              <div className="desglose-total">
                <div><span>Subtotal</span><span>{dinero(subtotalVenta)}</span></div>
                <div className="descuento"><span>Descuento {metodo} ({descuentoPct}%)</span><span>−{dinero(descuento)}</span></div>
              </div>
            )}
            <div className="total-ticket" style={{ background: t.suave }}>
              <span>{tipo === 'mermas' ? 'Pérdida total' : 'Total'}</span>
              <strong>{dinero(total)}</strong>
            </div>

            {tipo === 'ingresos' && (
              <>
                {puede('clientes.ver') && <div className="campo"><label>Cliente</label><SelectorCliente valor={cliente} onChange={setCliente} /></div>}
                <div className="campo"><label>Canal</label><Chips opciones={categorias} valor={categoria} onChange={setCategoria} /></div>
                <div className="campo">
                  <label>Medio de pago</label>
                  <Chips opciones={listas.metodosPago} valor={metodo} onChange={setMetodo}
                    etiqueta={(m) => pctDe(m) > 0 && <span className="chip-descuento">−{pctDe(m)}%</span>} />
                </div>
              </>
            )}
            {tipo === 'egresos' && (
              <>
                <div className="campo">
                  <label htmlFor="proveedor">Proveedor</label>
                  <input id="proveedor" className="input" list="proveedores" placeholder="Ej: Molinera del Sur" value={proveedor} onChange={(e) => setProveedor(e.target.value)} />
                  <datalist id="proveedores">{listas.proveedores.map((p) => <option key={p} value={p} />)}</datalist>
                </div>
                <div className="campo"><label>Medio de pago</label><Chips opciones={listas.metodosPago} valor={metodo} onChange={setMetodo} /></div>
              </>
            )}
            {tipo === 'mermas' && (
              <div className="campo"><label>Motivo</label><Chips opciones={listas.motivosMerma} valor={motivo} onChange={setMotivo} /></div>
            )}
            {campoFecha}
            {avisoError}
            {botonGuardar}
          </div>
        </div>
      ) : (
        <>
          <div className="campo">
            <label htmlFor="monto">Monto</label>
            <div className="monto-input">
              <span>$</span>
              <input id="monto" inputMode="numeric" placeholder="0" autoFocus
                value={monto ? Number(monto).toLocaleString('es-CL') : ''}
                onChange={(e) => setMonto(e.target.value.replace(/\D/g, ''))} />
            </div>
          </div>
          <div className="campo">
            <label htmlFor="desc">Detalle <span style={{ fontWeight: 400 }}>(opcional)</span></label>
            <input id="desc" className="input" placeholder="Ej: Sueldo vendedora" value={descripcion} onChange={(e) => setDescripcion(e.target.value)} />
          </div>
          <div className="campo"><label>Medio de pago</label><Chips opciones={listas.metodosPago} valor={metodo} onChange={setMetodo} /></div>
          {campoFecha}
          {avisoError}
          {botonGuardar}
        </>
      )}

      {/* Celular: total y guardar siempre visibles abajo */}
      {conItems && (
        <div className="barra-guardar">
          <div>
            <span>{items.length} {items.length === 1 ? 'ítem' : 'ítems'}</span>
            <strong>{dinero(total)}</strong>
          </div>
          <button className="btn btn-color" style={{ background: t.color, opacity: valido ? 1 : 0.45 }} disabled={!valido}>
            <Check size={18} /> {tipo === 'ingresos' ? textoGuardar : 'Guardar'}
          </button>
        </div>
      )}
    </form>
  )
}
