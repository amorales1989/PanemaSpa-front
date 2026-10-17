// Arma el contenido de cada informe PDF como una lista de bloques
// (indicadores, gráficos, rankings, tablas, notas) que luego dibuja Documento.jsx.

import { rango, enRango, suma, PERIODOS } from '../context/DataContext'
import { agrupar, agruparItemsPorCategoria, serie, porMes, porDiaSemana, notaDiasCerrados, topItems, statsProductos, statsInsumos, statsPromos } from '../lib/stats'
import { dinero, porcentaje, fechaCorta, desdeIso, etiquetaDia } from '../lib/format'
import { fmtNum, resumenItems, precioNormal } from '../lib/items'

export const REPORTES = [
  { id: 'completo', titulo: 'Informe completo del negocio', descripcion: 'Todo junto: resumen, ventas, egresos, merma, productos, insumos, promos y estadísticas.' },
  { id: 'resumen', titulo: 'Resumen del negocio', descripcion: 'Indicadores clave, comparación con el período anterior y lo más importante.' },
  { id: 'ventas', titulo: 'Informe de ventas', descripcion: 'Ventas por día, canal, medio de pago y productos más vendidos.' },
  { id: 'egresos', titulo: 'Informe de egresos', descripcion: 'Gastos por categoría, compras por proveedor, insumos y detalle.' },
  { id: 'merma', titulo: 'Informe de merma', descripcion: 'Pérdidas por motivo y categoría, lo que más se pierde y detalle.' },
  { id: 'productos', titulo: 'Informe de productos', descripcion: 'Cada producto: unidades vendidas, ventas, margen estimado y merma.' },
  { id: 'insumos', titulo: 'Informe de insumos', descripcion: 'Cada insumo: cantidades compradas, gasto, compras y evolución de precios.' },
  { id: 'promos', titulo: 'Informe de promos', descripcion: 'Cada promo con su precio, descuento y cuánto se vendió.' },
  { id: 'estadisticas', titulo: 'Estadísticas', descripcion: 'Resultado mes a mes, márgenes, mejores días y evolución de la merma.' },
]

export const COLORES = { ingresos: '#2f7d5b', egresos: '#c2513f', merma: '#c97a1c', marca: '#3b2a20' }

const delta = (actual, anterior) => (anterior ? ((actual - anterior) / Math.abs(anterior)) * 100 : null)
const cant = (n, unidad) => `${fmtNum(Math.round(n * 10) / 10)} ${unidad}`
const pct = (parte, total) => (total ? porcentaje((parte / total) * 100, 0) : '—')

// Contexto común: registros del período actual y del anterior
function contexto(datos, periodoId) {
  const r = rango(periodoId)
  const en = (l, prev) => enRango(l, prev ? r.prevDesde : r.desde, prev ? r.prevHasta : r.hasta)
  const ctx = {
    datos, r, periodo: PERIODOS.find((p) => p.id === periodoId),
    ing: en(datos.ingresos), egr: en(datos.egresos), mer: en(datos.mermas),
    pIng: en(datos.ingresos, true), pEgr: en(datos.egresos, true), pMer: en(datos.mermas, true),
  }
  ctx.t = { ing: suma(ctx.ing), egr: suma(ctx.egr), mer: suma(ctx.mer) }
  ctx.p = { ing: suma(ctx.pIng), egr: suma(ctx.pEgr), mer: suma(ctx.pMer) }
  ctx.t.gan = ctx.t.ing - ctx.t.egr - ctx.t.mer
  ctx.p.gan = ctx.p.ing - ctx.p.egr - ctx.p.mer
  return ctx
}

const graficoTramos = (ctx) => ({
  tipo: 'barras',
  titulo: 'Ingresos vs egresos',
  sub: ctx.periodo.dias <= 7 ? 'Por día' : ctx.periodo.dias <= 90 ? 'Por semana' : 'Cada 2 semanas',
  series: [{ clave: 'ingresos', nombre: 'Ingresos', color: COLORES.ingresos }, { clave: 'egresos', nombre: 'Egresos', color: COLORES.egresos }],
  datos: serie({ ingresos: ctx.ing, egresos: ctx.egr, ...ctx.r }),
})

// ---------- Secciones ----------

