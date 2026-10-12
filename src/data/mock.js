// Datos de ejemplo (mock) para maquetar la app. Se generan de forma
// determinística para que siempre se vean iguales al recargar.

import { isoLocal } from '../lib/format'
import { componentesPromo } from '../lib/items'

export const HOY = new Date(2026, 9, 5) // 5 de octubre de 2026

let seed = 20261005
const rnd = () => {
  seed = (seed * 16807) % 2147483647
  return (seed - 1) / 2147483646
}
const elegir = (arr) => arr[Math.floor(rnd() * arr.length)]
const elegirPonderado = (lista, peso) => {
  const total = lista.reduce((t, x) => t + peso(x), 0)
  let r = rnd() * total
  for (const x of lista) if ((r -= peso(x)) <= 0) return x
  return lista[lista.length - 1]
}
const redondear = (n, paso) => Math.max(paso, Math.round(Math.round(n / paso) * paso * 1000) / 1000)

// ---------- Catálogo ----------

export const CATEGORIAS_PRODUCTO = ['Panes', 'Pastelería', 'Tortas', 'Cafetería']
export const PRODUCTOS = [
  { id: 'marraqueta', nombre: 'Marraqueta', categoria: 'Panes', unidad: 'kg', precio: 2490, costo: 1100 },
  { id: 'hallulla', nombre: 'Hallulla', categoria: 'Panes', unidad: 'kg', precio: 2490, costo: 1050 },
  { id: 'amasado', nombre: 'Pan amasado', categoria: 'Panes', unidad: 'un', precio: 450, costo: 160 },
  { id: 'masa-madre', nombre: 'Pan de masa madre', categoria: 'Panes', unidad: 'un', precio: 4900, costo: 1900 },
  { id: 'baguette', nombre: 'Baguette', categoria: 'Panes', unidad: 'un', precio: 1800, costo: 600 },
  { id: 'croissant', nombre: 'Croissant', categoria: 'Pastelería', unidad: 'un', precio: 1600, costo: 550 },
  { id: 'pain-choc', nombre: 'Pain au chocolat', categoria: 'Pastelería', unidad: 'un', precio: 1900, costo: 700 },
  { id: 'berlin', nombre: 'Berlín', categoria: 'Pastelería', unidad: 'un', precio: 1200, costo: 400 },
  { id: 'alfajor', nombre: 'Alfajor de manjar', categoria: 'Pastelería', unidad: 'un', precio: 1300, costo: 450 },
  { id: 'trozo-kuchen', nombre: 'Trozo de kuchen', categoria: 'Pastelería', unidad: 'un', precio: 2500, costo: 900 },
  { id: 'kuchen', nombre: 'Kuchen de frambuesa', categoria: 'Pastelería', unidad: 'un', precio: 12900, costo: 4800 },
  { id: 'trozo-torta', nombre: 'Trozo de torta', categoria: 'Tortas', unidad: 'un', precio: 3200, costo: 1200 },
  { id: 'tres-leches', nombre: 'Torta tres leches 12p', categoria: 'Tortas', unidad: 'un', precio: 22900, costo: 9500 },
  { id: 'hoja', nombre: 'Torta de hoja 15p', categoria: 'Tortas', unidad: 'un', precio: 27900, costo: 11000 },
  { id: 'selva-negra', nombre: 'Torta selva negra 20p', categoria: 'Tortas', unidad: 'un', precio: 32900, costo: 13500 },
  { id: 'americano', nombre: 'Café americano', categoria: 'Cafetería', unidad: 'un', precio: 1900, costo: 400 },
  { id: 'cappuccino', nombre: 'Cappuccino', categoria: 'Cafetería', unidad: 'un', precio: 2800, costo: 600 },
  { id: 'jugo', nombre: 'Jugo natural', categoria: 'Cafetería', unidad: 'un', precio: 2900, costo: 900 },
  { id: 'medialuna', nombre: 'Medialuna', categoria: 'Pastelería', unidad: 'un', precio: 900, costo: 300 },
  // Productos por peso: el precio final depende de lo que marque la balanza
  { id: 'torta-kg', nombre: 'Torta por kilo', categoria: 'Tortas', unidad: 'kg', precio: 18900, costo: 7500 },
  { id: 'galletas-kg', nombre: 'Galletas surtidas', categoria: 'Pastelería', unidad: 'kg', precio: 9900, costo: 3800 },
]

