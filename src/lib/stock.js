// Control de stock (opcional por empresa).
// Los productos con receta no llevan stock propio: al venderlos se descuentan sus insumos.

import { fmtNum } from './items'

export const llevaStock = (item) => !item.receta?.length

// En o bajo el mínimo configurado
export const porReponer = (item) => llevaStock(item) && item.stockMinimo != null && item.stock <= item.stockMinimo

export const cantStock = (n, unidad) => `${fmtNum(Math.round(n * 1000) / 1000)} ${unidad}`

export const ORIGENES = {
  venta: 'Venta', compra: 'Compra', merma: 'Merma', reposicion: 'Reposición', conteo: 'Conteo',
}
