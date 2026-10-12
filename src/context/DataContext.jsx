import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { api } from '../lib/api'
import { useAuth } from './AuthContext'
import { masFrecuentes, componentesPromo, precioNormal } from '../lib/items'
import { isoLocal } from '../lib/format'
import {
  egresoDesdeApi, egresoHaciaApi, insumoDesdeApi, mermaDesdeApi, mermaHaciaApi, ordenarRecientes,
  productoDesdeApi, promoDesdeApi, ventaDesdeApi, ventaHaciaApi,
} from '../lib/mapeo'

const DataContext = createContext(null)

export const PERIODOS = [
  { id: '7d', label: '7 días', dias: 7 },
  { id: '30d', label: '30 días', dias: 30 },
  { id: '90d', label: '3 meses', dias: 90 },
  { id: '180d', label: '6 meses', dias: 180 },
]

// Hoy a las 00:00 (fecha del negocio en este dispositivo)
const hoyFecha = () => {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d
}

// Devuelve el rango del período y el período anterior equivalente (para comparar)
export function rango(periodoId) {
  const { dias } = PERIODOS.find((p) => p.id === periodoId)
  const menos = (n) => {
    const d = hoyFecha()
    d.setDate(d.getDate() - n)
    return isoLocal(d)
  }
  return { desde: menos(dias - 1), hasta: isoLocal(hoyFecha()), prevDesde: menos(dias * 2 - 1), prevHasta: menos(dias) }
}

export const enRango = (lista, desde, hasta) => lista.filter((x) => x.fecha >= desde && x.fecha <= hasta)
export const suma = (lista) => lista.reduce((t, x) => t + x.monto, 0)

// Las estadísticas comparan hasta 6 meses contra los 6 anteriores: se carga un año de movimientos.
// (Cuando el volumen crezca, las estadísticas pasan a calcularse en el servidor — Fase 5.)
const DIAS_HISTORIAL = 366
const POR_PAGINA = 1000

async function traerTodo(ruta, desde) {
  const filas = []
  let cursor = null
  do {
    const q = new URLSearchParams({ desde, limite: POR_PAGINA, ...(cursor && { cursor }) })
    const pagina = await api(`${ruta}?${q}`)
    filas.push(...pagina.datos)
    cursor = pagina.siguiente
  } while (cursor)
  return filas
}

// Copia de un objeto sin una clave
const sin = (obj, clave) => Object.fromEntries(Object.entries(obj).filter(([k]) => k !== clave))

const mensajeDe = (e) => Object.values(e.detalles ?? {})[0]?.[0] ?? e.message