export const CATEGORIAS_INSUMO = ['Secos', 'Lácteos y huevos', 'Frutas y rellenos', 'Cafetería', 'Packaging']
// `precio` = último precio de compra conocido (referencia para el formulario)
export const INSUMOS = [
  { id: 'harina', nombre: 'Harina', categoria: 'Secos', unidad: 'kg', precio: 880 },
  { id: 'azucar', nombre: 'Azúcar', categoria: 'Secos', unidad: 'kg', precio: 1150 },
  { id: 'levadura', nombre: 'Levadura', categoria: 'Secos', unidad: 'kg', precio: 5900 },
  { id: 'mantequilla', nombre: 'Mantequilla', categoria: 'Lácteos y huevos', unidad: 'kg', precio: 8900 },
  { id: 'leche', nombre: 'Leche entera', categoria: 'Lácteos y huevos', unidad: 'lt', precio: 1100 },
  { id: 'crema', nombre: 'Crema para batir', categoria: 'Lácteos y huevos', unidad: 'lt', precio: 4200 },
  { id: 'huevos', nombre: 'Huevos', categoria: 'Lácteos y huevos', unidad: 'un', precio: 180 },
  { id: 'frambuesas', nombre: 'Frambuesas', categoria: 'Frutas y rellenos', unidad: 'kg', precio: 6900 },
  { id: 'chocolate', nombre: 'Chocolate cobertura', categoria: 'Frutas y rellenos', unidad: 'kg', precio: 12500 },
  { id: 'manjar', nombre: 'Manjar', categoria: 'Frutas y rellenos', unidad: 'kg', precio: 4800 },
  { id: 'cafe', nombre: 'Café en grano', categoria: 'Cafetería', unidad: 'kg', precio: 18000 },
  { id: 'cajas', nombre: 'Cajas de torta', categoria: 'Packaging', unidad: 'un', precio: 650 },
  { id: 'bolsas', nombre: 'Bolsas kraft', categoria: 'Packaging', unidad: 'un', precio: 60 },
  { id: 'vasos', nombre: 'Vasos de café', categoria: 'Packaging', unidad: 'un', precio: 120 },
]

// Código numérico de cada ítem, para tipearlo rápido en los registros
PRODUCTOS.forEach((p, i) => { p.codigo = 101 + i })
INSUMOS.forEach((p, i) => { p.codigo = 501 + i })

// Promos: combinaciones de productos a un precio especial
export const PROMOS = [
  { id: 'desayuno', codigo: 901, nombre: 'Desayuno', productos: [{ id: 'americano', cantidad: 1 }, { id: 'medialuna', cantidad: 2 }], precio: 3200, activa: true },
  { id: 'once-dos', codigo: 902, nombre: 'Once para dos', productos: [{ id: 'cappuccino', cantidad: 2 }, { id: 'trozo-kuchen', cantidad: 2 }], precio: 9500, activa: true },
  { id: 'pack-amasado', codigo: 903, nombre: 'Pack 10 amasados', productos: [{ id: 'amasado', cantidad: 10 }], precio: 3900, activa: true },
  { id: 'torta-cafe', codigo: 904, nombre: 'Trozo de torta + café', productos: [{ id: 'trozo-torta', cantidad: 1 }, { id: 'cappuccino', cantidad: 1 }], precio: 5400, activa: true },
  { id: 'invierno', codigo: 905, nombre: 'Promo invierno', productos: [{ id: 'berlin', cantidad: 2 }, { id: 'americano', cantidad: 1 }], precio: 3500, activa: false },
]

export const PROVEEDORES = ['Molinera del Sur', 'Lácteos Los Ángeles', 'Frutos y Cía', 'Café Tostado Local', 'Comercial Pack']
export const CATEGORIAS_INGRESO = ['Mostrador', 'Pedidos y tortas', 'Delivery', 'Tienda online']
export const CATEGORIAS_EGRESO = ['Insumos', 'Sueldos', 'Arriendo', 'Servicios', 'Mantención', 'Otros']
export const METODOS_PAGO = ['Efectivo', 'Débito', 'Crédito', 'Transferencia']
export const MOTIVOS_MERMA = ['Vencido', 'Dañado', 'Sobreproducción']

const producto = (id) => PRODUCTOS.find((p) => p.id === id)
const insumo = (id) => INSUMOS.find((p) => p.id === id)
const item = (tipo, ref, cantidad, precio) => ({ tipo, id: ref.id, codigo: ref.codigo, nombre: ref.nombre, unidad: ref.unidad, cantidad, precio })
const totalItems = (items) => items.reduce((t, i) => t + Math.round(i.cantidad * i.precio), 0)

// ---------- Parámetros solo para generar datos ----------

