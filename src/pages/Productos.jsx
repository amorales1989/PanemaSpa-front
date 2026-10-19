import { useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Search, ArrowUpRight, ArrowDownRight, ChevronRight, Plus, Pencil, Percent, X, AlertTriangle, PackagePlus } from 'lucide-react'
import { useDatos, rango, enRango } from '../context/DataContext'
import { SelectorPeriodo } from '../components/ui'
import BotonPDF from '../components/BotonPDF'
import ImagenProducto from '../components/ImagenProducto'
import CatalogoForm from '../components/CatalogoForm'
import AjustePrecios from '../components/AjustePrecios'
import AjusteStock from '../components/AjusteStock'
import { cantStock, llevaStock, porReponer } from '../lib/stock'
import { statsProductos, statsInsumos } from '../lib/stats'
import { dinero } from '../lib/format'
import { fmtNum } from '../lib/items'

function Delta({ valor, subirEsBueno = true }) {
  if (!isFinite(valor) || Math.abs(valor) < 0.5) return <span className="sub">—</span>
  const Flecha = valor >= 0 ? ArrowUpRight : ArrowDownRight
  return <span className={`delta ${valor >= 0 === subirEsBueno ? 'bien' : 'mal'}`}><Flecha size={13} />{Math.abs(valor).toFixed(0)}%</span>
}

// Bajo el valor solo se muestra la flecha si hubo un cambio real
const hayVariacion = (v) => Number.isFinite(v) && Math.abs(v) >= 0.5

const cant = (n, unidad) => `${fmtNum(Math.round(n * 10) / 10)} ${unidad}`

