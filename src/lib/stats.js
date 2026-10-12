import { desdeIso, isoLocal, fechaCorta, mesCorto } from './format'
import { expandir, subtotal } from './items'

const sumarPor = (lista, clave) => {
  const m = {}
  for (const x of lista) m[x[clave]] = (m[x[clave]] ?? 0) + x.monto
  return m
}

// Agrupa por una clave y devuelve [{nombre, valor}] ordenado de mayor a menor
export const agrupar = (lista, clave) =>
  Object.entries(sumarPor(lista, clave)).map(([nombre, valor]) => ({ nombre, valor })).sort((a, b) => b.valor - a.valor)

// Agrupa las líneas de los registros por la categoría del producto/insumo
export function agruparItemsPorCategoria(registros, productos, insumos) {
  const cat = {}
  for (const p of productos) cat[`producto:${p.id}`] = p.categoria
  for (const p of insumos) cat[`insumo:${p.id}`] = p.categoria
  const m = {}
  for (const r of registros) for (const i of r.items ?? []) {
    const c = cat[`${i.tipo}:${i.id}`] ?? 'Otros'
    m[c] = (m[c] ?? 0) + subtotal(i)
  }
  return Object.entries(m).map(([nombre, valor]) => ({ nombre, valor })).sort((a, b) => b.valor - a.valor)
}

// Tramos de tiempo: por día (≤7 días), por semana (≤3 meses) o cada 2 semanas
export function tramos(desde, hasta) {
  const inicio = desdeIso(desde)
  const fin = desdeIso(hasta)
  const dias = Math.round((fin - inicio) / 86400000) + 1
  const paso = dias <= 7 ? 1 : dias <= 90 ? 7 : 14
  const lista = []
  for (let d = new Date(inicio); d <= fin; d.setDate(d.getDate() + paso)) {
    const a = isoLocal(d)
    const hastaD = new Date(d)
    hastaD.setDate(hastaD.getDate() + paso - 1)
    const b = isoLocal(hastaD > fin ? fin : hastaD)
    lista.push({ a, b, label: fechaCorta(a), rango: paso === 1 ? fechaCorta(a) : `${fechaCorta(a)} – ${fechaCorta(b)}` })
  }
  return { lista, paso }
}

export function serie({ ingresos, egresos, desde, hasta }) {
  return tramos(desde, hasta).lista.map(({ a, b, label, rango }) => {
    const sumaTramo = (l) => l.reduce((t, x) => (x.fecha >= a && x.fecha <= b ? t + x.monto : t), 0)
    return { label, rango, ingresos: sumaTramo(ingresos), egresos: sumaTramo(egresos) }
  })
}

// Totales por mes calendario (últimos `n` meses incluyendo el actual)
export function porMes({ ingresos, egresos, mermas, hoy, n = 6 }) {
  const meses = []
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(hoy.getFullYear(), hoy.getMonth() - i, 1)
    const clave = isoLocal(d).slice(0, 7)
    const del = (l) => l.filter((x) => x.fecha.startsWith(clave)).reduce((t, x) => t + x.monto, 0)
    const ing = del(ingresos)
    const merma = del(mermas)
    const egr = del(egresos)
    meses.push({ label: mesCorto(d) + (i === 0 ? '*' : ''), ingresos: ing, egresos: egr, merma, ganancia: ing - egr - merma, pct: ing ? (merma / ing) * 100 : 0 })
  }
  return meses
}

const NOMBRES_DIA = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']

// Venta promedio por día de la semana (Lunes primero)
export function porDiaSemana(ingresos) {
  const total = Array(7).fill(0)
  const fechas = Array.from({ length: 7 }, () => new Set())
  for (const x of ingresos) {
    const dow = desdeIso(x.fecha).getDay()
    total[dow] += x.monto
    fechas[dow].add(x.fecha)
  }
  return [1, 2, 3, 4, 5, 6, 0].map((d) => ({ label: NOMBRES_DIA[d], ingresos: fechas[d].size ? total[d] / fechas[d].size : 0 }))
}

// Ítems con más valor acumulado en los registros (más vendidos, más perdidos...)
export function topItems(registros, n = 5, tipo) {
  const m = {}
  for (const r of registros) for (const i of expandir(r.items)) {
    if (tipo && i.tipo !== tipo) continue
    const k = `${i.tipo}:${i.id}`
    m[k] ??= { tipo: i.tipo, id: i.id, nombre: i.nombre, unidad: i.unidad, cantidad: 0, valor: 0 }
    m[k].cantidad += i.cantidad
    m[k].valor += subtotal(i)
  }
  return Object.values(m).sort((a, b) => b.valor - a.valor).slice(0, n)
}

// Resumen por producto: vendidos, ventas, margen estimado y merma
export function statsProductos(ventas, mermas, productos) {
  const m = {}
  const get = (id) => (m[id] ??= { vendidos: 0, ventas: 0, tickets: 0, mermaCant: 0, merma: 0 })
  for (const v of ventas) for (const i of expandir(v.items)) {
    const s = get(i.id)
    s.vendidos += i.cantidad
    s.ventas += subtotal(i)
    s.tickets++
  }
  for (const r of mermas) for (const i of r.items) if (i.tipo === 'producto') {
    const s = get(i.id)
    s.mermaCant += i.cantidad
    s.merma += subtotal(i)
  }
  return productos.map((p) => {
    const s = m[p.id] ?? get(p.id)
    return { ...p, ...s, margen: s.ventas - s.vendidos * p.costo }
  })
}

// Resumen por insumo: comprado, gasto, precios y merma
export function statsInsumos(egresos, mermas, insumos) {
  const m = {}
  const get = (id) => (m[id] ??= { comprado: 0, gasto: 0, compras: [], mermaCant: 0, merma: 0 })
  for (const e of egresos) for (const i of e.items ?? []) {
    const s = get(i.id)
    s.comprado += i.cantidad
    s.gasto += subtotal(i)
    s.compras.push({ fecha: e.fecha, proveedor: e.proveedor, cantidad: i.cantidad, precio: i.precio })
  }
  for (const r of mermas) for (const i of r.items) if (i.tipo === 'insumo') {
    const s = get(i.id)
    s.mermaCant += i.cantidad
    s.merma += subtotal(i)
  }
  return insumos.map((p) => {
    const s = m[p.id] ?? get(p.id)
    // compras vienen de la más reciente a la más antigua
    const ultimo = s.compras[0]?.precio ?? p.precio
    const primero = s.compras[s.compras.length - 1]?.precio ?? ultimo
    return { ...p, ...s, precioProm: s.comprado ? s.gasto / s.comprado : 0, ultimo, variacion: primero ? ((ultimo - primero) / primero) * 100 : 0 }
  })
}

// Resumen por promo: cuántas se vendieron y cuánto dejaron
export function statsPromos(ventas) {
  const m = {}
  for (const v of ventas) for (const i of v.items) if (i.tipo === 'promo') {
    m[i.id] ??= { vendidas: 0, ingresos: 0 }
    m[i.id].vendidas += i.cantidad
    m[i.id].ingresos += subtotal(i)
  }
  return m
}
