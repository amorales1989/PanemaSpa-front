import { useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import Modal from './Modal'
import FotoProducto from './FotoProducto'
import { useDatos } from '../context/DataContext'
import { dinero, porcentaje } from '../lib/format'

const UNIDADES = {
  producto: [['un', 'Por unidad'], ['kg', 'Por kilo']],
  insumo: [['un', 'Unidad'], ['kg', 'Kilo'], ['lt', 'Litro']],
}

function Chips({ opciones, valor, onChange }) {
  return (
    <div className="chips">
      {opciones.map(([id, texto]) => (
        <button type="button" key={id} className={`chip ${valor === id ? 'on' : ''}`} onClick={() => onChange(id)}>{texto}</button>
      ))}
    </div>
  )
}

function Campo({ id, label, error, children, opcional }) {
  return (
    <div className={`campo ${error ? 'campo-error' : ''}`}>
      <label htmlFor={id}>{label}{opcional && <span style={{ fontWeight: 400 }}> (opcional)</span>}</label>
      {children}
      {error && <div className="texto-error">{error}</div>}
    </div>
  )
}

const soloNumeros = (v) => v.replace(/\D/g, '')
const conPuntos = (v) => (v ? Number(v).toLocaleString('es-CL') : '')

// Crear o editar un producto (tipo="producto") o un insumo (tipo="insumo")
export default function CatalogoForm({ tipo, item, onClose, onEliminado }) {
  const { productos, insumos, promos, guardarProducto, guardarInsumo, eliminarProducto, eliminarInsumo, setImagen } = useDatos()
  const esProducto = tipo === 'producto'
  const lista = esProducto ? productos : insumos
  const nuevo = !item

  // El id se crea al abrir, así la foto de un producto nuevo ya queda asociada
  const [id] = useState(() => item?.id ?? `${tipo}-${Date.now()}`)
  const siguienteCodigo = Math.max(esProducto ? 100 : 500, ...lista.map((p) => p.codigo)) + 1
  const categorias = [...new Set(lista.map((p) => p.categoria))]

  const [nombre, setNombre] = useState(item?.nombre ?? '')
  const [codigo, setCodigo] = useState(String(item?.codigo ?? siguienteCodigo))
  const [categoria, setCategoria] = useState(item?.categoria ?? categorias[0] ?? '')
  const [nuevaCategoria, setNuevaCategoria] = useState('')
  const [creandoCategoria, setCreandoCategoria] = useState(false)
  const [unidad, setUnidad] = useState(item?.unidad ?? 'un')
  const [precio, setPrecio] = useState(item ? String(item.precio) : '')
  const [costo, setCosto] = useState(item?.costo ? String(item.costo) : '')
  const [intentado, setIntentado] = useState(false)

  const categoriaFinal = creandoCategoria ? nuevaCategoria.trim() : categoria
  const precioNum = parseInt(precio) || 0
  const costoNum = parseInt(costo) || 0
  const usadoPor = [...productos, ...insumos, ...promos].find((p) => String(p.codigo) === codigo && p.id !== id)
  const nombreRepetido = lista.some((p) => p.id !== id && p.nombre.trim().toLowerCase() === nombre.trim().toLowerCase())

  const falta = {
    nombre: (!nombre.trim() && 'Falta el nombre') || (nombreRepetido && 'Ya existe uno con ese nombre'),
    codigo: (!codigo && 'Falta el código') || (usadoPor && `El código ${codigo} ya lo usa "${usadoPor.nombre}"`),
    categoria: !categoriaFinal && 'Elige o escribe una categoría',
    precio: !precioNum && (esProducto ? 'Falta el precio de venta' : 'Falta el precio de compra'),
    costo: esProducto && costoNum > precioNum && precioNum > 0 && 'El costo es mayor que el precio de venta',
  }
  const errores = Object.values(falta).filter(Boolean)
  // El código repetido se avisa al escribir; el resto, al intentar guardar
  const ver = (campo) => ((campo === 'codigo' && usadoPor) || intentado ? falta[campo] : null)

  const cerrar = () => {
    if (nuevo) setImagen(id, null) // descarta la foto si no se llegó a crear
    onClose()
  }

  const guardar = (e) => {
    e.preventDefault()
    if (errores.length) {
      setIntentado(true)
      return
    }
    const datos = { ...item, id, codigo: parseInt(codigo), nombre: nombre.trim(), categoria: categoriaFinal, unidad, precio: precioNum }
    if (esProducto) guardarProducto({ ...datos, costo: costoNum })
    else guardarInsumo(datos)
    onClose()
  }

  const borrar = () => {
    const enPromo = esProducto && promos.find((p) => p.productos.some((c) => c.id === id))
    if (enPromo) {
      alert(`No se puede eliminar: "${item.nombre}" está en la promo "${enPromo.nombre}". Quítalo de la promo primero.`)
      return
    }
    if (!confirm(`¿Eliminar "${item.nombre}" del catálogo?\n\nLas ventas, compras y mermas ya registradas no se borran.`)) return
    if (esProducto) eliminarProducto(id)
    else eliminarInsumo(id)
    onClose()
    onEliminado?.()
  }

  const margen = precioNum - costoNum

  return (
    <Modal titulo={`${nuevo ? 'Nuevo' : 'Editar'} ${esProducto ? 'producto' : 'insumo'}`} onClose={cerrar}>
      <form className="form" onSubmit={guardar}>
        <div className="fila-foto">
          {esProducto && <FotoProducto producto={{ id, nombre: nombre || 'producto nuevo', categoria: categoriaFinal }} />}
          <div className="form" style={{ flex: 1, gap: 14 }}>
            <Campo id="cat-nombre" label="Nombre" error={ver('nombre')}>
              <input id="cat-nombre" className="input" autoFocus placeholder={esProducto ? 'Ej: Pan de molde' : 'Ej: Harina integral'} value={nombre} onChange={(e) => setNombre(e.target.value)} />
            </Campo>
            <Campo id="cat-codigo" label="Código" error={ver('codigo')}>
              <input id="cat-codigo" className="input" inputMode="numeric" value={codigo} onChange={(e) => setCodigo(soloNumeros(e.target.value))} />
            </Campo>
          </div>
        </div>

        <Campo label="Categoría" error={ver('categoria')}>
          <div className="chips">
            {categorias.map((c) => (
              <button type="button" key={c} className={`chip ${!creandoCategoria && categoria === c ? 'on' : ''}`} onClick={() => { setCategoria(c); setCreandoCategoria(false) }}>{c}</button>
            ))}
            <button type="button" className={`chip ${creandoCategoria ? 'on' : ''}`} onClick={() => setCreandoCategoria(true)}><Plus size={13} style={{ verticalAlign: -2 }} /> Nueva</button>
          </div>
          {creandoCategoria && <input className="input" style={{ marginTop: 8 }} autoFocus placeholder="Nombre de la categoría" value={nuevaCategoria} onChange={(e) => setNuevaCategoria(e.target.value)} />}
        </Campo>

        <Campo label={esProducto ? 'Se vende' : 'Se compra por'}>
          <Chips opciones={UNIDADES[tipo]} valor={unidad} onChange={setUnidad} />
        </Campo>

        <div className="fila">
          <Campo id="cat-precio" label={esProducto ? `Precio de venta${unidad === 'kg' ? ' por kilo' : ''}` : `Precio de compra por ${unidad === 'un' ? 'unidad' : unidad}`} error={ver('precio')}>
            <div className="input-unidad"><span>$</span><input id="cat-precio" inputMode="numeric" placeholder="0" value={conPuntos(precio)} onChange={(e) => setPrecio(soloNumeros(e.target.value))} /></div>
          </Campo>
          {esProducto && (
            <Campo id="cat-costo" label="Costo de producción" error={ver('costo')} opcional>
              <div className="input-unidad"><span>$</span><input id="cat-costo" inputMode="numeric" placeholder="0" value={conPuntos(costo)} onChange={(e) => setCosto(soloNumeros(e.target.value))} /></div>
            </Campo>
          )}
        </div>
        {esProducto && precioNum > 0 && costoNum > 0 && (
          <div className="total-ticket" style={{ background: margen >= 0 ? 'var(--ingreso-soft)' : 'var(--egreso-soft)' }}>
            <span>Margen {unidad === 'kg' ? 'por kilo' : 'por unidad'}</span>
            <strong style={{ fontSize: 18 }}>{dinero(margen)} · {porcentaje((margen / precioNum) * 100, 0)}</strong>
          </div>
        )}
        {!nuevo && esProducto && precioNum !== item.precio && (
          <div className="sub">El cambio de precio queda en el historial. Las ventas ya registradas mantienen su precio.</div>
        )}

        {intentado && errores.length > 0 && (
          <div className="alerta-error" role="alert">
            Para guardar falta:
            <ul>{errores.map((e) => <li key={e}>{e}</li>)}</ul>
          </div>
        )}

        <div className="acciones-form">
          {!nuevo && <button type="button" className="btn btn-peligro" onClick={borrar}><Trash2 size={16} /> Eliminar</button>}
          <button className="btn btn-primary btn-guardar" style={{ flex: 1 }}>{nuevo ? `Crear ${esProducto ? 'producto' : 'insumo'}` : 'Guardar cambios'}</button>
        </div>
      </form>
    </Modal>
  )
}