// [popularidad, cantidad mínima, máxima, paso]
const VENTA = {
  marraqueta: [10, 0.3, 1.6, 0.01], hallulla: [7, 0.3, 1.4, 0.01], medialuna: [5, 1, 4, 1], 'torta-kg': [0.8, 0.5, 1.5, 0.01], 'galletas-kg': [1, 0.2, 0.6, 0.01], amasado: [5, 4, 10, 1], 'masa-madre': [3, 1, 1, 1],
  baguette: [3, 1, 2, 1], croissant: [6, 1, 4, 1], 'pain-choc': [3, 1, 3, 1], berlin: [4, 1, 4, 1], alfajor: [3, 1, 3, 1],
  'trozo-kuchen': [3, 1, 2, 1], kuchen: [0.4, 1, 1, 1], 'trozo-torta': [3, 1, 2, 1], 'tres-leches': [0.15, 1, 1, 1],
  hoja: [0.1, 1, 1, 1], 'selva-negra': [0.08, 1, 1, 1], americano: [4, 1, 2, 1], cappuccino: [3, 1, 2, 1], jugo: [2, 1, 2, 1],
}
const POR_ENCARGO = ['tres-leches', 'hoja', 'selva-negra', 'kuchen']

// Compras a proveedores: día de la semana → insumo: [mín, máx, paso]
const COMPRAS = [
  { proveedor: 'Molinera del Sur', dias: [2], items: { harina: [50, 75, 25], azucar: [10, 15, 5], levadura: [2, 3, 1] } },
  { proveedor: 'Lácteos Los Ángeles', dias: [2, 5], items: { mantequilla: [5, 8, 1], leche: [16, 24, 2], crema: [6, 10, 1], huevos: [150, 210, 30] } },
  { proveedor: 'Frutos y Cía', dias: [5], items: { frambuesas: [3, 5, 1], chocolate: [2, 4, 1], manjar: [4, 6, 1] } },
  { proveedor: 'Café Tostado Local', dias: [3], items: { cafe: [2, 4, 1] } },
]
const PACKAGING = { cajas: [40, 60, 10], bolsas: [400, 600, 100], vasos: [250, 350, 50] }

// [popularidad, mín, máx, paso] de lo que suele perderse
const MERMA = {
  marraqueta: [3, 0.5, 2, 0.5], hallulla: [2, 0.5, 1.5, 0.5], 'masa-madre': [2, 1, 3, 1], croissant: [3, 2, 6, 1],
  berlin: [2, 2, 5, 1], 'trozo-kuchen': [2, 1, 3, 1], 'trozo-torta': [2, 1, 3, 1], kuchen: [0.4, 1, 1, 1], 'tres-leches': [0.3, 1, 1, 1],
  leche: [1, 1, 3, 1], crema: [1, 0.5, 2, 0.5], frambuesas: [1, 0.5, 1.5, 0.5], huevos: [0.5, 6, 12, 6],
}

