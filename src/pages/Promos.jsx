import { useMemo, useState } from 'react'
import { Plus, Pencil, Trash2, Tag } from 'lucide-react'
import { useDatos, rango, enRango } from '../context/DataContext'
import Modal from '../components/Modal'
import BotonPDF from '../components/BotonPDF'
import { Catalogo, Ticket, sumarAlTicket } from '../components/Items'
import { statsPromos } from '../lib/stats'
import { dinero, porcentaje } from '../lib/format'
import { fmtNum, num, precioNormal, totalItems } from '../lib/items'

function Interruptor({ activo, onChange, etiqueta }) {
  return (
    <button type="button" role="switch" aria-checked={activo} aria-label={etiqueta} className={`switch ${activo ? 'on' : ''}`} onClick={() => onChange(!activo)}>
      <span />
    </button>
  )
}

function PromoForm({ promo, onClose }) {
  const { promos, guardarPromo, catalogo, productos, insumos } = useDatos()
  const siguienteCodigo = Math.max(900, ...promos.map((p) => p.codigo)) + 1
  const [nombre, setNombre] = useState(promo?.nombre ?? '')
  const [codigo, setCodigo] = useState(String(promo?.codigo ?? siguienteCodigo))
  const [precio, setPrecio] = useState(promo ? String(promo.precio) : '')
  const [activa, setActiva] = useState(promo?.activa ?? true)
  const [intentado, setIntentado] = useState(false) // se marcan los errores al intentar guardar
  const [items, setItems] = useState(() =>
    (promo?.productos ?? []).map((c) => {
      const p = productos.find((x) => x.id === c.id)
      return { tipo: 'producto', id: p.id, codigo: p.codigo, nombre: p.nombre, unidad: p.unidad, cantidad: c.cantidad, precio: p.precio }
    }),
  )

  const normal = totalItems(items)
  const precioNum = parseInt(precio) || 0
  const codigoUsado = [...productos, ...insumos, ...promos.filter((p) => p.id !== promo?.id)].some((p) => String(p.codigo) === codigo)
  const falta = {
    nombre: !nombre.trim() && 'Falta el nombre',
    codigo: (!codigo && 'Falta el código') || (codigoUsado && `El código ${codigo} ya está en uso`),
    items: !items.length && 'Agrega al menos un producto',
    precio: !precioNum && 'Falta el precio de la promo',
  }
  const errores = Object.values(falta).filter(Boolean)
  // El código repetido se avisa apenas se escribe; el resto, al intentar guardar
  const ver = (campo) => (campo === 'codigo' && codigoUsado) || intentado ? falta[campo] : null

  const guardar = (e) => {
    e.preventDefault()
    if (errores.length) {
      setIntentado(true)
      return
    }
    guardarPromo({
      id: promo?.id ?? `promo-${Date.now()}`,
      codigo: parseInt(codigo) || siguienteCodigo,
      nombre: nombre.trim(),
      productos: items.map((i) => ({ id: i.id, cantidad: num(i.cantidad) })),
      precio: precioNum,
      activa,
    })
    onClose()
  }

  return (
    <Modal titulo={promo ? 'Editar promo' : 'Nueva promo'} onClose={onClose}>
      <form className="form" onSubmit={guardar}>
        <div className="fila" style={{ gridTemplateColumns: '2fr 1fr' }}>
          <div className={`campo ${ver('nombre') ? 'campo-error' : ''}`}>
            <label htmlFor="promo-nombre">Nombre</label>
            <input id="promo-nombre" className="input" placeholder="Ej: Café + 2 medialunas" value={nombre} onChange={(e) => setNombre(e.target.value)} />
            {ver('nombre') && <div className="texto-error">{ver('nombre')}</div>}
          </div>
          <div className={`campo ${ver('codigo') ? 'campo-error' : ''}`}>
            <label htmlFor="promo-codigo">Código</label>
            <input id="promo-codigo" className="input" inputMode="numeric" value={codigo} onChange={(e) => setCodigo(e.target.value.replace(/\D/g, ''))} />
            {ver('codigo') && <div className="texto-error">{ver('codigo')}</div>}
          </div>
        </div>

        <div className="pos">
          <Catalogo
            catalogos={[{ id: 'producto', label: 'Productos', items: catalogo.productos, frecuentes: catalogo.frecuentes.venta, tituloFrecuentes: 'Más vendidos' }]}
            items={items} onAgregar={(p) => setItems((it) => sumarAlTicket(it, p))}
          />
          <div className="pos-ticket">
            <div className="catalogo-head"><span>Incluye</span></div>
            <Ticket items={items} onChange={setItems} vacio="Toca los productos que incluye la promo" error={!!ver('items')} />

            <div className="resumen-promo">
              <div><span>Precio normal</span><strong>{dinero(normal)}</strong></div>
              <div><span>Descuento</span><strong style={{ color: 'var(--ingreso)' }}>{normal && precioNum ? porcentaje(((normal - precioNum) / normal) * 100, 0) : '—'}</strong></div>
            </div>
            <div className={`campo ${ver('precio') ? 'campo-error' : ''}`}>
              <label htmlFor="promo-precio">Precio de la promo</label>
              <div className="monto-input">
                <span>$</span>
                <input id="promo-precio" inputMode="numeric" placeholder="0" value={precio ? Number(precio).toLocaleString('es-CL') : ''} onChange={(e) => setPrecio(e.target.value.replace(/\D/g, ''))} />
              </div>
            </div>
            <label className="fila-switch">
              <Interruptor activo={activa} onChange={setActiva} etiqueta="Promo activa" />
              <span>{activa ? 'Activa: aparece al registrar ventas' : 'Pausada: no aparece al vender'}</span>
            </label>
            {intentado && errores.length > 0 && (
              <div className="alerta-error" role="alert">
                Para guardar falta:
                <ul>{errores.map((e) => <li key={e}>{e}</li>)}</ul>
              </div>
            )}
            <button className="btn btn-primary btn-guardar">
              Guardar promo
            </button>
          </div>
        </div>
      </form>
    </Modal>
  )
}

