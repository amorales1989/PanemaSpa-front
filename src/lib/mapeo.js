// Traducción entre la API y la forma de datos que usan las pantallas
// (la misma que tenía mock.js, para no reescribir páginas ni estadísticas).

const BASE_API = import.meta.env.VITE_API_URL ?? '/api'

// Hora "HH:MM" del registro en la zona horaria de la empresa
export function horaLocal(iso, zonaHoraria) {
  if (!iso) return ''
  return new Intl.DateTimeFormat('es-CL', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: zonaHoraria })
    .format(new Date(iso))
}

// Más reciente primero: por fecha y, dentro del día, por número correlativo
export const ordenarRecientes = (a, b) => (a.fecha < b.fecha ? 1 : a.fecha > b.fecha ? -1 : (b.numero ?? 0) - (a.numero ?? 0))

// ---------- Catálogo ----------

export const productoDesdeApi = (p) => ({
  id: p.id, codigo: p.codigo, nombre: p.nombre, categoria: p.categoria ?? 'Sin categoría', categoriaId: p.categoriaId,
  unidad: p.unidad, precio: p.precio, costo: p.costo, activo: p.activo,
  imagen: p.imagenUrl ? `${BASE_API}${p.imagenUrl}` : null,
})

export const insumoDesdeApi = (i) => ({
  id: i.id, codigo: i.codigo, nombre: i.nombre, categoria: i.categoria ?? 'Sin categoría', categoriaId: i.categoriaId,
  unidad: i.unidad, precio: i.precio, activo: i.activo,
})

export const promoDesdeApi = (p) => ({
  id: p.id, codigo: p.codigo, nombre: p.nombre, precio: p.precio, activa: p.activa,
  productos: p.productos.map((c) => ({ id: c.productoId, cantidad: c.cantidad })),
})

// ---------- Movimientos ----------

// La API guarda la cantidad de cada componente ya multiplicada por las promos vendidas;
// el front la usa "por promo" (expandir() la vuelve a multiplicar)
const lineaDesdeApi = (i) => ({
  tipo: i.tipo, id: i.id, codigo: i.codigo, nombre: i.nombre, unidad: i.unidad, cantidad: i.cantidad, precio: i.precio,
  ...(i.tipo === 'promo' && {
    componentes: (i.componentes ?? []).map((c) => ({
      tipo: 'producto', id: c.id, nombre: c.nombre, unidad: c.unidad, cantidad: c.cantidad / i.cantidad, precio: c.precio,
    })),
  }),
})

export const ventaDesdeApi = (v, zonaHoraria) => ({
  id: v.id, numero: v.numero, fecha: v.fecha, hora: horaLocal(v.ocurridoEn, zonaHoraria),
  categoria: v.canal, metodo: v.metodoPago, items: v.items.map(lineaDesdeApi), monto: v.total,
  usuario: v.usuario, usuarioId: v.usuarioId,
})

export const egresoDesdeApi = (e) => ({
  id: e.id, numero: e.numero, fecha: e.fecha, categoria: e.categoria, descripcion: e.descripcion,
  proveedor: e.proveedor ?? undefined, metodo: e.metodoPago,
  // Los gastos sin insumos (sueldos, arriendo) no llevan líneas
  items: e.items.length ? e.items.map(lineaDesdeApi) : undefined,
  monto: e.total, usuario: e.usuario,
})

export const mermaDesdeApi = (m) => ({
  id: m.id, numero: m.numero, fecha: m.fecha, motivo: m.motivo, items: m.items.map(lineaDesdeApi), monto: m.total,
  usuario: m.usuario,
})

// ---------- Hacia la API ----------

const idPorNombre = (lista, nombre, que) => {
  const x = lista.find((o) => o.nombre === nombre)
  if (!x) throw new Error(`No se encontró ${que} "${nombre}"`)
  return x.id
}

// `config` = respuesta de /config. Solo se manda la fecha si no es hoy.
export function ventaHaciaApi(item, config, hoyIso, puedeCambiarPrecio) {
  return {
    canalId: idPorNombre(config.canales, item.categoria, 'el canal'),
    metodoPagoId: idPorNombre(config.metodosPago, item.metodo, 'el medio de pago'),
    ...(item.fecha !== hoyIso && { fecha: item.fecha }),
    items: item.items.map((i) => ({
      ...(i.tipo === 'promo' ? { promoId: i.id } : { productoId: i.id }),
      cantidad: i.cantidad,
      // Sin permiso para cambiar precios, el servidor usa el del catálogo
      ...(puedeCambiarPrecio && { precio: i.precio }),
    })),
  }
}

export function egresoHaciaApi(item, config, hoyIso) {
  return {
    categoriaId: idPorNombre(config.categorias.egreso, item.categoria, 'la categoría'),
    metodoPagoId: idPorNombre(config.metodosPago, item.metodo, 'el medio de pago'),
    ...(item.fecha !== hoyIso && { fecha: item.fecha }),
    ...(item.proveedor && { proveedor: item.proveedor }),
    ...(item.descripcion && { descripcion: item.descripcion }),
    ...(item.items?.length
      ? { items: item.items.map((i) => ({ insumoId: i.id, cantidad: i.cantidad, precio: i.precio })) }
      : { monto: item.monto }),
  }
}

export function mermaHaciaApi(item, config, hoyIso) {
  return {
    motivoId: idPorNombre(config.motivosMerma, item.motivo, 'el motivo'),
    ...(item.fecha !== hoyIso && { fecha: item.fecha }),
    items: item.items.map((i) => ({ ...(i.tipo === 'insumo' ? { insumoId: i.id } : { productoId: i.id }), cantidad: i.cantidad })),
  }
}