const cantidadEntre = ([, min, max, paso]) => redondear(min + rnd() * (max - min), paso)
const hora = (min, max) => {
  const m = Math.floor(min + rnd() * (max - min))
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`
}

// ---------- Generación ----------

const DIAS = 400
const ingresos = []
const egresos = []
const mermas = []
let id = 1

for (let d = DIAS; d >= 0; d--) {
  const fecha = new Date(HOY)
  fecha.setDate(HOY.getDate() - d)
  const dow = fecha.getDay()
  const finde = dow === 0 || dow === 6
  const dia = fecha.getDate()
  const iso = isoLocal(fecha)
  const tendencia = 0.85 + ((DIAS - d) / DIAS) * 0.3 // leve alza en el año
  const inflacion = 1 - 0.006 * (d / 30) // insumos ~0,6% más caros cada mes
  const precioInsumo = (ins) => redondear(ins.precio * inflacion * (0.96 + rnd() * 0.08), 10)

  // Ventas (lunes cerrado)
  if (dow !== 1) {
    const tickets = []
    const n = Math.round((finde ? 48 : 32) * tendencia * (0.85 + rnd() * 0.3))
    for (let i = 0; i < n; i++) {
      const r = rnd()
      const canal = r < 0.88 ? 'Mostrador' : r < 0.96 ? 'Delivery' : 'Tienda online'
      const metodo = canal === 'Delivery' ? 'Transferencia' : canal === 'Tienda online' ? 'Crédito'
        : elegirPonderado([['Efectivo', 35], ['Débito', 45], ['Crédito', 15], ['Transferencia', 5]], (x) => x[1])[0]
      const lineas = 1 + (rnd() < 0.5) + (rnd() < 0.2)
      const elegidos = new Set()
      const items = []
      for (let l = 0; l < lineas; l++) {
        const p = elegirPonderado(PRODUCTOS.filter((x) => !elegidos.has(x.id)), (x) => VENTA[x.id][0])
        elegidos.add(p.id)
        items.push(item('producto', p, cantidadEntre(VENTA[p.id]), p.precio))
      }
      if (rnd() < 0.1) {
        const promo = elegirPonderado(PROMOS.filter((x) => x.activa), (x) => (x.id === 'desayuno' ? 4 : x.id === 'pack-amasado' ? 2 : 1))
        items.push({ tipo: 'promo', id: promo.id, codigo: promo.codigo, nombre: promo.nombre, unidad: 'un', cantidad: 1, precio: promo.precio, componentes: componentesPromo(promo, PRODUCTOS) })
      }
      tickets.push({ fecha: iso, hora: hora(7.5 * 60, 20.5 * 60), categoria: canal, metodo, items })
    }
    const encargos = rnd() < (finde ? 0.6 : 0.25) ? 1 + (rnd() < 0.3) : 0
    for (let i = 0; i < encargos; i++) {
      const p = producto(elegir(POR_ENCARGO))
      tickets.push({ fecha: iso, hora: hora(9 * 60, 19 * 60), categoria: 'Pedidos y tortas', metodo: elegir(['Transferencia', 'Crédito']), items: [item('producto', p, 1, p.precio)] })
    }
    tickets.sort((a, b) => (a.hora < b.hora ? -1 : 1))
    for (const t of tickets) ingresos.push({ id: id++, ...t, monto: totalItems(t.items) })
  }

  // Compras de insumos
  const comprar = (proveedor, mapa) => {
    const items = Object.entries(mapa).map(([ref, rango]) => {
      const ins = insumo(ref)
      return item('insumo', ins, cantidadEntre([0, ...rango]), precioInsumo(ins))
    })
    egresos.push({ id: id++, fecha: iso, categoria: 'Insumos', descripcion: proveedor, proveedor, metodo: 'Transferencia', items, monto: totalItems(items) })
  }
  for (const c of COMPRAS) if (c.dias.includes(dow)) comprar(c.proveedor, c.items)
  if (dia === 1 || dia === 16) comprar('Comercial Pack', PACKAGING)

  // Gastos fijos
  const gasto = (categoria, descripcion, monto, metodo = 'Transferencia') => egresos.push({ id: id++, fecha: iso, categoria, descripcion, metodo, monto })
  if (dia === 5) gasto('Arriendo', 'Arriendo local', 850000)
  if (dia === 10) gasto('Servicios', 'Luz', redondear(150000 + rnd() * 60000, 100), 'Débito')
  if (dia === 12) gasto('Servicios', 'Gas', redondear(95000 + rnd() * 45000, 100), 'Débito')
  if (dia === 15) gasto('Servicios', 'Agua e internet', redondear(55000 + rnd() * 20000, 100), 'Débito')
  if (dia === 28) {
    gasto('Sueldos', 'Sueldo maestro panadero', 950000)
    gasto('Sueldos', 'Sueldo pastelera', 850000)
    gasto('Sueldos', 'Sueldo vendedora', 620000)
  }
  if (rnd() < 0.04) gasto('Mantención', elegir(['Mantención horno', 'Reparación vitrina refrigerada', 'Técnico amasadora']), redondear(60000 + rnd() * 120000, 100))
  if (rnd() < 0.05) gasto('Otros', elegir(['Artículos de limpieza', 'Publicidad Instagram', 'Contador']), redondear(20000 + rnd() * 70000, 100), 'Débito')

  // Merma
  const nMermas = rnd() < 0.55 ? (rnd() < 0.25 ? 2 : 1) : 0
  for (let i = 0; i < nMermas; i++) {
    const lineas = rnd() < 0.3 ? 2 : 1
    const elegidos = new Set()
    const items = []
    for (let l = 0; l < lineas; l++) {
      const ref = elegirPonderado(Object.keys(MERMA).filter((k) => !elegidos.has(k)), (k) => MERMA[k][0])
      elegidos.add(ref)
      const p = producto(ref)
      items.push(p ? item('producto', p, cantidadEntre(MERMA[ref]), p.costo) : item('insumo', insumo(ref), cantidadEntre(MERMA[ref]), precioInsumo(insumo(ref))))
    }
    const motivo = rnd() < 0.65 ? 'Vencido' : elegir(MOTIVOS_MERMA)
    mermas.push({ id: id++, fecha: iso, motivo, items, monto: totalItems(items) })
  }
}

export const ordenarRecientes = (a, b) => (a.fecha < b.fecha ? 1 : a.fecha > b.fecha ? -1 : b.id - a.id)

egresos.sort(ordenarRecientes)

export const MOCK = {
  ingresos: ingresos.sort(ordenarRecientes),
  egresos,
  mermas: mermas.sort(ordenarRecientes),
  productos: PRODUCTOS.map((p) => ({ ...p, historial: [] })),
  // El precio de cada insumo en el catálogo es el de su última compra
  insumos: INSUMOS.map((p) => ({ ...p, precio: egresos.flatMap((e) => e.items ?? []).find((i) => i.id === p.id)?.precio ?? p.precio })),
  promos: PROMOS,
  siguienteId: id,
}
