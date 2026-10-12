import { useMemo, useState } from 'react'
import { Link, useOutletContext } from 'react-router-dom'
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts'
import { Wallet, TrendingUp, TrendingDown, PackageX, ChevronRight, AlertTriangle, ShoppingBag } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useDatos, rango, enRango, suma } from '../context/DataContext'
import BotonPDF from '../components/BotonPDF'
import { Kpi, SelectorPeriodo, Barras, ListaPorDia, TooltipDinero } from '../components/ui'
import { agrupar, serie, topItems } from '../lib/stats'
import { dinero, dineroCorto, porcentaje } from '../lib/format'
import { fmtNum } from '../lib/items'

const COLOR = { ingresos: '#2f7d5b', egresos: '#c2513f' }

export default function Inicio() {
  const { ingresos, egresos, mermas, hoy } = useDatos()
  const { abrirRegistro, abrirDetalle } = useOutletContext()
  const [periodo, setPeriodo] = useState('30d')

  const d = useMemo(() => {
    const r = rango(periodo)
    const actual = { ingresos: enRango(ingresos, r.desde, r.hasta), egresos: enRango(egresos, r.desde, r.hasta), mermas: enRango(mermas, r.desde, r.hasta) }
    const prev = { ingresos: enRango(ingresos, r.prevDesde, r.prevHasta), egresos: enRango(egresos, r.prevDesde, r.prevHasta), mermas: enRango(mermas, r.prevDesde, r.prevHasta) }
    const tot = (o) => ({ ing: suma(o.ingresos), egr: suma(o.egresos), mer: suma(o.mermas) })
    const ultimos = [
      ...actual.ingresos.slice(0, 8).map((x) => ({ ...x, _tipo: 'ingresos' })),
      ...actual.egresos.slice(0, 8).map((x) => ({ ...x, _tipo: 'egresos' })),
      ...actual.mermas.slice(0, 8).map((x) => ({ ...x, _tipo: 'mermas' })),
    ].sort((a, b) => (a.fecha < b.fecha ? 1 : a.fecha > b.fecha ? -1 : b.id - a.id)).slice(0, 7)
    return { actual, t: tot(actual), p: tot(prev), serie: serie({ ...actual, ...r }), ultimos }
  }, [ingresos, egresos, mermas, periodo])

  const { t, p } = d
  const ganancia = t.ing - t.egr - t.mer
  const pctMerma = t.ing ? (t.mer / t.ing) * 100 : 0
  const gastos = agrupar(d.actual.egresos, 'categoria').slice(0, 5)
  const top = topItems(d.actual.mermas, 3)
  const masVendidos = topItems(d.actual.ingresos, 6)
  const { usuario } = useAuth()
  const [hora] = useState(() => new Date().getHours())
  const saludo = hora < 12 ? 'Buenos días' : hora < 20 ? 'Buenas tardes' : 'Buenas noches'
  const nombre = usuario?.nombre.split(' ')[0]

  return (
    <>
      <div className="page-head">
        <div>
          <h1 className="serif">{saludo}{nombre ? `, ${nombre}` : ''}</h1>
          <p>Así va tu negocio en los últimos {periodo === '7d' ? '7 días' : periodo === '30d' ? '30 días' : periodo === '90d' ? '3 meses' : '6 meses'}.</p>
        </div>
        <div className="acciones-head">
          <SelectorPeriodo valor={periodo} onChange={setPeriodo} />
          <BotonPDF tipo="resumen" periodo={periodo} />
        </div>
      </div>

      <div className="accesos-rapidos">
        <button className="btn acceso-venta" onClick={() => abrirRegistro('venta')}>
          <ShoppingBag size={22} />
          <span>Registrar venta<small>Atajo: tecla V</small></span>
        </button>
        <button className="btn acceso" onClick={() => abrirRegistro('egresos')}>
          <TrendingDown size={20} color="var(--egreso)" /> Gasto
        </button>
        <button className="btn acceso" onClick={() => abrirRegistro('mermas')}>
          <PackageX size={20} color="var(--merma)" /> Merma
        </button>
      </div>

      <div className="grid kpis">
        <Kpi destacado titulo="Ganancia" valor={ganancia} anterior={p.ing - p.egr - p.mer} Icono={Wallet} />
        <Kpi titulo="Ingresos" valor={t.ing} anterior={p.ing} Icono={TrendingUp} color="var(--ingreso)" suave="var(--ingreso-soft)" />
        <Kpi titulo="Egresos" valor={t.egr} anterior={p.egr} Icono={TrendingDown} color="var(--egreso)" suave="var(--egreso-soft)" subirEsBueno={false} />
        <Kpi titulo="Merma" valor={t.mer} anterior={p.mer} Icono={PackageX} color="var(--merma)" suave="var(--merma-soft)" subirEsBueno={false} />
      </div>

      <div className="grid grid-2" style={{ marginBottom: 16 }}>
        <div className="card card-grafico">
          <div className="card-head">
            <div><h2>Ingresos vs egresos</h2><span className="sub">{periodo === '7d' ? 'Por día' : periodo === '180d' ? 'Cada 2 semanas' : 'Por semana'}</span></div>
            <div className="leyenda"><span><i style={{ background: COLOR.ingresos }} />Ingresos</span><span><i style={{ background: COLOR.egresos }} />Egresos</span></div>
          </div>
          <div className="area-grafico">
            <ResponsiveContainer>
              <BarChart data={d.serie} margin={{ left: -8, right: 4, top: 4 }} barGap={3}>
                <CartesianGrid vertical={false} stroke="#ece4d8" />
                <XAxis dataKey="label" tick={{ fontSize: 12, fill: '#7d7168' }} tickLine={false} axisLine={false} minTickGap={12} />
                <YAxis tickFormatter={dineroCorto} tick={{ fontSize: 12, fill: '#7d7168' }} tickLine={false} axisLine={false} width={56} />
                <Tooltip content={<TooltipDinero />} cursor={{ fill: '#faf6f0' }} />
                <Bar dataKey="ingresos" name="Ingresos" fill={COLOR.ingresos} radius={[6, 6, 0, 0]} maxBarSize={32} />
                <Bar dataKey="egresos" name="Egresos" fill={COLOR.egresos} radius={[6, 6, 0, 0]} maxBarSize={32} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card">
          <div className="card-head">
            <h2>Últimos movimientos</h2>
          </div>
          <ListaPorDia items={d.ultimos} hoy={hoy} onAbrir={abrirDetalle} />
        </div>
      </div>

      <div className="grid grid-3">
        <div className="card">
          <div className="card-head">
            <h2>Lo más vendido</h2>
            <Link to="/productos" className="link">Ver productos <ChevronRight size={16} /></Link>
          </div>
          <table className="tabla">
            <tbody>
              {masVendidos.map((p, i) => (
                <tr key={p.id}>
                  <td style={{ color: 'var(--muted)', width: 24 }}>{i + 1}</td>
                  <td><Link className="link-fila" to={`/productos/producto/${p.id}`}>{p.nombre}</Link><div className="sub">{fmtNum(Math.round(p.cantidad * 10) / 10)} {p.unidad} vendidos</div></td>
                  <td className="num"><b>{dinero(p.valor)}</b></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="card">
          <div className="card-head">
            <h2>¿En qué se va la plata?</h2>
            <Link to="/egresos" className="link">Ver egresos <ChevronRight size={16} /></Link>
          </div>
          <Barras items={gastos} color="var(--egreso)" total={t.egr} />
        </div>

        <div className="card stack">
          <div className="card-head" style={{ marginBottom: 0 }}>
            <h2>Merma</h2>
            <Link to="/merma" className="link">Ver merma <ChevronRight size={16} /></Link>
          </div>
          <div className="alerta">
            <AlertTriangle size={18} />
            <div>
              Perdiste el <b>{porcentaje(pctMerma)}</b> de lo que vendiste en mercadería vencida o dañada.
              {pctMerma > 2 ? ' Está sobre el 2% recomendado.' : ' Vas bien, bajo el 2% recomendado.'}
            </div>
          </div>
          <div>
            <div className="card-head" style={{ marginBottom: 10 }}><span className="sub">Lo que más se pierde</span></div>
            <Barras items={top.map((x) => ({ nombre: x.nombre, valor: x.valor }))} color="var(--merma)" />
          </div>
        </div>
      </div>
    </>
  )
}
