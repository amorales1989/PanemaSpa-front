// Formatos y etiquetas del panel de plataforma

const fmtFecha = new Intl.DateTimeFormat('es-CL', { day: 'numeric', month: 'short', year: 'numeric' })
const fmtFechaHora = new Intl.DateTimeFormat('es-CL', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })

// 'YYYY-MM-DD' (date) o ISO con hora (timestamptz)
export function fecha(valor) {
  if (!valor) return '—'
  const d = valor.length === 10 ? new Date(`${valor}T12:00:00`) : new Date(valor)
  return fmtFecha.format(d).replace(/\./g, '')
}

export function haceCuanto(valor) {
  if (!valor) return 'Nunca'
  const min = Math.round((Date.now() - new Date(valor)) / 60000)
  if (min < 2) return 'Recién'
  if (min < 60) return `Hace ${min} min`
  const horas = Math.round(min / 60)
  if (horas < 24) return `Hace ${horas} h`
  const dias = Math.round(horas / 24)
  if (dias < 30) return `Hace ${dias} ${dias === 1 ? 'día' : 'días'}`
  return fmtFechaHora.format(new Date(valor)).replace(/\./g, '')
}

// Días que faltan para una fecha 'YYYY-MM-DD' (negativo si ya pasó)
export function diasHasta(iso) {
  if (!iso) return null
  const hoy = new Date()
  hoy.setHours(12, 0, 0, 0)
  return Math.round((new Date(`${iso}T12:00:00`) - hoy) / 86400000)
}

export const ESTADO_SUSCRIPCION = {
  prueba: { texto: 'En prueba', clase: 'aviso' },
  activa: { texto: 'Activa', clase: 'bien' },
  vencida: { texto: 'Vencida', clase: 'mal' },
  cancelada: { texto: 'Cancelada', clase: 'mal' },
}

export const ESTADO_EMPRESA = {
  activa: { texto: 'Activa', clase: 'bien' },
  suspendida: { texto: 'Suspendida', clase: 'mal' },
  cancelada: { texto: 'Cancelada', clase: 'mal' },
}

export const sumarDias = (iso, dias) => {
  const d = iso ? new Date(`${iso}T12:00:00`) : new Date()
  if (iso && d < new Date()) d.setTime(Date.now()) // si ya venció, se cuenta desde hoy
  d.setDate(d.getDate() + dias)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