function resumen(ctx) {
  const { t, p } = ctx
  const dias = porDiaSemana(ctx.ing).filter((d) => d.ingresos > 0)
  const mejorDia = dias.reduce((a, b) => (b.ingresos > a.ingresos ? b : a), dias[0] ?? { label: '—', ingresos: 0 })
  const top = topItems(ctx.ing, 8, 'producto')
  const gastos = agrupar(ctx.egr, 'categoria')
  const insumos = statsInsumos(ctx.egr, [], ctx.datos.insumos).filter((x) => x.compras.length > 1).sort((a, b) => b.variacion - a.variacion)
  const pctMerma = t.ing ? (t.mer / t.ing) * 100 : 0
  const dVentas = delta(t.ing, p.ing)

  return [
    { tipo: 'seccion', titulo: 'Resumen del negocio', sub: 'Los números clave del período y cómo se comparan con el período anterior.' },
    {
      tipo: 'kpis', items: [
        { label: 'Ganancia', valor: dinero(t.gan), delta: delta(t.gan, p.gan), destacado: true },
        { label: 'Ingresos', valor: dinero(t.ing), delta: dVentas },
        { label: 'Egresos', valor: dinero(t.egr), delta: delta(t.egr, p.egr), subirEsMalo: true },
        { label: 'Merma', valor: dinero(t.mer), delta: delta(t.mer, p.mer), subirEsMalo: true },
      ],
    },
    {
      tipo: 'kpis', chico: true, items: [
        { label: 'Ventas realizadas', valor: ctx.ing.length.toLocaleString('es-CL') },
        { label: 'Ticket promedio', valor: dinero(ctx.ing.length ? t.ing / ctx.ing.length : 0) },
        { label: 'Margen', valor: porcentaje(t.ing ? (t.gan / t.ing) * 100 : 0) },
        { label: 'Merma sobre ventas', valor: porcentaje(pctMerma) },
      ],
    },
    {
      tipo: 'puntos', titulo: 'Lo más importante', items: [
        dVentas !== null && `Las ventas ${dVentas >= 0 ? 'subieron' : 'bajaron'} ${porcentaje(Math.abs(dVentas), 0)} respecto al período anterior.`,
        top[0] && `El producto que más vendió fue ${top[0].nombre}: ${dinero(top[0].valor)} (${pct(top[0].valor, t.ing)} de las ventas).`,
        mejorDia.ingresos > 0 && `El mejor día de la semana es el ${mejorDia.label.toLowerCase()}, con una venta promedio de ${dinero(mejorDia.ingresos)}.`,
        gastos[0] && `El mayor gasto fue ${gastos[0].nombre.toLowerCase()}: ${dinero(gastos[0].valor)} (${pct(gastos[0].valor, t.egr)} de los egresos).`,
        `La merma fue el ${porcentaje(pctMerma)} de las ventas, ${pctMerma > 2 ? 'sobre' : 'bajo'} la meta del 2%.`,
        insumos[0]?.variacion > 1 && `El insumo que más subió de precio fue ${insumos[0].nombre} (+${porcentaje(insumos[0].variacion)} en el período).`,
      ].filter(Boolean),
    },
    graficoTramos(ctx),
    {
      tipo: 'dos',
      bloques: [
        { tipo: 'ranking', titulo: 'Ventas por canal', items: agrupar(ctx.ing, 'categoria'), total: t.ing, color: COLORES.ingresos },
        { tipo: 'ranking', titulo: '¿En qué se va la plata?', items: gastos.slice(0, 6), total: t.egr, color: COLORES.egresos },
      ],
    },
    { tipo: 'ranking', titulo: 'Productos más vendidos', items: top.map((x) => ({ nombre: x.nombre, valor: x.valor, extra: cant(x.cantidad, x.unidad) })), total: t.ing, color: COLORES.ingresos },
  ]
}

