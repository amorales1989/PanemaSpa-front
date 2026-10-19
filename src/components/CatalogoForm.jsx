import { useState } from 'react'
import { Trash2 } from 'lucide-react'
import Modal from './Modal'
import FotoProducto from './FotoProducto'
import { useDatos } from '../context/DataContext'
import { dinero, porcentaje } from '../lib/format'
import { useDialogo } from './Dialogo'
import { fmtNum, num } from '../lib/items'

const UNIDADES = {
  producto: [['un', 'Por unidad'], ['kg', 'Por kilo']],
  insumo: [['un', 'Unidad'], ['kg', 'Kilo'], ['lt', 'Litro']],
}

const NUEVA = '__nueva'

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
// Cantidades con hasta 3 decimales, con coma o punto
const soloCantidad = (v) => v.replace('.', ',').replace(/[^\d,]/g, '').replace(/,(?=.*,)/g, '')

// Insumos que lleva el producto. Con al menos uno, el costo se calcula de ellos.
function Receta({ receta, setReceta, insumos, porKilo, error }) {
  const [elegido, setElegido] = useState('')
  const disponibles = insumos.filter((i) => i.activo !== false && !receta.some((r) => r.id === i.id))
  const agregar = (id) => {
    if (!id) return
    setReceta([...receta, { id, cantidad: '' }])
    setElegido('')
  }
  const cambiar = (id, cantidad) => setReceta(receta.map((r) => (r.id === id ? { ...r, cantidad } : r)))
  return (
    <Campo label={`Receta: insumos que lleva ${porKilo ? '1 kilo' : '1 unidad'}`} error={error} opcional>
      {receta.map((r) => {
        const ins = insumos.find((i) => i.id === r.id) ?? r
        return (
          <div className="linea" key={r.id}>
            <div className="linea-info">
              <div className="linea-nombre">{ins.nombre}</div>
              {ins.precio !== undefined && <div className="linea-precio">{dinero(ins.precio)} / {ins.unidad}</div>}
            </div>
            <label className="precio-input">
              <input inputMode="decimal" placeholder="0" value={r.cantidad} aria-label={`Cantidad de ${ins.nombre}`}
                onChange={(e) => cambiar(r.id, soloCantidad(e.target.value))} />
              <span className="sub">{ins.unidad}</span>
            </label>
            <div className="linea-total">{ins.precio !== undefined ? dinero(num(r.cantidad) * ins.precio) : ''}</div>
            <button type="button" className="icon-btn icon-peligro" aria-label={`Quitar ${ins.nombre}`} onClick={() => setReceta(receta.filter((x) => x.id !== r.id))}><Trash2 size={15} /></button>
          </div>
        )
      })}
      {disponibles.length > 0 && (
        <select className="input" style={{ marginTop: receta.length ? 10 : 0 }} value={elegido} aria-label="Agregar insumo a la receta"
          onChange={(e) => agregar(e.target.value)}>
          <option value="">+ Agregar insumo…</option>
          {disponibles.map((i) => <option key={i.id} value={i.id}>#{i.codigo} · {i.nombre} ({i.unidad})</option>)}
        </select>
      )}
    </Campo>
  )
}

// Crear o editar un producto (tipo="producto") o un insumo (tipo="insumo")
export default function CatalogoForm({ tipo, item, onClose, onEliminado }) {
  const { productos, insumos, promos, guardarProducto, guardarInsumo, eliminarProducto, eliminarInsumo, setImagen, listas } = useDatos()
  const esProducto = tipo === 'producto'
  const { confirmar, avisar } = useDialogo()
  const lista = esProducto ? productos : insumos
  const nuevo = !item

  // El id se crea al abrir, así la foto de un producto nuevo ya queda asociada
  const [id] = useState(() => item?.id ?? `${tipo}-${Date.now()}`)
  const siguienteCodigo = Math.max(esProducto ? 100 : 500, ...lista.map((p) => p.codigo)) + 1
  // Las de la empresa + las que ya usan los ítems (por si alguna se desactivó)
  const categorias = [...new Set([...(esProducto ? listas.categoriasProducto : listas.categoriasInsumo), ...lista.map((p) => p.categoria)])]
    .filter((c) => c && c !== 'Sin categoría')

  const [nombre, setNombre] = useState(item?.nombre ?? '')
  const [codigo, setCodigo] = useState(String(item?.codigo ?? siguienteCodigo))
  const [categoria, setCategoria] = useState(item?.categoria ?? categorias[0] ?? '')
  const [nuevaCategoria, setNuevaCategoria] = useState('')
  const [creandoCategoria, setCreandoCategoria] = useState(false)
  const [unidad, setUnidad] = useState(item?.unidad ?? 'un')
  const [precio, setPrecio] = useState(item ? String(item.precio) : '')
  const [costo, setCosto] = useState(item?.costo ? String(Math.round(item.costo)) : '')
  const [receta, setReceta] = useState(() => (item?.receta ?? []).map((r) => ({ id: r.id, cantidad: fmtNum(r.cantidad) })))
  // Solo quien ve los insumos puede armar la receta
  const conReceta = esProducto && insumos.length > 0
  const [intentado, setIntentado] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [errorServidor, setErrorServidor] = useState('')

  const categoriaFinal = creandoCategoria ? nuevaCategoria.trim() : categoria
  const precioNum = parseInt(precio) || 0
  const usaReceta = conReceta && receta.length > 0
  const costoReceta = receta.reduce((t, r) => t + num(r.cantidad) * (insumos.find((i) => i.id === r.id)?.precio ?? 0), 0)
  const costoNum = usaReceta ? costoReceta : parseInt(costo) || 0
  const usadoPor = [...productos, ...insumos, ...promos].find((p) => String(p.codigo) === codigo && p.id !== id)
  const nombreRepetido = lista.some((p) => p.id !== id && p.nombre.trim().toLowerCase() === nombre.trim().toLowerCase())

  const falta = {
    nombre: (!nombre.trim() && 'Falta el nombre') || (nombreRepetido && 'Ya existe uno con ese nombre'),
    codigo: (!codigo && 'Falta el código') || (usadoPor && `El código ${codigo} ya lo usa "${usadoPor.nombre}"`),
    categoria: !categoriaFinal && 'Elige o escribe una categoría',
    precio: !precioNum && (esProducto ? 'Falta el precio de venta' : 'Falta el precio de compra'),
    costo: esProducto && !usaReceta && costoNum > precioNum && precioNum > 0 && 'El costo es mayor que el precio de venta',
    receta: usaReceta && receta.some((r) => !(num(r.cantidad) > 0)) && 'Indica la cantidad de cada insumo de la receta',
  }
  const errores = Object.values(falta).filter(Boolean)
  // El código repetido se avisa al escribir; el resto, al intentar guardar
  const ver = (campo) => ((campo === 'codigo' && usadoPor) || intentado ? falta[campo] : null)

  const cerrar = () => {
    if (nuevo) setImagen(id, null) // descarta la foto si no se llegó a crear
    onClose()
  }

  const guardar = async (e) => {
    e.preventDefault()
    if (errores.length) {
      setIntentado(true)
      return
    }
    const datos = { ...item, id, codigo: parseInt(codigo), nombre: nombre.trim(), categoria: categoriaFinal, unidad, precio: precioNum }
    setGuardando(true)
    setErrorServidor('')
    try {
      if (esProducto) {
        await guardarProducto({
          ...datos,
          ...(!usaReceta && { costo: costoNum }), // con receta el costo lo calcula el servidor
          ...(conReceta ? { receta: receta.map((r) => ({ id: r.id, cantidad: num(r.cantidad) })) } : { receta: undefined }),
        })
      }
      else await guardarInsumo(datos)
      onClose()
    } catch (err) {
      setErrorServidor(err.message)
      setGuardando(false)
    }
  }

  const borrar = async () => {
    const enPromo = esProducto && promos.find((p) => p.productos.some((c) => c.id === id))
    if (enPromo) {
      await avisar({ tipo: 'error', titulo: 'No se puede eliminar', mensaje: `"${item.nombre}" está en la promo "${enPromo.nombre}". Quítalo de la promo primero.` })
      return
    }
    const ok = await confirmar({
      titulo: `¿Eliminar "${item.nombre}"?`,
      mensaje: 'Sale del catálogo. Las ventas, compras y mermas ya registradas no se borran.',
      textoAceptar: 'Eliminar', peligro: true,
    })
    if (!ok) return
    try {
      if (esProducto) await eliminarProducto(id)
      else await eliminarInsumo(id)
      onClose()
      onEliminado?.()
    } catch (err) {
      setErrorServidor(err.message)
    }
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

        <div className="fila">
          <Campo id="cat-categoria" label="Categoría" error={ver('categoria')}>
            <select id="cat-categoria" className="input" value={creandoCategoria ? NUEVA : categoria}
              onChange={(e) => {
                const nueva = e.target.value === NUEVA
                setCreandoCategoria(nueva)
                if (!nueva) setCategoria(e.target.value)
              }}>
              {!categoria && !creandoCategoria && <option value="">Elige una categoría…</option>}
              {categorias.map((c) => <option key={c} value={c}>{c}</option>)}
              <option value={NUEVA}>+ Nueva categoría…</option>
            </select>
            {creandoCategoria && <input className="input" style={{ marginTop: 8 }} autoFocus placeholder="Nombre de la categoría" value={nuevaCategoria} onChange={(e) => setNuevaCategoria(e.target.value)} />}
          </Campo>
          <Campo id="cat-unidad" label={esProducto ? 'Se vende' : 'Se compra por'}>
            <select id="cat-unidad" className="input" value={unidad} onChange={(e) => setUnidad(e.target.value)}>
              {UNIDADES[tipo].map(([id, texto]) => <option key={id} value={id}>{texto}</option>)}
            </select>
          </Campo>
        </div>

        <div className="fila">
          <Campo id="cat-precio" label={esProducto ? `Precio de venta${unidad === 'kg' ? ' por kilo' : ''}` : `Precio de compra por ${unidad === 'un' ? 'unidad' : unidad}`} error={ver('precio')}>
            <div className="input-unidad"><span>$</span><input id="cat-precio" inputMode="numeric" placeholder="0" value={conPuntos(precio)} onChange={(e) => setPrecio(soloNumeros(e.target.value))} /></div>
          </Campo>
          {esProducto && (usaReceta ? (
            <Campo id="cat-costo" label="Costo de producción">
              <div className="input-unidad" title="Suma de los insumos de la receta"><span>$</span><input id="cat-costo" readOnly value={conPuntos(Math.round(costoReceta))} /></div>
              <div className="sub" style={{ marginTop: 6 }}>Se calcula de la receta y se actualiza con cada compra de insumos.</div>
            </Campo>
          ) : (
            <Campo id="cat-costo" label="Costo de producción" error={ver('costo')} opcional>
              <div className="input-unidad"><span>$</span><input id="cat-costo" inputMode="numeric" placeholder="0" value={conPuntos(costo)} onChange={(e) => setCosto(soloNumeros(e.target.value))} /></div>
            </Campo>
          ))}
        </div>
        {conReceta && <Receta receta={receta} setReceta={setReceta} insumos={insumos} porKilo={unidad === 'kg'} error={ver('receta')} />}
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

        {errorServidor && <div className="alerta-error" role="alert">{errorServidor}</div>}

        <div className="acciones-form">
          {!nuevo && <button type="button" className="btn btn-peligro" onClick={borrar}><Trash2 size={16} /> Eliminar</button>}
          <button className="btn btn-primary btn-guardar" style={{ flex: 1 }} disabled={guardando}>{guardando ? 'Guardando…' : nuevo ? `Crear ${esProducto ? 'producto' : 'insumo'}` : 'Guardar cambios'}</button>
        </div>
      </form>
    </Modal>
  )
}