export function DataProvider({ children }) {
  const { empresa, puede } = useAuth()
  const [datos, setDatos] = useState(null)
  const [config, setConfig] = useState(null)
  const [error, setError] = useState(null)
  const [toast, setToast] = useState(null)
  const [exito, setExito] = useState(null)
  // Fotos de productos nuevos que todavía no se guardan: { [idTemporal]: dataURL }
  const [fotosPendientes, setFotosPendientes] = useState({})
  const zona = empresa?.zonaHoraria
  const hoy = hoyFecha()
  const hoyIso = isoLocal(hoy)

  const cargar = useCallback(async () => {
    setError(null)
    try {
      const desde = (() => { const d = hoyFecha(); d.setDate(d.getDate() - DIAS_HISTORIAL); return isoLocal(d) })()
      const si = (permitido, fn) => (permitido ? fn() : Promise.resolve([]))
      const [cfg, productos, insumos, promos, ventas, egresos, mermas] = await Promise.all([
        api('/config'),
        si(puede('productos.ver'), () => api('/productos')),
        si(puede('insumos.ver'), () => api('/insumos')),
        si(puede('promos.ver'), () => api('/promos?incluirInactivos=true')),
        si(puede('ventas.ver', 'ventas.ver_todas'), () => traerTodo('/ventas', desde)),
        si(puede('egresos.ver'), () => traerTodo('/egresos', desde)),
        si(puede('mermas.ver'), () => traerTodo('/mermas', desde)),
      ])
      setConfig(cfg)
      setDatos({
        productos: productos.map(productoDesdeApi),
        insumos: insumos.map(insumoDesdeApi),
        promos: promos.map(promoDesdeApi),
        ingresos: ventas.map((v) => ventaDesdeApi(v, zona)).sort(ordenarRecientes),
        egresos: egresos.map(egresoDesdeApi).sort(ordenarRecientes),
        mermas: mermas.map(mermaDesdeApi).sort(ordenarRecientes),
      })
    } catch (e) {
      setError(mensajeDe(e))
    }
  }, [puede, zona])

  useEffect(() => { cargar() }, [cargar])

  const avisar = useCallback((mensaje) => {
    setToast(mensaje)
    setTimeout(() => setToast(null), 2600)
  }, [])

  const actualizar = (clave, fn) => setDatos((d) => ({ ...d, [clave]: fn(d[clave]) }))

  // ---------- Movimientos ----------

  // Devuelve una promesa: el formulario espera la respuesta para cerrarse o mostrar el error
  const agregar = useCallback(async (tipo, item) => {
    const clave = { 'Idempotency-Key': crypto.randomUUID() }
    try {
      if (tipo === 'ingresos') {
        const v = await api('/ventas', { metodo: 'POST', body: ventaHaciaApi(item, config, hoyIso, puede('ventas.modificar_precio')), headers: clave })
        actualizar('ingresos', (l) => [ventaDesdeApi(v, zona), ...l].sort(ordenarRecientes))
        const marca = Date.now()
        setExito({ clave: marca, monto: v.total })
        setTimeout(() => setExito((e) => (e?.clave === marca ? null : e)), 1800)
        return
      }
      if (tipo === 'egresos') {
        const e = await api('/egresos', { metodo: 'POST', body: egresoHaciaApi(item, config, hoyIso), headers: clave })
        if (puede('egresos.ver')) actualizar('egresos', (l) => [egresoDesdeApi(e), ...l].sort(ordenarRecientes))
        // La compra actualizó el precio de los insumos: se refrescan
        if (e.items.length && puede('insumos.ver')) {
          const insumos = await api('/insumos')
          actualizar('insumos', () => insumos.map(insumoDesdeApi))
        }
        avisar('Egreso registrado')
        return
      }
      const m = await api('/mermas', { metodo: 'POST', body: mermaHaciaApi(item, config, hoyIso), headers: clave })
      if (puede('mermas.ver')) actualizar('mermas', (l) => [mermaDesdeApi(m), ...l].sort(ordenarRecientes))
      avisar('Merma registrada')
    } catch (e) {
      throw new Error(mensajeDe(e))
    }
  }, [config, hoyIso, puede, zona, avisar])

  // Los movimientos no se borran: se anulan (queda el registro de quién y por qué)
  const anular = useCallback(async (tipo, id, motivo) => {
    const ruta = { ingresos: 'ventas', egresos: 'egresos', mermas: 'mermas' }[tipo]
    try {
      await api(`/${ruta}/${id}/anular`, { metodo: 'POST', body: { motivo } })
    } catch (e) {
      throw new Error(mensajeDe(e))
    }
    actualizar(tipo, (l) => l.filter((x) => x.id !== id))
    avisar('Registro anulado')
  }, [avisar])

  // ---------- Catálogo ----------

  const guardarPromo = useCallback(async (promo) => {
    const existe = datos.promos.some((p) => p.id === promo.id)
    const cuerpo = {
      codigo: promo.codigo, nombre: promo.nombre, precio: promo.precio, activa: promo.activa,
      productos: promo.productos.map((c) => ({ productoId: c.id, cantidad: c.cantidad })),
    }
    try {
      const r = await api(existe ? `/promos/${promo.id}` : '/promos', { metodo: existe ? 'PATCH' : 'POST', body: cuerpo })
      const nueva = promoDesdeApi(r)
      actualizar('promos', (l) => (existe ? l.map((p) => (p.id === promo.id ? nueva : p)) : [...l, nueva]))
      avisar('Promo guardada')
    } catch (e) {
      avisar(`No se pudo guardar: ${mensajeDe(e)}`)
      throw e
    }
  }, [datos, avisar])

  const eliminarPromo = useCallback(async (id) => {
    try {
      await api(`/promos/${id}`, { metodo: 'DELETE' })
      actualizar('promos', (l) => l.filter((p) => p.id !== id))
    } catch (e) {
      avisar(`No se pudo eliminar: ${mensajeDe(e)}`)
    }
  }, [avisar])

  const subirFoto = async (productoId, dataUrl) => {
    if (dataUrl) {
      const { imagenUrl } = await api(`/productos/${productoId}/imagen`, { metodo: 'PUT', body: { imagen: dataUrl } })
      return productoDesdeApi({ imagenUrl }).imagen
    }
    await api(`/productos/${productoId}/imagen`, { metodo: 'DELETE' })
    return null
  }

  // Crea o actualiza. El historial de precios lo anota el servidor.
  const guardarProducto = useCallback(async (producto) => {
    const existe = datos.productos.some((p) => p.id === producto.id)
    const cuerpo = {
      codigo: producto.codigo, nombre: producto.nombre, categoria: producto.categoria, unidad: producto.unidad,
      precio: producto.precio, ...(producto.costo !== undefined && { costo: producto.costo }),
    }
    try {
      let p = productoDesdeApi(await api(existe ? `/productos/${producto.id}` : '/productos', { metodo: existe ? 'PATCH' : 'POST', body: cuerpo }))
      // Foto elegida antes de crear el producto
      if (!existe && fotosPendientes[producto.id]) {
        p = { ...p, imagen: await subirFoto(p.id, fotosPendientes[producto.id]) }
        setFotosPendientes((f) => sin(f, producto.id))
      }
      actualizar('productos', (l) => (existe ? l.map((x) => (x.id === p.id ? p : x)) : [...l, p]))
      if (producto.categoria && !config.categorias.producto.some((c) => c.nombre === producto.categoria)) {
        setConfig(await api('/config')) // se creó una categoría nueva
      }
      avisar('Producto guardado')
    } catch (e) {
      throw new Error(mensajeDe(e))
    }
  }, [datos, config, fotosPendientes, avisar])

  const guardarInsumo = useCallback(async (insumo) => {
    const existe = datos.insumos.some((p) => p.id === insumo.id)
    const cuerpo = { codigo: insumo.codigo, nombre: insumo.nombre, categoria: insumo.categoria, unidad: insumo.unidad, precio: insumo.precio }
    try {
      const i = insumoDesdeApi(await api(existe ? `/insumos/${insumo.id}` : '/insumos', { metodo: existe ? 'PATCH' : 'POST', body: cuerpo }))
      actualizar('insumos', (l) => (existe ? l.map((x) => (x.id === i.id ? i : x)) : [...l, i]))
      avisar('Insumo guardado')
    } catch (e) {
      throw new Error(mensajeDe(e))
    }
  }, [datos, avisar])

  // Se quita del catálogo; las ventas, compras y mermas ya registradas se mantienen
  const eliminarProducto = useCallback(async (id) => {
    try {
      await api(`/productos/${id}`, { metodo: 'DELETE' })
    } catch (e) {
      throw new Error(mensajeDe(e))
    }
    actualizar('productos', (l) => l.filter((p) => p.id !== id))
    avisar('Producto eliminado')
  }, [avisar])

  const eliminarInsumo = useCallback(async (id) => {
    try {
      await api(`/insumos/${id}`, { metodo: 'DELETE' })
    } catch (e) {
      throw new Error(mensajeDe(e))
    }
    actualizar('insumos', (l) => l.filter((p) => p.id !== id))
    avisar('Insumo eliminado')
  }, [avisar])

  // cambios: [{ id, precio }]. Aplica nuevos precios de venta (el servidor anota el historial).
  const ajustarPrecios = useCallback(async (cambios, motivo) => {
    try {
      await api('/productos/ajuste-precios', { metodo: 'POST', body: { cambios, motivo } })
    } catch (e) {
      avisar(`No se pudo ajustar: ${mensajeDe(e)}`)
      throw e
    }
    const nuevos = Object.fromEntries(cambios.map((c) => [c.id, c.precio]))
    actualizar('productos', (l) => l.map((p) => (nuevos[p.id] !== undefined ? { ...p, precio: nuevos[p.id] } : p)))
    avisar(cambios.length === 1 ? 'Precio actualizado' : `Precios actualizados (${cambios.length} productos)`)
  }, [avisar])

  const historialPrecios = useCallback(async (productoId) => {
    const h = await api(`/productos/${productoId}/historial-precios`)
    return h.map((x) => ({ fecha: x.createdAt.slice(0, 10), anterior: x.precioAnterior, nuevo: x.precioNuevo, motivo: x.motivo, usuario: x.usuario }))
  }, [])

  // ---------- Fotos ----------

  // { [idProducto]: url } con las guardadas + las pendientes de productos nuevos
  const imagenes = useMemo(() => {
    const m = { ...fotosPendientes }
    for (const p of datos?.productos ?? []) if (p.imagen) m[p.id] = p.imagen
    return m
  }, [datos, fotosPendientes])

  const setImagen = useCallback(async (id, src) => {
    if (!datos.productos.some((p) => p.id === id)) {
      // Producto todavía no creado: la foto se sube al guardarlo
      setFotosPendientes((f) => (src ? { ...f, [id]: src } : sin(f, id)))
      return
    }
    try {
      const imagen = await subirFoto(id, src)
      actualizar('productos', (l) => l.map((p) => (p.id === id ? { ...p, imagen } : p)))
    } catch (e) {
      avisar(`No se pudo guardar la foto: ${mensajeDe(e)}`)
    }
  }, [datos, avisar])

  // Después de editar canales, categorías, etc. en Configuración
  const recargarConfig = useCallback(async () => setConfig(await api('/config')), [])

  // ---------- Listas de la empresa (antes fijas en mock.js) ----------

  const listas = useMemo(() => {
    if (!config) return null
    const nombres = (l) => l.filter((x) => x.activo).map((x) => x.nombre)
    return {
      canales: nombres(config.canales),
      metodosPago: nombres(config.metodosPago),
      motivosMerma: nombres(config.motivosMerma),
      categoriasEgreso: nombres(config.categorias.egreso),
      // Categorías de egreso que llevan líneas de insumos (la categoría "Insumos")
      egresosConItems: config.categorias.egreso.filter((c) => c.conItems).map((c) => c.nombre),
      categoriasProducto: nombres(config.categorias.producto),
      categoriasInsumo: nombres(config.categorias.insumo),
      proveedores: nombres(config.proveedores),
    }
  }, [config])

  // Catálogo listo para los formularios + los 10 ítems más frecuentes de cada tipo
  const catalogo = useMemo(() => {
    if (!datos) return null
    const activos = (l) => l.filter((p) => p.activo !== false)
    const reciente = enRango(datos.ingresos, rango('90d').desde, rango('90d').hasta)
    const promosActivas = datos.promos.filter((p) => p.activa && p.productos.every((c) => datos.productos.some((x) => x.id === c.id)))
    return {
      productos: activos(datos.productos).map((p) => ({ ...p, tipo: 'producto' })),
      // Sin permiso para ver costos la merma se valoriza en el servidor
      productosCosto: activos(datos.productos).map((p) => ({ ...p, tipo: 'producto', precio: p.costo ?? 0 })),
      insumos: activos(datos.insumos).map((p) => ({ ...p, tipo: 'insumo' })),
      promos: promosActivas.map((p) => ({
        tipo: 'promo', id: p.id, codigo: p.codigo, nombre: p.nombre, categoria: 'Promos', unidad: 'un',
        precio: p.precio, precioNormal: precioNormal(p, datos.productos), componentes: componentesPromo(p, datos.productos),
      })),
      frecuentes: {
        venta: masFrecuentes(reciente, 'producto'),
        promos: promosActivas.map((p) => p.id),
        compra: masFrecuentes(datos.egresos, 'insumo'),
        mermaProducto: masFrecuentes(datos.mermas, 'producto'),
        mermaInsumo: masFrecuentes(datos.mermas, 'insumo'),
      },
    }
  }, [datos])

  const value = useMemo(
    () => ({
      ...datos, agregar, anular, guardarPromo, eliminarPromo, toast, exito, catalogo, imagenes, setImagen,
      guardarProducto, guardarInsumo, eliminarProducto, eliminarInsumo, ajustarPrecios, historialPrecios,
      listas, config, recargarConfig, puede, hoy, recargar: cargar,
    }),
    // hoy cambia en cada render; se usa solo su valor del día
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [datos, agregar, anular, guardarPromo, eliminarPromo, toast, exito, catalogo, imagenes, setImagen, guardarProducto, guardarInsumo, eliminarProducto, eliminarInsumo, ajustarPrecios, historialPrecios, listas, config, recargarConfig, puede, hoyIso, cargar],
  )

  if (error) {
    return (
      <div className="login">
        <div className="card login-card form">
          <h2 className="serif">No se pudieron cargar los datos</h2>
          <div className="alerta-error" role="alert">{error}</div>
          <button className="btn btn-primary" onClick={cargar}>Reintentar</button>
        </div>
      </div>
    )
  }
  if (!datos || !config) return <div className="cargando-app">Cargando {empresa?.nombre ?? ''}…</div>

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>
}

export const useDatos = () => useContext(DataContext)
