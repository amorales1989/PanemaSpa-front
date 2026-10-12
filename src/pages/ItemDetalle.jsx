import { useMemo, useState } from 'react'
import { Link, useParams, Navigate } from 'react-router-dom'
import { ResponsiveContainer, BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts'
import { ArrowLeft, ShoppingBag, Wallet, PiggyBank, PackageX, Truck, Tag, Pencil, Percent, History } from 'lucide-react'
import CatalogoForm from '../components/CatalogoForm'
import AjustePrecios from '../components/AjustePrecios'
import { useDatos, rango, enRango } from '../context/DataContext'
import FotoProducto from '../components/FotoProducto'
import { Kpi, SelectorPeriodo, TooltipDinero } from '../components/ui'
import { statsProductos, statsInsumos, tramos } from '../lib/stats'
import { dinero, etiquetaDia, fechaCorta, porcentaje } from '../lib/format'
import { expandir, fmtNum, subtotal } from '../lib/items'

const eje = { tick: { fontSize: 12, fill: '#7d7168' }, tickLine: false, axisLine: false }
const cant = (n, unidad) => `${fmtNum(Math.round(n * 10) / 10)} ${unidad}`

function TooltipCantidad({ active, payload, unidad }) {
  if (!active || !payload?.length) return null
  return <div className="tooltip"><strong>{payload[0].payload.rango}</strong>{cant(payload[0].value, unidad)}</div>
}

export default function ItemDetalle() {
  const { tipo, id } = useParams()
  const { ingresos, egresos, mermas, hoy, productos, insumos } = useDatos()
  const [periodo, setPeriodo] = useState('90d')
  const [editando, setEditando] = useState(false)
  const [ajustando, setAjustando] = useState(false)
  const ref = (tipo === 'producto' ? productos : insumos).find((p) => p.id === id)

  const d = useMemo(() => {
    if (!ref) return null
    const r = rango(periodo)
    // Incluye lo vendido dentro de promos; si aparece varias veces en el registro, se suma
    const tiene = (x) => expandir(x.items).some((i) => i.tipo === tipo && i.id === id)
    const linea = (x) => {
      const ls = expandir(x.items).filter((i) => i.tipo === tipo && i.id === id)
      const cantidad = ls.reduce((t, i) => t + i.cantidad, 0)
      const total = ls.reduce((t, i) => t + subtotal(i), 0)
      return { ...ls[0], cantidad, precio: cantidad ? total / cantidad : 0, promo: ls.find((i) => i.promo)?.promo }
    }
    const base = tipo === 'producto' ? ingresos : egresos
    const actual = enRango(base, r.desde, r.hasta).filter(tiene)
    const prev = enRango(base, r.prevDesde, r.prevHasta).filter(tiene)
    const mermaAct = enRango(mermas, r.desde, r.hasta).filter(tiene)
    const mermaPrev = enRango(mermas, r.prevDesde, r.prevHasta).filter(tiene)
    const stats = (l, m) => (tipo === 'producto' ? statsProductos(l, m, productos) : statsInsumos(l, m, insumos)).find((p) => p.id === id)
    const { lista } = tramos(r.desde, r.hasta)
    const serie = lista.map((t) => ({ ...t, cantidad: actual.filter((x) => x.fecha >= t.a && x.fecha <= t.b).reduce((s, x) => s + linea(x).cantidad, 0) }))

    // Productos que más aparecen en las mismas ventas
    const juntos = {}
    if (tipo === 'producto') for (const v of actual) for (const i of expandir(v.items)) if (i.id !== id) juntos[i.nombre] = (juntos[i.nombre] ?? 0) + 1
    const conQue = Object.entries(juntos).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([nombre, n]) => ({ nombre, pct: (n / actual.length) * 100 }))

    const precios = [...actual].reverse().map((x) => ({ label: fechaCorta(x.fecha), rango: `${etiquetaDia(x.fecha, hoy)} · ${x.proveedor}`, precio: linea(x).precio }))
    return { actual, linea, s: stats(actual, mermaAct), p: stats(prev, mermaPrev), serie, conQue, precios }
  }, [ref, tipo, id, periodo, ingresos, egresos, mermas, hoy, productos, insumos])

  if (!ref) return <Navigate to="/productos" replace />
  const { s, p } = d
  const esProducto = tipo === 'producto'

  return (
    <>
      <Link to={esProducto ? '/productos' : '/productos?tab=insumos'} className="link" style={{ marginBottom: 12 }}><ArrowLeft size={16} /> {esProducto ? 'Productos' : 'Insumos'}</Link>
      <div className="page-head">
        <div className="cabecera-producto">
          {esProducto && <FotoProducto producto={ref} />}
          <div>
          <h1 className="serif">{ref.nombre}</h1>
          <p>
            <span className="tile-codigo">#{ref.codigo}</span> {ref.categoria} ·{' '}
            {esProducto ? `${dinero(ref.precio)} ${ref.unidad === 'un' ? 'c/u' : `/ ${ref.unidad}`} · costo ${dinero(ref.costo)}` : `se compra por ${ref.unidad}`}
          </p>
          </div>
        </div>
        <div className="acciones-head">
          <SelectorPeriodo valor={periodo} onChange={setPeriodo} />
          <button className="btn btn-pdf" onClick={() => setEditando(true)}><Pencil size={16} /> Editar</button>
          {esProducto && <button className="btn btn-primary" onClick={() => setAjustando(true)}><Percent size={16} /> Ajustar precio</button>}
        </div>
      </div>

      <div className="grid kpis">
        {esProducto ? (
          <>
            <Kpi destacado titulo="Vendidos" valor={s.vendidos} anterior={p.vendidos} Icono={ShoppingBag} formato={(n) => cant(n, ref.unidad)} />
            <Kpi titulo="Ventas" valor={s.ventas} anterior={p.ventas} Icono={Wallet} color="var(--ingreso)" suave="var(--ingreso-soft)" />
            <Kpi titulo="Margen estimado" valor={s.margen} Icono={PiggyBank} color="var(--brand)" suave="var(--brand-soft)" nota={`${porcentaje(s.ventas ? (s.margen / s.ventas) * 100 : 0, 0)} de cada venta`} />
            <Kpi titulo="Merma" valor={s.merma} Icono={PackageX} color="var(--merma)" suave="var(--merma-soft)" nota={`${cant(s.mermaCant, ref.unidad)} perdidos · ${porcentaje(s.vendidos ? (s.mermaCant / (s.vendidos + s.mermaCant)) * 100 : 0)} de lo producido`} />
          </>
        ) : (
          <>
            <Kpi destacado titulo="Comprado" valor={s.comprado} anterior={p.comprado} Icono={Truck} formato={(n) => cant(n, ref.unidad)} />
            <Kpi titulo="Gasto" valor={s.gasto} anterior={p.gasto} Icono={Wallet} color="var(--egreso)" suave="var(--egreso-soft)" subirEsBueno={false} />
            <Kpi titulo="Último precio" valor={s.ultimo} Icono={Tag} color="var(--brand)" suave="var(--brand-soft)" nota={`${s.variacion >= 0 ? 'Subió' : 'Bajó'} ${porcentaje(Math.abs(s.variacion))} en el período`} />
            <Kpi titulo="Merma" valor={s.merma} Icono={PackageX} color="var(--merma)" suave="var(--merma-soft)" nota={`${cant(s.mermaCant, ref.unidad)} perdidos`} />
          </>
        )}
      </div>

      <div className="grid grid-2" style={{ alignItems: 'start' }}>
        <div className="card">
          <div className="card-head">
            <h2>{esProducto ? 'Unidades vendidas' : 'Precio por compra'}</h2>
            <span className="sub">{esProducto ? (periodo === '7d' ? 'Por día' : periodo === '180d' ? 'Cada 2 semanas' : 'Por semana') : `Precio por ${ref.unidad}`}</span>
          </div>
          <div style={{ height: 280 }}>
            <ResponsiveContainer>
              {esProducto ? (
                <BarChart data={d.serie} margin={{ left: -8, right: 4, top: 4 }}>
                  <CartesianGrid vertical={false} stroke="#ece4d8" />
                  <XAxis dataKey="label" {...eje} minTickGap={12} />
                  <YAxis {...eje} width={48} />
                  <Tooltip content={<TooltipCantidad unidad={ref.unidad} />} cursor={{ fill: '#faf6f0' }} />
                  <Bar dataKey="cantidad" name="Vendidos" fill="#2f7d5b" radius={[6, 6, 0, 0]} maxBarSize={36} />
                </BarChart>
              ) : (
                <LineChart data={d.precios} margin={{ left: -8, right: 8, top: 8 }}>
                  <CartesianGrid vertical={false} stroke="#ece4d8" />
                  <XAxis dataKey="label" {...eje} minTickGap={24} />
                  <YAxis {...eje} width={68} tickFormatter={dinero} domain={['auto', 'auto']} />
                  <Tooltip content={<TooltipDinero />} />
                  <Line dataKey="precio" name="Precio" stroke="#c2513f" strokeWidth={2.5} dot={{ r: 3, fill: '#c2513f' }} />
                </LineChart>
              )}
            </ResponsiveContainer>
          </div>
        </div>

        <div className="stack">
          {esProducto && (
            <div className="card">
              <div className="card-head"><h2>Historial de precios</h2><History size={18} color="var(--muted)" /></div>
              {ref.historial?.length ? (
                <table className="tabla">
                  <tbody>
                    {ref.historial.slice(0, 6).map((h, i) => (
                      <tr key={i}>
                        <td>{etiquetaDia(h.fecha, hoy)}<div className="sub">{h.motivo}</div></td>
                        <td className="num"><span className="sub">{dinero(h.anterior)} → </span><b>{dinero(h.nuevo)}</b></td>
                        <td className="num"><span className={`delta ${h.nuevo >= h.anterior ? 'bien' : 'mal'}`}>{h.nuevo >= h.anterior ? '+' : ''}{porcentaje(((h.nuevo - h.anterior) / h.anterior) * 100, 0)}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : <div className="sub">Sin cambios de precio todavía. Precio actual: <b>{dinero(ref.precio)}</b>.</div>}
            </div>
          )}
          {esProducto && (
            <div className="card">
              <div className="card-head"><h2>Se vende junto con</h2></div>
              <div className="barras">
                {d.conQue.length === 0 && <div className="sub">Sin ventas en el período.</div>}
                {d.conQue.map((x) => (
                  <div key={x.nombre}>
                    <div className="barra-top"><span>{x.nombre}</span><span>{porcentaje(x.pct, 0)} de las ventas</span></div>
                    <div className="barra"><div style={{ width: `${x.pct}%`, background: 'var(--ingreso)' }} /></div>
                  </div>
                ))}
              </div>
            </div>
          )}
          <div className="card">
            <div className="card-head"><h2>{esProducto ? 'Últimas ventas' : 'Últimas compras'}</h2><span className="sub">{d.actual.length} en el período</span></div>
            <table className="tabla">
              <tbody>
                {d.actual.slice(0, 8).map((x) => {
                  const l = d.linea(x)
                  return (
                    <tr key={x.id}>
                      <td>{etiquetaDia(x.fecha, hoy)}<div className="sub">{esProducto ? `${x.hora} · ${x.categoria}${l.promo ? ` · en promo ${l.promo}` : ''}` : x.proveedor}</div></td>
                      <td className="num">{fmtNum(l.cantidad)} {l.unidad}<div className="sub">{dinero(Math.round(l.precio))}</div></td>
                      <td className="num"><b>{dinero(subtotal(l))}</b></td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            {d.actual.length === 0 && <div className="vacio">Sin movimientos en el período.</div>}
          </div>
        </div>
      </div>
      {editando && <CatalogoForm tipo={tipo} item={ref} onClose={() => setEditando(false)} />}
      {ajustando && <AjustePrecios productos={[ref]} onClose={() => setAjustando(false)} />}
    </>
  )
}
