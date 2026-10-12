const clp = new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 })

export const dinero = (n) => clp.format(Math.round(n))

// Versión corta para ejes de gráficos: $1,2M · $350k
export const dineroCorto = (n) => {
  const abs = Math.abs(n)
  if (abs >= 1_000_000) return `$${(n / 1_000_000).toFixed(1).replace('.', ',').replace(',0', '')}M`
  if (abs >= 1_000) return `$${Math.round(n / 1_000)}k`
  return `$${n}`
}

export const porcentaje = (n, dec = 1) => `${n.toFixed(dec).replace('.', ',')}%`

export const isoLocal = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

export const desdeIso = (iso) => {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d)
}

const fmtDia = new Intl.DateTimeFormat('es-CL', { weekday: 'short', day: 'numeric', month: 'short' })
const fmtCorta = new Intl.DateTimeFormat('es-CL', { day: 'numeric', month: 'short' })
const fmtMes = new Intl.DateTimeFormat('es-CL', { month: 'short' })

export const fechaCorta = (iso) => fmtCorta.format(desdeIso(iso)).replace('.', '')
export const mesCorto = (d) => {
  const s = fmtMes.format(d).replace('.', '')
  return s.charAt(0).toUpperCase() + s.slice(1)
}

export const etiquetaDia = (iso, hoy) => {
  const d = desdeIso(iso)
  const diff = Math.round((hoy - d) / 86400000)
  if (diff === 0) return 'Hoy'
  if (diff === 1) return 'Ayer'
  const s = fmtDia.format(d).replace(/\./g, '')
  return s.charAt(0).toUpperCase() + s.slice(1)
}