function ventas(ctx) {
  const { t, p } = ctx
  const porDia = {}
  for (const v of ctx.ing) {
    porDia[v.fecha] ??= { n: 0, total: 0 }
    porDia[v.fecha].n++
    porDia[v.fecha].total += v.monto
  }
  const top = topItems(ctx.ing, 15, 'producto')
  return [
    { tipo: 'seccion', titulo: 'Ventas', sub: 'Cuánto se vendió, cuándo, por qué canal y qué productos.' },
    {
      tipo: 'kpis', items: [
        { label: 'Total vendido', valor: dinero(t.ing), delta: delta(t.ing, p.ing), destacado: true },
        { label: 'Ventas realizadas', valor: ctx.ing.length.toLocaleString('es-CL'), delta: delta(ctx.ing.length, ctx.pIng.length) },
        { label: 'Ticket promedio', valor: dinero(ctx.ing.length ? t.ing / ctx.ing.length : 0) },
        { label: 'Promedio por día', valor: dinero(t.ing / ctx.periodo.dias) },
      ],
    },
    {
      tipo: 'barras', titulo: 'Venta promedio por día de la semana', sub: notaDiasCerrados(porDiaSemana(ctx.ing)) ?? undefined,
      series: [{ clave: 'ingresos', nombre: 'Venta promedio', color: COLORES.ingresos }], datos: porDiaSemana(ctx.ing),
    },
    {
      tipo: 'dos',
      bloques: [
        { tipo: 'ranking', titulo: 'Por canal', items: agrupar(ctx.ing, 'categoria'), total: t.ing, color: COLORES.ingresos },
        { tipo: 'ranking', titulo: 'Por medio de pago', items: agrupar(ctx.ing, 'metodo'), total: t.ing, color: COLORES.marca },
      ],
    },
    {
      tipo: 'tabla', titulo: 'Productos más vendidos',
      columnas: [{ t: 'Código', w: 12 }, { t: 'Producto', w: 40 }, { t: 'Cantidad', w: 16, num: true }, { t: 'Ventas', w: 18, num: true }, { t: '% del total', w: 14, num: true }],
      filas: top.map((x) => [`#${ctx.datos.productos.find((p) => p.id === x.id)?.codigo ?? ''}`, x.nombre, cant(x.cantidad, x.unidad), dinero(x.valor), pct(x.valor, t.ing)]),
    },
    {
      tipo: 'tabla', titulo: 'Ventas por día',
      columnas: [{ t: 'Día', w: 34 }, { t: 'N° de ventas', w: 20, num: true }, { t: 'Ticket promedio', w: 22, num: true }, { t: 'Total', w: 24, num: true }],
      filas: Object.entries(porDia).sort((a, b) => (a[0] < b[0] ? 1 : -1)).map(([f, d]) => [etiquetaDia(f, ctx.datos.hoy), d.n, dinero(d.total / d.n), dinero(d.total)]),
      total: ['Total', ctx.ing.length.toLocaleString('es-CL'), dinero(ctx.ing.length ? t.ing / ctx.ing.length : 0), dinero(t.ing)],
    },
  ]
}

