import { useEffect, useMemo, useRef, useState } from 'react'
import { Hash, Minus, Plus, X, CornerDownLeft, Scale, Check } from 'lucide-react'
import { dinero } from '../lib/format'
import ImagenProducto from './ImagenProducto'
import { claveItem, fmtNum, num, pasoDe, subtotal, resumenItems } from '../lib/items'

// Con teclado físico se vuelve al buscador; en pantallas táctiles no, para no abrir el teclado
const conTeclado = () => typeof window !== 'undefined' && window.matchMedia('(pointer: fine)').matches

// Acepta "0,73" (kg) o "730" (gramos: cualquier número mayor a 20 se toma como gramos)
const interpretarPeso = (texto) => {
  const n = num(texto)
  return n > 20 ? n / 1000 : n
}

// Panel para productos por peso: se escribe el peso o el monto y se calcula lo otro
function Pesaje({ producto, onAgregar, onCancelar }) {
  const [peso, setPeso] = useState('')
  const [monto, setMonto] = useState('')
  const [desdeMonto, setDesdeMonto] = useState(false)

  const kg = desdeMonto ? num(monto) / producto.precio : interpretarPeso(peso)
  const total = Math.round(kg * producto.precio)

  const cambiarPeso = (v) => {
    setDesdeMonto(false)
    setPeso(v.replace(/[^\d,.]/g, ''))
    const k = interpretarPeso(v)
    setMonto(k ? String(Math.round(k * producto.precio)) : '')
  }
  const cambiarMonto = (v) => {
    const limpio = v.replace(/\D/g, '')
    setDesdeMonto(true)
    setMonto(limpio)
    setPeso(limpio ? fmtNum(num(limpio) / producto.precio) : '')
  }
  const agregar = () => kg > 0 && onAgregar(producto, kg)
  const teclas = (e) => {
    if (e.key === 'Enter') { e.preventDefault(); agregar() }
    if (e.key === 'Escape') { e.stopPropagation(); onCancelar() }
  }

  return (
    <div className="pesaje" onKeyDown={teclas}>
      <div className="pesaje-head">
        <div className="pesaje-icono"><Scale size={20} /></div>
        <div style={{ flex: 1 }}>
          <strong>{producto.nombre}</strong>
          <span>{dinero(producto.precio)} por kg · #{producto.codigo}</span>
        </div>
        <button type="button" className="icon-btn" onClick={onCancelar} aria-label="Cancelar"><X size={18} /></button>
      </div>

      <div className="fila">
        <div className="campo">
          <label htmlFor="peso">Peso</label>
          <div className="input-unidad">
            <input id="peso" inputMode="decimal" placeholder="0,000" autoFocus={conTeclado()} value={peso} onChange={(e) => cambiarPeso(e.target.value)} />
            <span>kg</span>
          </div>
        </div>
        <div className="campo">
          <label htmlFor="monto-peso">o el monto</label>
          <div className="input-unidad">
            <span>$</span>
            <input id="monto-peso" inputMode="numeric" placeholder="0" value={monto ? Number(monto).toLocaleString('es-CL') : ''} onChange={(e) => cambiarMonto(e.target.value)} />
          </div>
        </div>
      </div>
      <div className="sub">Puedes escribir gramos: 730 = 0,730 kg</div>

      <div className="chips chips-sm">
        {[0.25, 0.5, 0.75, 1].map((k) => (
          <button type="button" key={k} className="chip" onClick={() => cambiarPeso(String(k))}>{k < 1 ? `${k * 1000} g` : '1 kg'}</button>
        ))}
      </div>

      <div className="pesaje-total">
        <span>{kg > 0 ? `${fmtNum(kg)} kg × ${dinero(producto.precio)}` : 'Ingresa el peso o el monto'}</span>
        <strong>{dinero(total)}</strong>
      </div>
      <button type="button" className="btn btn-color" style={{ background: 'var(--ingreso)', opacity: kg > 0 ? 1 : 0.45 }} disabled={!(kg > 0)} onClick={agregar}>
        <Check size={18} /> Agregar a la venta
      </button>
    </div>
  )
}

