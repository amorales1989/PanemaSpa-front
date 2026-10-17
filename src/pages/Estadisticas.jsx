import { useMemo, useState } from 'react'
import {
  ResponsiveContainer, ComposedChart, Bar, Line, BarChart, LineChart, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, CartesianGrid, ReferenceLine,
} from 'recharts'
import { useDatos, rango, enRango, suma } from '../context/DataContext'
import BotonPDF from '../components/BotonPDF'
import { SelectorPeriodo, Barras, TooltipDinero } from '../components/ui'
import { agrupar, notaDiasCerrados, porMes, porDiaSemana } from '../lib/stats'
import { dinero, dineroCorto, porcentaje } from '../lib/format'

const C = { ingresos: '#2f7d5b', egresos: '#c2513f', merma: '#c97a1c', ganancia: '#3b2a20' }
const PALETA = ['#3b2a20', '#c8893b', '#2f7d5b', '#8fa7b8']
const eje = { tick: { fontSize: 12, fill: '#7d7168' }, tickLine: false, axisLine: false }

export default function Estadisticas() {
  const { ingresos, egresos, mermas, hoy } = useDatos()
  const [periodo, setPeriodo] = useState('90d')

  const meses = useMemo(() => porMes({ ingresos, egresos, mermas, hoy, n: 6 }), [ingresos, egresos, mermas, hoy])
  const d = useMemo(() => {
    const r = rango(periodo)
    const ing = enRango(ingresos, r.desde, r.hasta)
    return { ing, egr: enRango(egresos, r.desde, r.hasta), totalIng: suma(ing) }
  }, [ingresos, egresos, periodo])

  const categoriasVenta = agrupar(d.ing, 'categoria').map((x, i) => ({ ...x, color: PALETA[i % PALETA.length] }))
  const dias = porDiaSemana(d.ing)
  const mejorDia = dias.reduce((a, b) => (b.ingresos > a.ingresos ? b : a))
  const margen = meses.slice(0, -1).reduce((t, m) => t + m.ganancia, 0) / Math.max(1, meses.slice(0, -1).reduce((t, m) => t + m.ingresos, 0)) * 100

  return (
    <>
      <div className="page-head">
        <div>
          <h1 className="serif">Estadísticas</h1>
          <p>Para entender cómo se mueve el negocio.</p>
        </div>
        <BotonPDF tipo="estadisticas" periodo={periodo} />
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-head">
          <div>
            <h2>Resultado por mes</h2>
            <span className="sub">Margen promedio de los últimos 5 meses cerrados: <b style={{ color: 'var(--ink)' }}>{porcentaje(margen)}</b></span>
          </div>
          <div className="leyenda">
            <span><i style={{ background: C.ingresos }} />Ingresos</span>
            <span><i style={{ background: C.egresos }} />Egresos</span>
            <span><i style={{ background: C.ganancia, height: 3 }} />Ganancia</span>
          </div>
        </div>
        <div style={{ height: 300 }}>
          <ResponsiveContainer>
            <ComposedChart data={meses} margin={{ left: -8, right: 4, top: 8 }}>
              <CartesianGrid vertical={false} stroke="#ece4d8" />
              <XAxis dataKey="label" {...eje} />
              <YAxis tickFormatter={dineroCorto} {...eje} width={56} />
              <Tooltip content={<TooltipDinero />} cursor={{ fill: '#faf6f0' }} />
              <Bar dataKey="ingresos" name="Ingresos" fill={C.ingresos} radius={[6, 6, 0, 0]} maxBarSize={36} />
              <Bar dataKey="egresos" name="Egresos" fill={C.egresos} radius={[6, 6, 0, 0]} maxBarSize={36} />
              <Line dataKey="ganancia" name="Ganancia" stroke={C.ganancia} strokeWidth={2.5} dot={{ r: 4, fill: C.ganancia }} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
        <span className="sub">* Mes en curso</span>
      </div>

      <div className="page-head" style={{ marginBottom: 16 }}>
        <h2 style={{ fontSize: 18 }}>Ventas y gastos del período</h2>
        <SelectorPeriodo valor={periodo} onChange={setPeriodo} />
      </div>

      <div className="grid grid-2-eq" style={{ marginBottom: 16 }}>
        <div className="card">
          <div className="card-head"><h2>¿De dónde vienen las ventas?</h2></div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
            <div style={{ width: 170, height: 170, position: 'relative', margin: '0 auto' }}>
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={categoriasVenta} dataKey="valor" nameKey="nombre" innerRadius={55} outerRadius={82} paddingAngle={2} stroke="none">
                    {categoriasVenta.map((c) => <Cell key={c.nombre} fill={c.color} />)}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', textAlign: 'center', pointerEvents: 'none' }}>
                <div><div className="sub" style={{ fontSize: 12, color: 'var(--muted)' }}>Total</div><b>{dineroCorto(d.totalIng)}</b></div>
              </div>
            </div>
            <div style={{ flex: 1, minWidth: 200 }}>
              <Barras items={categoriasVenta} total={d.totalIng} />
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-head">
            <h2>Venta promedio por día</h2>
            <span className="sub">Mejor día: <b style={{ color: 'var(--ink)' }}>{mejorDia.label}</b></span>
          </div>
          <div style={{ height: 220 }}>
            <ResponsiveContainer>
              <BarChart data={dias} margin={{ left: -8, right: 4, top: 4 }}>
                <CartesianGrid vertical={false} stroke="#ece4d8" />
                <XAxis dataKey="label" {...eje} />
                <YAxis tickFormatter={dineroCorto} {...eje} width={56} />
                <Tooltip content={<TooltipDinero />} cursor={{ fill: '#faf6f0' }} />
                <Bar dataKey="ingresos" name="Venta promedio" radius={[6, 6, 0, 0]} maxBarSize={40}>
                  {dias.map((x) => <Cell key={x.label} fill={x.label === mejorDia.label ? C.ingresos : '#b9d8c8'} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          {notaDiasCerrados(dias) && <span className="sub">{notaDiasCerrados(dias)}</span>}
        </div>
      </div>

      <div className="grid grid-2-eq">
        <div className="card">
          <div className="card-head"><h2>Gastos por categoría</h2><span className="sub">{dinero(suma(d.egr))}</span></div>
          <Barras items={agrupar(d.egr, 'categoria')} color="var(--egreso)" total={suma(d.egr)} />
        </div>

        <div className="card">
          <div className="card-head">
            <h2>Merma sobre ventas</h2>
            <span className="sub">Meta: bajo 2%</span>
          </div>
          <div style={{ height: 240 }}>
            <ResponsiveContainer>
              <LineChart data={meses} margin={{ left: -8, right: 8, top: 8 }}>
                <CartesianGrid vertical={false} stroke="#ece4d8" />
                <XAxis dataKey="label" {...eje} />
                <YAxis tickFormatter={(v) => `${String(v).replace('.', ',')}%`} {...eje} width={52} domain={[0, 'auto']} />
                <Tooltip content={<TooltipDinero />} />
                <ReferenceLine y={2} stroke="#c2513f" strokeDasharray="4 4" />
                <Line dataKey="pct" name="Merma" stroke={C.merma} strokeWidth={2.5} dot={{ r: 4, fill: C.merma }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </>
  )
}