function egresos(ctx) {
  const { t, p } = ctx
  const compras = ctx.egr.filter((e) => e.items)
  const fijos = ctx.egr.filter((e) => ['Sueldos', 'Arriendo', 'Servicios'].includes(e.categoria))
  const proveedores = {}
  for (const c of compras) {
    proveedores[c.proveedor || 'Sin proveedor'] ??= { n: 0, total: 0 }
    proveedores[c.proveedor || 'Sin proveedor'].n++
    proveedores[c.proveedor || 'Sin proveedor'].total += c.monto
  }
  const insumos = statsInsumos(ctx.egr, [], ctx.datos.insumos).filter((x) => x.gasto > 0).sort((a, b) => b.gasto - a.gasto)
  return [
    { tipo: 'seccion', titulo: 'Egresos', sub: 'En qué se gastó: compras de insumos, sueldos, arriendo y otros gastos.' },
    {
      tipo: 'kpis', items: [
        { label: 'Total egresos', valor: dinero(t.egr), delta: delta(t.egr, p.egr), subirEsMalo: true, destacado: true },
        { label: 'Compras de insumos', valor: dinero(suma(compras)), delta: delta(suma(compras), suma(ctx.pEgr.filter((e) => e.items))), subirEsMalo: true },
        { label: 'Gastos fijos', valor: dinero(suma(fijos)) },
        { label: 'Registros', valor: ctx.egr.length.toLocaleString('es-CL') },
      ],
    },
    {
      tipo: 'dos',
      bloques: [
        { tipo: 'ranking', titulo: 'Por categoría', items: agrupar(ctx.egr, 'categoria'), total: t.egr, color: COLORES.egresos },
        { tipo: 'ranking', titulo: 'Compras por proveedor', items: Object.entries(proveedores).map(([nombre, d]) => ({ nombre, valor: d.total, extra: `${d.n} compras` })).sort((a, b) => b.valor - a.valor), total: suma(compras), color: COLORES.marca },
      ],
    },
    {
      tipo: 'tabla', titulo: 'Insumos comprados',
      columnas: [{ t: 'Código', w: 11 }, { t: 'Insumo', w: 33 }, { t: 'Cantidad', w: 16, num: true }, { t: 'Precio prom.', w: 14, num: true }, { t: 'Var. precio', w: 12, num: true }, { t: 'Gasto', w: 14, num: true }],
      filas: insumos.map((x) => [`#${x.codigo}`, x.nombre, cant(x.comprado, x.unidad), dinero(x.precioProm), `${x.variacion >= 0 ? '+' : '-'}${porcentaje(Math.abs(x.variacion))}`, dinero(x.gasto)]),
      total: ['', 'Total', '', '', '', dinero(suma(compras))],
    },
    {
      tipo: 'tabla', titulo: 'Detalle de egresos',
      columnas: [{ t: 'Fecha', w: 14 }, { t: 'Categoría', w: 15 }, { t: 'Detalle', w: 41 }, { t: 'Medio', w: 14 }, { t: 'Monto', w: 16, num: true }],
      filas: ctx.egr.map((e) => [fechaCorta(e.fecha), e.categoria, e.items ? `${e.descripcion}: ${resumenItems(e.items)}` : e.descripcion, e.metodo, dinero(e.monto)]),
      total: ['', '', 'Total', '', dinero(t.egr)],
    },
  ]
}

function merma(ctx) {
  const { t, p } = ctx
  const pctMerma = t.ing ? (t.mer / t.ing) * 100 : 0
  const top = topItems(ctx.mer, 12)
  return [
    { tipo: 'seccion', titulo: 'Merma', sub: 'Mercadería vencida, dañada o que sobró: cuánto se perdió y en qué.' },
    {
      tipo: 'kpis', items: [
        { label: 'Pérdida total', valor: dinero(t.mer), delta: delta(t.mer, p.mer), subirEsMalo: true, destacado: true },
        { label: 'Sobre las ventas', valor: porcentaje(pctMerma), nota: pctMerma > 2 ? 'Sobre la meta del 2%' : 'Bajo la meta del 2%' },
        { label: 'Registros', valor: ctx.mer.length.toLocaleString('es-CL') },
        { label: 'Promedio por día', valor: dinero(t.mer / ctx.periodo.dias) },
      ],
    },
    {
      tipo: 'dos',
      bloques: [
        { tipo: 'ranking', titulo: 'Por motivo', items: agrupar(ctx.mer, 'motivo'), total: t.mer, color: COLORES.merma },
        { tipo: 'ranking', titulo: 'Por categoría', items: agruparItemsPorCategoria(ctx.mer, ctx.datos.productos, ctx.datos.insumos), total: t.mer, color: COLORES.merma },
      ],
    },
    {
      tipo: 'tabla', titulo: 'Lo que más se pierde',
      columnas: [{ t: 'Tipo', w: 14 }, { t: 'Producto / insumo', w: 44 }, { t: 'Cantidad', w: 20, num: true }, { t: 'Pérdida', w: 22, num: true }],
      filas: top.map((x) => [x.tipo === 'producto' ? 'Producto' : 'Insumo', x.nombre, cant(x.cantidad, x.unidad), dinero(x.valor)]),
    },
    {
      tipo: 'tabla', titulo: 'Detalle de merma',
      columnas: [{ t: 'Fecha', w: 15 }, { t: 'Qué se perdió', w: 53 }, { t: 'Motivo', w: 16 }, { t: 'Pérdida', w: 16, num: true }],
      filas: ctx.mer.map((m) => [fechaCorta(m.fecha), resumenItems(m.items), m.motivo, dinero(m.monto)]),
      total: ['', 'Total', '', dinero(t.mer)],
    },
  ]
}

const flecha = (d) => (d === null ? '—' : Math.abs(d) < 0.5 ? '0%' : `${d >= 0 ? '+' : '-'}${porcentaje(Math.abs(d), 0)}`)