// Selector de productos/insumos/promos: código o nombre + accesos rápidos + catálogo completo.
// `catalogos`: [{ id, label, items, frecuentes, tituloFrecuentes }]
// `pedirPeso`: los productos por kg abren el panel de pesaje en vez de sumar 1 kg
export function Catalogo({ catalogos, items, onAgregar, pedirPeso }) {
  const [actual, setActual] = useState(0)
  const [texto, setTexto] = useState('')
  const [verTodos, setVerTodos] = useState(false)
  const [categoria, setCategoria] = useState('Todas')
  const [aviso, setAviso] = useState(null)
  const [pesando, setPesando] = useState(null)
  const inputRef = useRef(null)
  const cat = catalogos[actual]

  const enTicket = useMemo(() => {
    const m = {}
    for (const i of items) m[claveItem(i)] = (m[claveItem(i)] ?? 0) + num(i.cantidad)
    return m
  }, [items])
  const todos = catalogos.flatMap((c) => c.items)

  const q = texto.trim().toLowerCase()
  const resultados = q
    ? todos.filter((p) => String(p.codigo).startsWith(q) || p.nombre.toLowerCase().includes(q))
    : verTodos
      ? cat.items.filter((p) => categoria === 'Todas' || p.categoria === categoria)
      : cat.frecuentes.map((id) => cat.items.find((p) => p.id === id)).filter(Boolean)

  const confirmar = (p, cantidad) => {
    onAgregar(p, cantidad)
    setPesando(null)
    setAviso(`+ ${p.nombre}`)
    setTimeout(() => setAviso(null), 1200)
    if (conTeclado()) inputRef.current?.focus()
  }

  const agregar = (p) => {
    setTexto('')
    if (pedirPeso && p.tipo === 'producto' && p.unidad === 'kg') setPesando(p)
    else confirmar(p)
  }

  const onEnter = (e) => {
    if (e.key !== 'Enter') return
    e.preventDefault()
    const exacto = todos.find((p) => String(p.codigo) === q)
    if (exacto) agregar(exacto)
    else if (q && resultados.length === 1) agregar(resultados[0])
    else if (q) setAviso(resultados.length ? 'Hay varios, toca el que quieres' : 'No existe ese código')
  }

  const categorias = ['Todas', ...new Set(cat.items.map((p) => p.categoria))]
  const tieneFrecuentes = cat.frecuentes.length < cat.items.length

  return (
    <div className="catalogo">
      <div className="codigo-input">
        <Hash size={18} />
        <input
          ref={inputRef} autoFocus={conTeclado()} value={texto} onChange={(e) => setTexto(e.target.value)} onKeyDown={onEnter}
          placeholder="Código o nombre" aria-label="Código o nombre del producto"
        />
        {aviso ? <span className="codigo-aviso">{aviso}</span> : <span className="codigo-hint"><CornerDownLeft size={14} /> Enter</span>}
      </div>

      {pesando ? (
        <Pesaje key={pesando.id} producto={pesando} onAgregar={confirmar} onCancelar={() => setPesando(null)} />
      ) : (
        <>
          {!q && catalogos.length > 1 && (
            <div className="segmented" style={{ width: '100%' }}>
              {catalogos.map((c, i) => (
                <button type="button" key={c.id} style={{ flex: 1 }} className={i === actual ? 'on' : ''} onClick={() => { setActual(i); setCategoria('Todas'); setVerTodos(false) }}>
                  {c.label}{c.id === 'promo' && c.items.length ? ` (${c.items.length})` : ''}
                </button>
              ))}
            </div>
          )}

          <div className="catalogo-head">
            <span>{q ? `Resultados (${resultados.length})` : verTodos ? `Todos (${cat.items.length})` : cat.tituloFrecuentes}</span>
            {!q && tieneFrecuentes && (
              <button type="button" className="link" style={{ border: 0, background: 'none', padding: 0 }} onClick={() => setVerTodos((v) => !v)}>
                {verTodos ? 'Ver solo frecuentes' : 'Ver todos'}
              </button>
            )}
          </div>

          {!q && verTodos && categorias.length > 2 && (
            <div className="chips chips-sm">
              {categorias.map((c) => <button type="button" key={c} className={`chip ${categoria === c ? 'on' : ''}`} onClick={() => setCategoria(c)}>{c}</button>)}
            </div>
          )}

          <div className="tiles">
            {resultados.map((p) => {
              const n = enTicket[claveItem(p)]
              const esPromo = p.tipo === 'promo'
              const conImagen = p.tipo !== 'insumo'
              return (
                <button type="button" key={claveItem(p)} className={`tile ${n ? 'en-ticket' : ''} ${esPromo ? 'tile-promo' : ''} ${conImagen ? 'con-imagen' : ''}`} title={p.nombre} onClick={() => agregar(p)}>
                  {conImagen && <ImagenProducto producto={p} tamano={null} className="tile-imagen" />}
                  <span className="tile-codigo">#{p.codigo}</span>
                  {n ? <span className="tile-badge">{fmtNum(n)}</span> : null}
                  <span className="tile-nombre">{p.nombre}</span>
                  {esPromo && <span className="tile-detalle">{resumenItems(p.componentes)}</span>}
                  <span className="tile-precio">
                    {esPromo && <s>{dinero(p.precioNormal)}</s>} {dinero(p.precio)}{p.unidad !== 'un' ? ` / ${p.unidad}` : ''}
                    {p.unidad === 'kg' && pedirPeso && <Scale size={12} className="tile-peso" />}
                  </span>
                </button>
              )
            })}
            {resultados.length === 0 && (
              <div className="vacio" style={{ gridColumn: '1 / -1', padding: 20 }}>{cat.id === 'promo' && !q ? 'No hay promos activas' : 'Sin resultados'}</div>
            )}
          </div>
        </>
      )}
    </div>
  )
}

