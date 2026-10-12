import { ArrowUpRight, ArrowDownRight } from 'lucide-react'
import { resumenItems } from '../lib/items'
import { PERIODOS } from '../context/DataContext'
import { TIPOS } from '../lib/tipos'
import { dinero, etiquetaDia } from '../lib/format'

export function SelectorPeriodo({ valor, onChange }) {
  return (
    <div className="segmented" role="tablist" aria-label="Período">
      {PERIODOS.map((p) => (
        <button key={p.id} className={valor === p.id ? 'on' : ''} onClick={() => onChange(p.id)}>{p.label}</button>
      ))}
    </div>
  )
}

// `subirEsBueno`: para ingresos/ganancia subir es bueno; para egresos/merma, malo
export function Kpi({ titulo, valor, anterior, Icono, color, suave, subirEsBueno = true, destacado, formato = dinero, nota }) {
  const delta = anterior ? ((valor - anterior) / Math.abs(anterior)) * 100 : 0
  const bien = delta >= 0 === subirEsBueno
  const Flecha = delta >= 0 ? ArrowUpRight : ArrowDownRight
  return (
    <div className={`card kpi ${destacado ? 'destacado' : ''}`}>
      <div className="kpi-top">
        <div className="kpi-icon" style={destacado ? undefined : { background: suave, color }}><Icono size={18} /></div>
        {titulo}
      </div>
      <div className="kpi-valor">{formato(valor)}</div>
      {anterior !== undefined ? (
        <div className="kpi-delta">
          <span className={`delta ${bien ? 'bien' : 'mal'}`}><Flecha size={14} />{Math.abs(delta).toFixed(0)}%</span>
          vs período anterior
        </div>
      ) : <div className="kpi-delta">{nota}</div>}
    </div>
  )
}

export function Barras({ items, color, total }) {
  const max = Math.max(...items.map((i) => i.valor), 1)
  return (
    <div className="barras">
      {items.map((i) => (
        <div key={i.nombre}>
          <div className="barra-top">
            <span>{i.nombre}{total ? <span style={{ color: 'var(--muted)' }}> · {Math.round((i.valor / total) * 100)}%</span> : null}</span>
            <span>{dinero(i.valor)}</span>
          </div>
          <div className="barra"><div style={{ width: `${(i.valor / max) * 100}%`, background: i.color ?? color }} /></div>
        </div>
      ))}
    </div>
  )
}

export function FilaMovimiento({ item, tipo, onAbrir }) {
  const t = TIPOS[tipo]
  const titulo = item.items ? (tipo === 'egresos' ? item.descripcion : resumenItems(item.items)) : item.descripcion
  const sub = {
    ingresos: () => `${item.hora} · ${item.categoria} · ${item.metodo}`,
    egresos: () => (item.items ? `${item.categoria} · ${resumenItems(item.items)}` : `${item.categoria} · ${item.metodo}`),
    mermas: () => `${item.motivo} · ${item.items.length} ${item.items.length === 1 ? 'ítem' : 'ítems'}`,
  }[tipo]()
  return (
    <button className="mov" onClick={() => onAbrir?.(tipo, item)}>
      <div className="mov-icon" style={{ background: t.suave, color: t.color }}><t.Icono size={19} /></div>
      <div className="mov-info">
        <div className="mov-titulo">{titulo}</div>
        <div className="mov-sub">{sub}</div>
      </div>
      <div className="mov-monto" style={{ color: tipo === 'ingresos' ? t.color : 'var(--ink)' }}>{t.signo}{dinero(item.monto)}</div>
    </button>
  )
}

// Lista agrupada por día: "Hoy", "Ayer", "Sáb 3 oct"...
export function ListaPorDia({ items, tipo, hoy, onAbrir }) {
  const grupos = []
  for (const it of items) {
    const ultimo = grupos[grupos.length - 1]
    if (ultimo?.fecha === it.fecha) ultimo.items.push(it)
    else grupos.push({ fecha: it.fecha, items: [it] })
  }
  return grupos.map((g) => (
    <div key={g.fecha}>
      <div className="mov-dia">
        <span>{etiquetaDia(g.fecha, hoy)}</span>
        <span>{dinero(g.items.reduce((t, x) => t + x.monto, 0))}</span>
      </div>
      {g.items.map((it) => <FilaMovimiento key={it.id} item={it} tipo={it._tipo ?? tipo} onAbrir={onAbrir} />)}
    </div>
  ))
}

export function TooltipDinero({ active, payload, label }) {
  if (!active || !payload?.length) return null
  label = payload[0].payload.rango ?? label
  return (
    <div className="tooltip">
      <strong>{label}</strong>
      {payload.map((p) => (
        <div key={p.dataKey}>
          <span><i style={{ background: p.color ?? p.payload.fill }} />{p.name}</span>
          <b>{p.dataKey === 'pct' ? `${p.value.toFixed(1).replace('.', ',')}%` : dinero(p.value)}</b>
        </div>
      ))}
    </div>
  )
}