function productos(ctx) {
  const prev = Object.fromEntries(statsProductos(ctx.pIng, ctx.pMer, ctx.datos.productos).map((x) => [x.id, x]))
  const prods = statsProductos(ctx.ing, ctx.mer, ctx.datos.productos).sort((a, b) => b.ventas - a.ventas)
  const totalVentas = prods.reduce((s, x) => s + x.ventas, 0)
  const totalMargen = prods.reduce((s, x) => s + x.margen, 0)
  const totalMerma = prods.reduce((s, x) => s + x.merma, 0)
  const porCategoria = {}
  for (const x of prods) porCategoria[x.categoria] = (porCategoria[x.categoria] ?? 0) + x.ventas
  return [
    { tipo: 'seccion', titulo: 'Productos', sub: 'El seguimiento de cada producto que se vende: cuánto, cuánto deja y cuánto se pierde.' },
    {
      tipo: 'kpis', items: [
        { label: 'Ventas de productos', valor: dinero(totalVentas), delta: delta(totalVentas, Object.values(prev).reduce((s, x) => s + x.ventas, 0)), destacado: true },
        { label: 'Margen estimado', valor: dinero(totalMargen), nota: `${porcentaje(totalVentas ? (totalMargen / totalVentas) * 100 : 0, 0)} de las ventas` },
        { label: 'Producto estrella', valor: prods[0]?.nombre ?? '—', texto: true, nota: prods[0] ? dinero(prods[0].ventas) : null },
        { label: 'Merma de productos', valor: dinero(totalMerma), nota: `${pct(totalMerma, totalVentas)} de las ventas` },
      ],
    },
    {
      tipo: 'dos',
      bloques: [
        { tipo: 'ranking', titulo: 'Ventas por categoría', items: Object.entries(porCategoria).map(([nombre, valor]) => ({ nombre, valor })).sort((a, b) => b.valor - a.valor), total: totalVentas, color: COLORES.ingresos },
        { tipo: 'ranking', titulo: 'Los que más dejan (margen)', items: [...prods].sort((a, b) => b.margen - a.margen).slice(0, 5).map((x) => ({ nombre: x.nombre, valor: x.margen })), color: COLORES.marca },
      ],
    },
    {
      tipo: 'tabla', titulo: 'Detalle por producto',
      columnas: [{ t: 'Cód.', w: 8 }, { t: 'Producto', w: 25 }, { t: 'Precio', w: 11, num: true }, { t: 'Vendidos', w: 12, num: true }, { t: 'Ventas', w: 13, num: true }, { t: 'Margen est.', w: 12, num: true }, { t: 'Merma', w: 10, num: true }, { t: 'vs ant.', w: 9, num: true }],
      filas: prods.map((x) => [`#${x.codigo}`, x.nombre, `${dinero(x.precio)}${x.unidad !== 'un' ? '/kg' : ''}`, cant(x.vendidos, x.unidad), dinero(x.ventas), dinero(x.margen), x.merma ? dinero(x.merma) : '—', flecha(delta(x.ventas, prev[x.id]?.ventas))]),
      total: ['', 'Total', '', '', dinero(totalVentas), dinero(totalMargen), dinero(totalMerma), ''],
      nota: 'Margen estimado = ventas − (cantidad vendida × costo del producto). Incluye lo vendido dentro de promos.',
    },
  ]
}