export default function Productos() {
  const { ingresos, egresos, mermas, productos, insumos, puede, controlStock, reponer } = useDatos()
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const tab = params.get('tab') === 'insumos' ? 'insumos' : 'productos'
  const gestiona = puede(tab === 'insumos' ? 'insumos.gestionar' : 'productos.gestionar')
  const ajustaPrecios = puede('precios.ajustar')
  const verCostos = puede('productos.ver_costos')
  const [periodo, setPeriodo] = useState('30d')
  const [busqueda, setBusqueda] = useState('')
  const [categoria, setCategoria] = useState('Todas')
  const [seleccion, setSeleccion] = useState(() => new Set()) // ids de productos marcados
  const [editando, setEditando] = useState(null) // null | 'nuevo' | item
  const [ajustando, setAjustando] = useState(null) // lista de productos a ajustar
  const [reponiendo, setReponiendo] = useState(null) // ítems a reponer
  const soloReponer = controlStock && params.get('reponer') === '1'
  const aReponer = tab === 'productos' ? reponer.productos : reponer.insumos

  const filas = useMemo(() => {
    const r = rango(periodo)
    const en = (l, prev) => enRango(l, prev ? r.prevDesde : r.desde, prev ? r.prevHasta : r.hasta)
    if (tab === 'productos') {
      const prev = Object.fromEntries(statsProductos(en(ingresos, true), en(mermas, true), productos).map((p) => [p.id, p]))
      return statsProductos(en(ingresos), en(mermas), productos)
        .map((p) => ({ ...p, tendencia: prev[p.id].ventas ? ((p.ventas - prev[p.id].ventas) / prev[p.id].ventas) * 100 : 0 }))
        .sort((a, b) => b.ventas - a.ventas)
    }
    const actual = statsInsumos(en(egresos), en(mermas), insumos)
    return actual.sort((a, b) => b.gasto - a.gasto)
  }, [tab, periodo, ingresos, egresos, mermas, productos, insumos])

  const q = busqueda.trim().toLowerCase()
  const visibles = filas.filter((p) =>
    (categoria === 'Todas' || p.categoria === categoria) &&
    (!soloReponer || porReponer(p)) &&
    (!q || p.nombre.toLowerCase().includes(q) || String(p.codigo).startsWith(q) || p.categoria.toLowerCase().includes(q)))
  const categorias = ['Todas', ...new Set((tab === 'productos' ? productos : insumos).map((p) => p.categoria))]

  // Selección para ajustes masivos (solo productos)
  const todosMarcados = visibles.length > 0 && visibles.every((p) => seleccion.has(p.id))
  const marcar = (id) => setSeleccion((s) => {
    const n = new Set(s)
    if (n.has(id)) n.delete(id)
    else n.add(id)
    return n
  })
  const marcarTodos = () => setSeleccion((s) => {
    const n = new Set(s)
    for (const p of visibles) {
      if (todosMarcados) n.delete(p.id)
      else n.add(p.id)
    }
    return n
  })
  const cambiarTab = (t) => {
    setParams({ ...(t === 'insumos' && { tab: 'insumos' }), ...(soloReponer && { reponer: '1' }) })
    setCategoria('Todas')
    setSeleccion(new Set())
  }
  const filtrarReponer = (si) => {
    const n = new URLSearchParams(params)
    if (si) n.set('reponer', '1')
    else n.delete('reponer')
    setParams(n)
  }
  const abrirReposicion = (lista) => setReponiendo(lista.map((p) => ({ ...p, tipo: tab === 'insumos' ? 'insumo' : 'producto' })))
  // Celda de stock: en rojo si está en o bajo el mínimo; los productos con receta lo llevan en sus insumos
  const celdaStock = (p) => (llevaStock(p) ? (
    <td className="num ocultar-movil">
      <span style={porReponer(p) ? { color: 'var(--egreso)', fontWeight: 700 } : undefined}>{cantStock(p.stock, p.unidad)}</span>
      {p.stockMinimo != null && <div className="sub">mín. {cantStock(p.stockMinimo, p.unidad)}</div>}
    </td>
  ) : <td className="num ocultar-movil"><span className="sub" title="Al venderlo se descuentan sus insumos">en insumos</span></td>)
  const etiquetaReponer = (p) => controlStock && porReponer(p) && <span className="badge mal" style={{ marginLeft: 6 }}>Reponer</span>

  const editar = (e, p) => {
    e.stopPropagation()
    setEditando((tab === 'productos' ? productos : insumos).find((x) => x.id === p.id))
  }

  // Resumen del período: [título, valor, nota que le da contexto]
  const pct = (parte, total) => (total ? `${Math.round((parte / total) * 100)} %` : '—')
  const resumen = (() => {
    if (tab === 'productos') {
      const ventas = filas.reduce((t, p) => t + p.ventas, 0)
      const conCosto = filas.filter((p) => p.costo > 0)
      const ventasConCosto = conCosto.reduce((t, p) => t + p.ventas, 0)
      const margen = conCosto.reduce((t, p) => t + p.margen, 0)
      const merma = filas.reduce((t, p) => t + p.merma, 0)
      const estrella = filas.find((p) => p.ventas > 0)
      const conVenta = filas.filter((p) => p.ventas > 0).length
      return [
        ['Ventas', dinero(ventas), `${conVenta} de ${filas.length} productos con ventas`],
        ventasConCosto
          ? ['Margen estimado', dinero(margen), `${pct(margen, ventasConCosto)} de las ventas${conCosto.length < filas.length ? ' con costo cargado' : ''}`]
          : ['Margen estimado', '—', conCosto.length && ventas ? 'Lo vendido no tiene costo cargado' : ventas ? 'Falta cargar los costos' : 'Sin ventas en el período'],
        ['Producto estrella', estrella?.nombre ?? '—', estrella ? `${dinero(estrella.ventas)} · ${pct(estrella.ventas, ventas)} de las ventas` : 'Sin ventas en el período'],
        ['Merma', dinero(merma), ventas ? `${pct(merma, ventas)} sobre las ventas` : 'Sin ventas en el período'],
      ]
    }
    const gasto = filas.reduce((t, p) => t + p.gasto, 0)
    const merma = filas.reduce((t, p) => t + p.merma, 0)
    const mayor = filas.find((p) => p.gasto > 0)
    const alza = [...filas].filter((p) => p.variacion >= 0.5).sort((a, b) => b.variacion - a.variacion)[0]
    return [
      ['Gasto en insumos', dinero(gasto), `${filas.filter((p) => p.gasto > 0).length} de ${filas.length} insumos comprados`],
      ['Mayor gasto', mayor?.nombre ?? '—', mayor ? `${dinero(mayor.gasto)} · ${pct(mayor.gasto, gasto)} del gasto` : 'Sin compras en el período'],
      ['Más subió de precio', alza?.nombre ?? '—', alza ? `+${Math.round(alza.variacion)} % en el período` : 'Sin alzas de precio'],
      ['Merma de insumos', dinero(merma), gasto ? `${pct(merma, gasto)} sobre lo comprado` : '—'],
    ]
  })()

  return (
    <>
      <div className="page-head">
        <div>
          <h1 className="serif">Productos</h1>
          <p>Seguimiento de cada producto e insumo. Toca uno para ver su detalle o agregarle una foto.</p>
        </div>
        <div className="acciones-head">
          <BotonPDF tipo={tab} periodo={periodo} texto={<>PDF<span className="ocultar-movil"> de {tab}</span></>} />
          {gestiona && (
            <button className="btn btn-primary" onClick={() => setEditando('nuevo')}>
              <Plus size={18} /> {tab === 'insumos' ? 'Nuevo insumo' : 'Nuevo producto'}
            </button>
          )}
        </div>
      </div>

      <div className="toolbar">
        <div className="segmented">
          <button className={tab === 'productos' ? 'on' : ''} onClick={() => cambiarTab('productos')}>Productos ({productos.length})</button>
          <button className={tab === 'insumos' ? 'on' : ''} onClick={() => cambiarTab('insumos')}>Insumos ({insumos.length})</button>
        </div>
        <label className="search">
          <Search size={18} />
          <input placeholder="Buscar por nombre, código o categoría..." value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
        </label>
      </div>

      {controlStock && aReponer.length > 0 && !soloReponer && (
        <div className="alerta" style={{ marginBottom: 12, alignItems: 'center', flexWrap: 'wrap' }} role="status">
          <AlertTriangle size={18} />
          <span style={{ flex: 1 }}>
            <b>{aReponer.length} {tab === 'insumos' ? (aReponer.length === 1 ? 'insumo' : 'insumos') : (aReponer.length === 1 ? 'producto' : 'productos')}</b> en o bajo su stock mínimo.
          </span>
          <button className="btn btn-ghost" onClick={() => filtrarReponer(true)}>Ver</button>
          {gestiona && <button className="btn btn-primary" onClick={() => abrirReposicion(aReponer)}><PackagePlus size={16} /> Reponer</button>}
        </div>
      )}

      <div className="chips" style={{ marginBottom: 16 }}>
        {controlStock && (
          <button className={`chip ${soloReponer ? 'on' : ''}`} onClick={() => filtrarReponer(!soloReponer)}>
            <AlertTriangle size={13} style={{ verticalAlign: -2 }} /> Por reponer ({aReponer.length})
          </button>
        )}
        {soloReponer && gestiona && visibles.length > 0 && (
          <button className="chip" onClick={() => abrirReposicion(visibles)}><PackagePlus size={13} style={{ verticalAlign: -2 }} /> Reponer {visibles.length === 1 ? 'este' : `estos ${visibles.length}`}</button>
        )}
        {categorias.map((c) => <button key={c} className={`chip ${categoria === c ? 'on' : ''}`} onClick={() => setCategoria(c)}>{c}</button>)}
      </div>

      <div className="card resumen-productos">
        <div className="resumen-productos-head">
          <h2>Resumen</h2>
          <SelectorPeriodo valor={periodo} onChange={setPeriodo} />
        </div>
        <div className="resumen-productos-datos">
          {resumen.map(([titulo, valor, nota]) => (
            <div key={titulo}>
              <span>{titulo}</span>
              <strong title={valor}>{valor}</strong>
              <small>{nota}</small>
            </div>
          ))}
        </div>
      </div>

      <div className="card" style={{ padding: '12px 12px 4px', overflowX: 'auto' }}>
        <table className="tabla tabla-click">
          {tab === 'productos' ? (
            <>
              <thead>
                <tr>
                  {ajustaPrecios && <th className="col-check" onClick={(e) => e.stopPropagation()}>
                    <input type="checkbox" checked={todosMarcados} onChange={marcarTodos} aria-label="Seleccionar todos los productos visibles" />
                  </th>}
                  <th>Producto</th><th className="num ocultar-movil">Precio</th>
                  {verCostos && <th className="num ocultar-movil">Costo</th>}
                  {controlStock && <th className="num ocultar-movil">Stock</th>}
                  <th className="num ocultar-movil">Vendidos</th><th className="num">Ventas</th><th className="num ocultar-movil">Margen est.</th>
                  <th className="num ocultar-medio">Merma</th><th />
                </tr>
              </thead>
              <tbody>
                {visibles.map((p) => (
                  <tr key={p.id} className={seleccion.has(p.id) ? 'marcada' : ''} onClick={() => navigate(`/productos/producto/${p.id}`)}>
                    {ajustaPrecios && <td className="col-check" onClick={(e) => { e.stopPropagation(); marcar(p.id) }}>
                      <input type="checkbox" checked={seleccion.has(p.id)} onChange={() => {}} aria-label={`Seleccionar ${p.nombre}`} />
                    </td>}
                    <td>
                      <div className="celda-producto">
                        <ImagenProducto producto={{ ...p, tipo: 'producto' }} tamano={40} />
                        <div><b>{p.nombre}</b>{etiquetaReponer(p)}<div className="sub">#{p.codigo} · {p.categoria}</div></div>
                      </div>
                    </td>
                    <td className="num ocultar-movil">{dinero(p.precio)}{p.unidad !== 'un' && <span className="sub"> /{p.unidad}</span>}</td>
                    {verCostos && (
                      <td className="num ocultar-movil">
                        {p.costo > 0 ? dinero(p.costo) : <span className="sub">—</span>}
                        {p.receta.length > 0 && <div className="sub" title={p.receta.map((r) => `${fmtNum(r.cantidad)} ${r.unidad} ${r.nombre}`).join(' · ')}>receta · {p.receta.length} {p.receta.length === 1 ? 'insumo' : 'insumos'}</div>}
                      </td>
                    )}
                    {controlStock && celdaStock(p)}
                    <td className="num ocultar-movil">{cant(p.vendidos, p.unidad)}</td>
                    <td className="num"><b>{dinero(p.ventas)}</b>{hayVariacion(p.tendencia) && <div className="sub-delta"><Delta valor={p.tendencia} /></div>}</td>
                    <td className="num ocultar-movil">
                      {p.costo > 0 ? dinero(p.margen) : <span className="sub" title="Carga el costo del producto para calcular el margen">— sin costo</span>}
                    </td>
                    <td className="num ocultar-medio" style={{ color: p.merma ? 'var(--merma)' : 'var(--muted)' }}>{p.merma ? dinero(p.merma) : '—'}</td>
                    <td className="num col-acciones">
                      {gestiona && <button className="icon-btn" onClick={(e) => editar(e, p)} aria-label={`Editar ${p.nombre}`} title="Editar"><Pencil size={15} /></button>}
                      <ChevronRight size={16} color="var(--muted)" className="ocultar-movil" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </>
          ) : (
            <>
              <thead>
                <tr>
                  <th>Insumo</th>{controlStock && <th className="num ocultar-movil">Stock</th>}<th className="num ocultar-movil">Comprado</th><th className="num">Gasto</th>
                  <th className="num ocultar-movil">Precio actual</th><th className="num ocultar-medio">Merma</th><th />
                </tr>
              </thead>
              <tbody>
                {visibles.map((p) => (
                  <tr key={p.id} onClick={() => navigate(`/productos/insumo/${p.id}`)}>
                    <td><b>{p.nombre}</b>{etiquetaReponer(p)}<div className="sub">#{p.codigo} · {p.categoria}</div></td>
                    {controlStock && celdaStock(p)}
                    <td className="num ocultar-movil">{cant(p.comprado, p.unidad)}</td>
                    <td className="num"><b>{dinero(p.gasto)}</b></td>
                    <td className="num ocultar-movil">{dinero(p.precio)}<span className="sub"> /{p.unidad}</span>{hayVariacion(p.variacion) && <div className="sub-delta"><Delta valor={p.variacion} subirEsBueno={false} /></div>}</td>
                    <td className="num ocultar-medio" style={{ color: p.merma ? 'var(--merma)' : 'var(--muted)' }}>{p.merma ? dinero(p.merma) : '—'}</td>
                    <td className="num col-acciones">
                      {gestiona && <button className="icon-btn" onClick={(e) => editar(e, p)} aria-label={`Editar ${p.nombre}`} title="Editar"><Pencil size={15} /></button>}
                      <ChevronRight size={16} color="var(--muted)" className="ocultar-movil" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </>
          )}
        </table>
        {visibles.length === 0 && <div className="vacio">{soloReponer ? 'Nada por reponer: todo está sobre su mínimo.' : 'No hay resultados.'}</div>}
      </div>
      {tab === 'productos' && <p className="sub" style={{ marginTop: 10 }}>Margen estimado = ventas − (unidades vendidas × costo). Los productos sin costo no se cuentan. Con receta, el costo sale de sus insumos. Marca productos con la casilla para cambiar varios precios a la vez.</p>}

      {tab === 'productos' && seleccion.size > 0 && (
        <div className="barra-seleccion" role="region" aria-label="Productos seleccionados">
          <strong>{seleccion.size} {seleccion.size === 1 ? 'producto seleccionado' : 'productos seleccionados'}</strong>
          <button className="btn btn-venta" onClick={() => setAjustando(productos.filter((p) => seleccion.has(p.id)))}>
            <Percent size={16} /> Ajustar precios
          </button>
          <button className="btn btn-ghost" onClick={() => setSeleccion(new Set())}><X size={16} /> Quitar selección</button>
        </div>
      )}

      {editando && (
        <CatalogoForm tipo={tab === 'insumos' ? 'insumo' : 'producto'} item={editando === 'nuevo' ? null : editando} onClose={() => setEditando(null)} />
      )}
      {reponiendo && <AjusteStock items={reponiendo} onClose={() => setReponiendo(null)} />}
      {ajustando && <AjustePrecios productos={ajustando} onClose={() => setAjustando(null)} onAplicado={() => setSeleccion(new Set())} />}
    </>
  )
}
