import { useMemo, useState } from 'react'
import { Link, useOutletContext } from 'react-router-dom'
import { Plus, Search } from 'lucide-react'
import { useDatos, rango, enRango, suma, PERIODOS } from '../context/DataContext'
import BotonPDF from '../components/BotonPDF'
import { SelectorPeriodo, ListaPorDia, Barras } from '../components/ui'
import { TIPOS } from '../lib/tipos'
import { agrupar, agruparItemsPorCategoria, topItems } from '../lib/stats'
import { dinero, porcentaje } from '../lib/format'
import { fmtNum } from '../lib/items'

const POR_PAGINA = 40

export default function Movimientos({ tipo }) {
  const t = TIPOS[tipo]
  const datos = useDatos()
  const { abrirRegistro, abrirDetalle } = useOutletContext()
  const [periodo, setPeriodo] = useState('30d')
  const [categoria, setCategoria] = useState('Todas')
  const [busqueda, setBusqueda] = useState('')
  const [visibles, setVisibles] = useState(POR_PAGINA)

  const r = rango(periodo)
  const delPeriodo = useMemo(() => enRango(datos[tipo], r.desde, r.hasta), [datos, tipo, r.desde, r.hasta])

  const filtrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase()
    const enCategoria = (x) => categoria === 'Todas' || (tipo === 'mermas'
      ? x.items.some((i) => (i.tipo === 'producto' ? 'Productos' : 'Insumos') === categoria)
      : x.categoria === categoria)
    const coincide = (x) => !q ||
      [x.descripcion, x.categoria, x.metodo, x.motivo].some((v) => v?.toLowerCase().includes(q)) ||
      x.items?.some((i) => i.nombre.toLowerCase().includes(q) || String(i.codigo) === q)
    return delPeriodo.filter((x) => enCategoria(x) && coincide(x))
  }, [delPeriodo, categoria, busqueda, tipo])

  const total = suma(filtrados)
  const dias = PERIODOS.find((p) => p.id === periodo).dias
  const ventas = suma(enRango(datos.ingresos, r.desde, r.hasta))

  return (
    <div className="pagina-mov">
      <div className="page-head">
        <div>
          <h1 className="serif">{t.titulo}</h1>
          <p>{t.ayuda}</p>
        </div>
        <div className="acciones-head">
        <BotonPDF tipo={{ ingresos: 'ventas', egresos: 'egresos', mermas: 'merma' }[tipo]} periodo={periodo} />
        <button className="btn btn-color" style={{ background: t.color }} onClick={() => abrirRegistro(tipo === 'ingresos' ? 'venta' : tipo)}>
          <Plus size={18} /> {t.nuevo}
        </button>
        </div>
      </div>

      <div style={{ marginBottom: 16 }}><SelectorPeriodo valor={periodo} onChange={(p) => { setPeriodo(p); setVisibles(POR_PAGINA) }} /></div>

      <div className="card resumen-filtro">
        <div><span>Total</span><strong style={{ color: t.color }}>{dinero(total)}</strong></div>
        <div><span>{t.registros}</span><strong>{filtrados.length.toLocaleString('es-CL')}</strong></div>
        <div><span>Promedio por día</span><strong>{dinero(total / dias)}</strong></div>
        {tipo === 'ingresos' && <div><span>Ticket promedio</span><strong>{dinero(filtrados.length ? total / filtrados.length : 0)}</strong></div>}
        {tipo === 'mermas' && <div><span>% sobre ventas</span><strong>{porcentaje(ventas ? (total / ventas) * 100 : 0)}</strong></div>}
      </div>

      <div className="grid grid-2 mov-cuerpo">
        <div className="mov-col-lista">
          <div className="toolbar">
            <label className="search">
              <Search size={18} />
              <input placeholder={tipo === 'egresos' ? 'Buscar por insumo, código, proveedor...' : 'Buscar por producto o código...'} value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
            </label>
          </div>
          <div className="chips" style={{ marginBottom: 16 }}>
            {['Todas', ...t.categorias].map((c) => (
              <button key={c} className={`chip ${categoria === c ? 'on' : ''}`} onClick={() => setCategoria(c)}>{c}</button>
            ))}
          </div>
          <div className="card mov-lista" style={{ paddingTop: 6 }}>
            {filtrados.length === 0
              ? <div className="vacio">No hay registros con estos filtros.</div>
              : <ListaPorDia items={filtrados.slice(0, visibles)} tipo={tipo} hoy={datos.hoy} onAbrir={abrirDetalle} />}
            {filtrados.length > visibles && (
              <div style={{ textAlign: 'center', paddingTop: 12 }}>
                <button className="btn btn-ghost" onClick={() => setVisibles((v) => v + POR_PAGINA)}>Ver más</button>
              </div>
            )}
          </div>
        </div>

        <div className="stack mov-col-lateral">
          <div className="card">
            <div className="card-head"><h2>{tipo === 'ingresos' ? 'Por canal' : tipo === 'mermas' ? 'Por categoría' : 'Por categoría'}</h2></div>
            <Barras items={tipo === 'mermas' ? agruparItemsPorCategoria(delPeriodo, datos.productos, datos.insumos) : agrupar(delPeriodo, 'categoria')} color={t.color} total={suma(delPeriodo)} />
          </div>
          <div className="card">
            <div className="card-head">
              <h2>{{ ingresos: 'Productos más vendidos', egresos: 'Insumos con más gasto', mermas: 'Lo que más se pierde' }[tipo]}</h2>
              <Link to="/productos" className="link">Ver todos</Link>
            </div>
            <table className="tabla">
              <thead><tr><th>{tipo === 'egresos' ? 'Insumo' : 'Producto'}</th><th className="num">Cant.</th><th className="num">{tipo === 'ingresos' ? 'Ventas' : tipo === 'egresos' ? 'Gasto' : 'Pérdida'}</th></tr></thead>
              <tbody>
                {topItems(delPeriodo, 6).map((p) => (
                  <tr key={`${p.tipo}:${p.id}`}>
                    <td><Link className="link-fila" to={`/productos/${p.tipo}/${p.id}`}>{p.nombre}</Link></td>
                    <td className="num">{fmtNum(Math.round(p.cantidad * 10) / 10)} {p.unidad}</td>
                    <td className="num">{dinero(p.valor)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
