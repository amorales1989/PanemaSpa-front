// Utilidades para las líneas (ítems) de ventas, compras y mermas

export const num = (v) => (typeof v === 'number' ? v : parseFloat(String(v).replace(',', '.')) || 0)
export const fmtNum = (n) => String(Math.round(num(n) * 1000) / 1000).replace('.', ',')
export const subtotal = (i) => Math.round(num(i.cantidad) * num(i.precio))
export const totalItems = (items) => items.reduce((t, i) => t + subtotal(i), 0)
export const pasoDe = (unidad) => (unidad === 'un' ? 1 : 0.1)

export const cantidadTexto = (i) => (i.unidad === 'un' ? `${fmtNum(i.cantidad)}×` : `${fmtNum(i.cantidad)} ${i.unidad}`)
export const resumenItems = (items) => items.map((i) => `${cantidadTexto(i)} ${i.nombre}`).join(', ')
export const claveItem = (i) => `${i.tipo}:${i.id}`

// Reparte el descuento de la venta entre sus líneas, en proporción a cada subtotal.
// Los pesos que sobran del redondeo van a las líneas con mayor fracción: la suma da exacto el descuento.
export function descuentosPorLinea(items, descuento) {
  const subs = items.map(subtotal)
  const total = subs.reduce((t, s) => t + s, 0)
  if (!descuento || !total) return subs.map(() => 0)
  const exactos = subs.map((s) => (s * descuento) / total)
  const partes = exactos.map(Math.floor)
  let resto = descuento - partes.reduce((t, p) => t + p, 0)
  const porFraccion = exactos.map((e, i) => [e - partes[i], i]).sort((a, b) => b[0] - a[0])
  for (let k = 0; resto > 0 && porFraccion.length; k++, resto--) partes[porFraccion[k % porFraccion.length][1]]++
  return partes
}

// ---------- Promos ----------

export const precioNormal = (promo, productos) =>
  promo.productos.reduce((t, c) => t + (productos.find((p) => p.id === c.id)?.precio ?? 0) * num(c.cantidad), 0)

// Productos de la promo con el precio promo repartido proporcionalmente entre ellos
export function componentesPromo(promo, productos) {
  const normal = precioNormal(promo, productos)
  const factor = normal ? promo.precio / normal : 0
  return promo.productos.map((c) => {
    const p = productos.find((x) => x.id === c.id)
    return { tipo: 'producto', id: p.id, codigo: p.codigo, nombre: p.nombre, unidad: p.unidad, cantidad: num(c.cantidad), precio: Math.round(p.precio * factor) }
  })
}

// Reemplaza cada promo por sus productos (para el seguimiento por producto)
export const expandir = (items = []) =>
  items.flatMap((i) => (i.tipo === 'promo' ? i.componentes.map((c) => ({ ...c, cantidad: c.cantidad * num(i.cantidad), promo: i.nombre })) : [i]))

// Ids de los ítems que aparecen en más registros (para los accesos rápidos)
export function masFrecuentes(registros, tipo, n = 10) {
  const cuenta = {}
  for (const r of registros) for (const i of expandir(r.items)) if (i.tipo === tipo) cuenta[i.id] = (cuenta[i.id] ?? 0) + 1
  return Object.entries(cuenta).sort((a, b) => b[1] - a[1]).slice(0, n).map(([id]) => id)
}