function insumos(ctx) {
  const prev = Object.fromEntries(statsInsumos(ctx.pEgr, [], ctx.datos.insumos).map((x) => [x.id, x]))
  const ins = statsInsumos(ctx.egr, ctx.mer, ctx.datos.insumos).sort((a, b) => b.gasto - a.gasto)
  const totalGasto = ins.reduce((s, x) => s + x.gasto, 0)
  const totalMerma = ins.reduce((s, x) => s + x.merma, 0)
  const subieron = ins.filter((x) => x.compras.length > 1 && x.variacion > 0.5).sort((a, b) => b.variacion - a.variacion)
  const porCategoria = {}
  for (const x of ins) porCategoria[x.categoria] = (porCategoria[x.categoria] ?? 0) + x.gasto
  return [
    { tipo: 'seccion', titulo: 'Insumos', sub: 'El seguimiento de cada insumo que se compra: cantidades, gasto y cómo cambian sus precios.' },
    {
      tipo: 'kpis', items: [
        { label: 'Gasto en insumos', valor: dinero(totalGasto), delta: delta(totalGasto, Object.values(prev).reduce((s, x) => s + x.gasto, 0)), subirEsMalo: true, destacado: true },
        { label: 'Mayor gasto', valor: ins[0]?.nombre ?? '—', texto: true, nota: ins[0] ? `${dinero(ins[0].gasto)} · ${pct(ins[0].gasto, totalGasto)} del total` : null },
        { label: 'Más subió de precio', valor: subieron[0]?.nombre ?? '—', texto: true, nota: subieron[0] ? `+${porcentaje(subieron[0].variacion)} en el período` : 'Sin alzas' },
        { label: 'Merma de insumos', valor: dinero(totalMerma) },
      ],
    },
    {
      tipo: 'dos',
      bloques: [
        { tipo: 'ranking', titulo: 'Gasto por categoría', items: Object.entries(porCategoria).filter(([, v]) => v > 0).map(([nombre, valor]) => ({ nombre, valor })).sort((a, b) => b.valor - a.valor), total: totalGasto, color: COLORES.egresos },
        { tipo: 'ranking', titulo: 'Insumos que subieron de precio', items: subieron.slice(0, 5).map((x) => ({ nombre: x.nombre, valor: x.ultimo, extra: `+${porcentaje(x.variacion)}` })), color: COLORES.merma },
      ],
    },
    {
      tipo: 'tabla', titulo: 'Detalle por insumo',
      columnas: [{ t: 'Cód.', w: 8 }, { t: 'Insumo', w: 22 }, { t: 'Comprado', w: 12, num: true }, { t: 'Compras', w: 9, num: true }, { t: 'Gasto', w: 13, num: true }, { t: 'Último precio', w: 14, num: true }, { t: 'Var. precio', w: 11, num: true }, { t: 'Merma', w: 11, num: true }],
      filas: ins.map((x) => [`#${x.codigo}`, x.nombre, cant(x.comprado, x.unidad), x.compras.length, dinero(x.gasto), `${dinero(x.precio)}/${x.unidad}`, flecha(x.compras.length > 1 ? x.variacion : null), x.merma ? dinero(x.merma) : '—']),
      total: ['', 'Total', '', ins.reduce((s, x) => s + x.compras.length, 0), dinero(totalGasto), '', '', dinero(totalMerma)],
      nota: 'Variación de precio = diferencia entre la primera y la última compra del período.',
    },
  ]
}

function promos(ctx) {
  const v = statsPromos(ctx.ing)
  const lista = [...ctx.datos.promos].sort((a, b) => (v[b.id]?.ingresos ?? 0) - (v[a.id]?.ingresos ?? 0))
  const total = Object.values(v).reduce((s, x) => s + x.ingresos, 0)
  return [
    { tipo: 'seccion', titulo: 'Promos', sub: 'Qué incluye cada promo, su descuento y cuánto se vendió en el período.' },
    {
      tipo: 'kpis', items: [
        { label: 'Vendido en promos', valor: dinero(total), destacado: true },
        { label: 'Promos vendidas', valor: fmtNum(Object.values(v).reduce((s, x) => s + x.vendidas, 0)) },
        { label: 'Del total de ventas', valor: pct(total, ctx.t.ing) },
        { label: 'Promos activas', valor: `${ctx.datos.promos.filter((x) => x.activa).length} de ${ctx.datos.promos.length}` },
      ],
    },
    {
      tipo: 'tabla', titulo: 'Detalle por promo',
      columnas: [{ t: 'Cód.', w: 8 }, { t: 'Promo', w: 30 }, { t: 'Normal', w: 11, num: true }, { t: 'Promo', w: 11, num: true }, { t: 'Desc.', w: 8, num: true }, { t: 'Estado', w: 10 }, { t: 'Vendidas', w: 10, num: true }, { t: 'Ingresos', w: 12, num: true }],
      filas: lista.map((x) => {
        const normal = precioNormal(x, ctx.datos.productos)
        const incluye = x.productos.map((c) => `${fmtNum(c.cantidad)}× ${ctx.datos.productos.find((p) => p.id === c.id)?.nombre}`).join(', ')
        return [`#${x.codigo}`, `${x.nombre}\n${incluye}`, dinero(normal), dinero(x.precio), normal ? `${Math.round(((normal - x.precio) / normal) * 100)}%` : '—', x.activa ? 'Activa' : 'Pausada', fmtNum(v[x.id]?.vendidas ?? 0), dinero(v[x.id]?.ingresos ?? 0)]
      }),
      total: ['', 'Total', '', '', '', '', '', dinero(total)],
    },
  ]
}