export default function Promos() {
  const { promos, ingresos, guardarPromo, eliminarPromo, productos } = useDatos()
  const [editando, setEditando] = useState(null) // null | 'nueva' | promo

  const ventas = useMemo(() => {
    const r = rango('30d')
    return statsPromos(enRango(ingresos, r.desde, r.hasta))
  }, [ingresos])

  const borrar = (p) => {
    if (confirm(`¿Eliminar la promo "${p.nombre}"? Las ventas ya registradas se mantienen.`)) eliminarPromo(p.id)
  }

  const ordenadas = [...promos].sort((a, b) => (a.activa === b.activa ? a.codigo - b.codigo : a.activa ? -1 : 1))

  return (
    <>
      <div className="page-head">
        <div>
          <h1 className="serif">Promos</h1>
          <p>Combos de productos a un precio especial. Se cobran desde la venta con su código.</p>
        </div>
        <div className="acciones-head">
          <BotonPDF tipo="promos" periodo="30d" />
          <button className="btn btn-primary" onClick={() => setEditando('nueva')}><Plus size={18} /> Nueva promo</button>
        </div>
      </div>

      <div className="promos">
        {ordenadas.map((p) => {
          const normal = precioNormal(p, productos)
          const v = ventas[p.id]
          return (
            <div key={p.id} className={`card promo ${p.activa ? '' : 'pausada'}`}>
              <div className="promo-top">
                <span className="tile-codigo">#{p.codigo}</span>
                <span className={`estado ${p.activa ? 'on' : ''}`}>{p.activa ? 'Activa' : 'Pausada'}</span>
                <Interruptor activo={p.activa} onChange={(activa) => guardarPromo({ ...p, activa })} etiqueta={`Activar ${p.nombre}`} />
              </div>
              <h2 className="serif">{p.nombre}</h2>
              <ul className="promo-items">
                {p.productos.map((c) => {
                  const prod = productos.find((x) => x.id === c.id)
                  return <li key={c.id}><b>{prod.unidad === 'un' ? `${fmtNum(c.cantidad)}×` : `${fmtNum(c.cantidad)} ${prod.unidad}`}</b> {prod.nombre}</li>
                })}
              </ul>
              <div className="promo-precio">
                <s>{dinero(normal)}</s>
                <strong>{dinero(p.precio)}</strong>
                {normal > p.precio && <span className="delta bien">−{porcentaje(((normal - p.precio) / normal) * 100, 0)}</span>}
              </div>
              <div className="promo-stats">
                <Tag size={14} /> {v ? `${fmtNum(v.vendidas)} vendidas en 30 días · ${dinero(v.ingresos)}` : 'Sin ventas en 30 días'}
              </div>
              <div className="promo-acciones">
                <button className="btn btn-ghost" onClick={() => setEditando(p)}><Pencil size={15} /> Editar</button>
                <button className="btn btn-ghost" onClick={() => borrar(p)}><Trash2 size={15} /> Eliminar</button>
              </div>
            </div>
          )
        })}
        <button className="card promo promo-nueva" onClick={() => setEditando('nueva')}>
          <Plus size={28} />
          <span>Crear promo</span>
        </button>
      </div>

      {editando && <PromoForm promo={editando === 'nueva' ? null : editando} onClose={() => setEditando(null)} />}
    </>
  )
}