// Líneas del ticket con cantidad (y precio) editable
export function Ticket({ items, onChange, precioEditable, etiquetaPrecio = 'c/u', vacio, error }) {
  // Al agregar una línea nueva, la lista baja para mostrarla
  const listaRef = useRef(null)
  const cantidadLineas = useRef(items.length)
  useEffect(() => {
    if (items.length > cantidadLineas.current && listaRef.current) listaRef.current.scrollTop = listaRef.current.scrollHeight
    cantidadLineas.current = items.length
  }, [items.length])

  const set = (k, cambios) => onChange(items.map((i) => (claveItem(i) === k ? { ...i, ...cambios } : i)))
  const quitar = (k) => onChange(items.filter((i) => claveItem(i) !== k))
  const mover = (i, signo) => {
    const nueva = Math.round((num(i.cantidad) + signo * pasoDe(i.unidad)) * 1000) / 1000
    if (nueva <= 0) quitar(claveItem(i))
    else set(claveItem(i), { cantidad: nueva })
  }

  if (!items.length) return <div className={`ticket-vacio ${error ? 'error' : ''}`}>{vacio}</div>

  return (
    <div className="ticket" ref={listaRef}>
      {items.map((i) => {
        const k = claveItem(i)
        return (
          <div className={`linea ${i.tipo !== 'insumo' ? 'con-imagen' : ''}`} key={k}>
            {i.tipo !== 'insumo' && <ImagenProducto producto={i} tamano={36} />}
            <div className="linea-info">
              <div className="linea-nombre">
                <span className="tile-codigo">#{i.codigo}</span> {i.tipo === 'promo' && <span className="etiqueta-promo">Promo</span>} {i.nombre}
              </div>
              {i.tipo === 'promo' && <div className="linea-precio">{resumenItems(i.componentes)}</div>}
              <div className="linea-precio">
                {precioEditable ? (
                  <label className="precio-input">$<input inputMode="numeric" value={i.precio} onChange={(e) => set(k, { precio: e.target.value.replace(/\D/g, '') })} aria-label={`Precio de ${i.nombre}`} /></label>
                ) : dinero(num(i.precio))}
                {' '}{i.unidad === 'un' ? etiquetaPrecio : `/ ${i.unidad}`}
              </div>
            </div>
            <div className="stepper">
              <button type="button" onClick={() => mover(i, -1)} aria-label="Restar"><Minus size={14} /></button>
              <input
                inputMode="decimal" aria-label={`Cantidad de ${i.nombre}`}
                value={typeof i.cantidad === 'number' ? fmtNum(i.cantidad) : i.cantidad}
                onChange={(e) => set(k, { cantidad: e.target.value.replace(/[^\d,.]/g, '') })}
              />
              <button type="button" onClick={() => mover(i, 1)} aria-label="Sumar"><Plus size={14} /></button>
            </div>
            <div className="linea-total">{dinero(subtotal(i))}</div>
            <button type="button" className="icon-btn" onClick={() => quitar(k)} aria-label={`Quitar ${i.nombre}`}><X size={16} /></button>
          </div>
        )
      })}
    </div>
  )
}

// Agrega un ítem del catálogo al ticket. Si ya está, suma la cantidad
// (o una unidad/paso si no se indica cantidad, como al tocar un botón).
export function sumarAlTicket(items, p, cantidad) {
  const k = claveItem(p)
  const suma = cantidad ?? (items.some((i) => claveItem(i) === k) ? pasoDe(p.unidad) : 1)
  if (items.some((i) => claveItem(i) === k)) return items.map((i) => (claveItem(i) === k ? { ...i, cantidad: num(i.cantidad) + suma } : i))
  const nuevo = { tipo: p.tipo, id: p.id, codigo: p.codigo, nombre: p.nombre, unidad: p.unidad, cantidad: suma, precio: p.precio }
  if (p.componentes) nuevo.componentes = p.componentes
  return [...items, nuevo]
}