function estadisticas(ctx) {
  const meses = porMes({ ingresos: ctx.datos.ingresos, egresos: ctx.datos.egresos, mermas: ctx.datos.mermas, hoy: ctx.datos.hoy, n: 6 })
  const cerrados = meses.slice(0, -1)
  const margen = cerrados.reduce((s, m) => s + m.ganancia, 0) / Math.max(1, cerrados.reduce((s, m) => s + m.ingresos, 0)) * 100
  return [
    { tipo: 'seccion', titulo: 'Estadísticas', sub: 'Cómo se mueve el negocio mes a mes (últimos 6 meses, sin importar el período elegido).' },
    {
      tipo: 'kpis', items: [
        { label: 'Margen promedio', valor: porcentaje(margen), nota: 'Últimos 5 meses cerrados', destacado: true },
        { label: 'Mejor mes', valor: cerrados.reduce((a, b) => (b.ganancia > a.ganancia ? b : a)).label, nota: 'Por ganancia', texto: true },
        { label: 'Ingreso mensual prom.', valor: dinero(cerrados.reduce((s, m) => s + m.ingresos, 0) / cerrados.length) },
        { label: 'Merma prom. s/ventas', valor: porcentaje(cerrados.reduce((s, m) => s + m.pct, 0) / cerrados.length) },
      ],
    },
    {
      tipo: 'barras', titulo: 'Resultado por mes', sub: '* Mes en curso',
      series: [{ clave: 'ingresos', nombre: 'Ingresos', color: COLORES.ingresos }, { clave: 'egresos', nombre: 'Egresos', color: COLORES.egresos }, { clave: 'ganancia', nombre: 'Ganancia', color: COLORES.marca }],
      datos: meses,
    },
    {
      tipo: 'tabla', titulo: 'Mes a mes',
      columnas: [{ t: 'Mes', w: 12 }, { t: 'Ingresos', w: 17, num: true }, { t: 'Egresos', w: 17, num: true }, { t: 'Merma', w: 14, num: true }, { t: 'Ganancia', w: 16, num: true }, { t: 'Margen', w: 12, num: true }, { t: 'Merma %', w: 12, num: true }],
      filas: meses.map((m) => [m.label, dinero(m.ingresos), dinero(m.egresos), dinero(m.merma), dinero(m.ganancia), m.ingresos ? porcentaje((m.ganancia / m.ingresos) * 100) : '—', porcentaje(m.pct)]),
    },
    {
      tipo: 'barras', titulo: 'Venta promedio por día de la semana', sub: `Período: ${ctx.periodo.label}`,
      series: [{ clave: 'ingresos', nombre: 'Venta promedio', color: COLORES.ingresos }], datos: porDiaSemana(ctx.ing),
    },
  ]
}

const SECCIONES = { resumen, ventas, egresos, merma, productos, insumos, promos, estadisticas }

export function construirReporte(tipo, datos, periodoId) {
  const ctx = contexto(datos, periodoId)
  const info = REPORTES.find((x) => x.id === tipo)
  const partes = tipo === 'completo'
    ? ['resumen', 'ventas', 'egresos', 'merma', 'productos', 'insumos', 'promos', 'estadisticas'].map((s) => SECCIONES[s](ctx))
    : [SECCIONES[tipo](ctx)]
  const anio = desdeIso(ctx.r.hasta).getFullYear()
  return {
    titulo: info.titulo,
    periodo: `Últimos ${ctx.periodo.label} · ${fechaCorta(ctx.r.desde)} al ${fechaCorta(ctx.r.hasta)} ${anio}`,
    generado: new Intl.DateTimeFormat('es-CL', { dateStyle: 'long' }).format(new Date()),
    partes,
    archivo: `panema-${tipo}-${ctx.r.desde}_al_${ctx.r.hasta}.pdf`,
  }
}
