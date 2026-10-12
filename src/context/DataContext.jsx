import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import { MOCK, HOY, ordenarRecientes } from '../data/mock'
import { masFrecuentes, componentesPromo, precioNormal } from '../lib/items'
import { isoLocal } from '../lib/format'

const DataContext = createContext(null)

export const PERIODOS = [
  { id: '7d', label: '7 días', dias: 7 },
  { id: '30d', label: '30 días', dias: 30 },
  { id: '90d', label: '3 meses', dias: 90 },
  { id: '180d', label: '6 meses', dias: 180 },
]

// Devuelve el rango del período y el período anterior equivalente (para comparar)
export function rango(periodoId) {
  const { dias } = PERIODOS.find((p) => p.id === periodoId)
  const menos = (n) => {
    const d = new Date(HOY)
    d.setDate(d.getDate() - n)
    return isoLocal(d)
  }
  return { desde: menos(dias - 1), hasta: isoLocal(HOY), prevDesde: menos(dias * 2 - 1), prevHasta: menos(dias) }
}

export const enRango = (lista, desde, hasta) => lista.filter((x) => x.fecha >= desde && x.fecha <= hasta)
export const suma = (lista) => lista.reduce((t, x) => t + x.monto, 0)

export function DataProvider({ children }) {
  const [datos, setDatos] = useState(MOCK)
  const [toast, setToast] = useState(null)
  const [exito, setExito] = useState(null)

  // Fotos de productos: { [idProducto]: dataURL }. Mientras no haya backend se
  // guardan en este navegador para que no se pierdan al recargar.
  const [imagenes, setImagenes] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('panema-imagenes')) ?? {}
    } catch {
      return {}
    }
  })
  const setImagen = useCallback((id, src) => {
    setImagenes((actual) => {
      const nuevas = { ...actual }
      if (src) nuevas[id] = src
      else delete nuevas[id]
      try {
        localStorage.setItem('panema-imagenes', JSON.stringify(nuevas))
      } catch {
        // Sin espacio o almacenamiento bloqueado: la foto queda solo en esta sesión
      }
      return nuevas
    })
  }, [])

  const avisar = useCallback((mensaje) => {
    setToast(mensaje)
    setTimeout(() => setToast(null), 2600)
  }, [])

  const agregar = useCallback((tipo, item) => {
    setDatos((d) => {
      // Una compra de insumos actualiza el precio de cada insumo en el catálogo
      const precios = tipo === 'egresos' && item.items ? Object.fromEntries(item.items.map((i) => [i.id, i.precio])) : null
      return {
        ...d,
        [tipo]: [{ ...item, id: d.siguienteId }, ...d[tipo]].sort(ordenarRecientes),
        insumos: precios ? d.insumos.map((p) => (precios[p.id] ? { ...p, precio: precios[p.id] } : p)) : d.insumos,
        siguienteId: d.siguienteId + 1,
      }
    })
    if (tipo === 'ingresos') {
      // Mensaje grande en el centro de la pantalla
      const clave = Date.now()
      setExito({ clave, monto: item.monto })
      setTimeout(() => setExito((e) => (e?.clave === clave ? null : e)), 1800)
      return
    }
    const mensajes = { egresos: 'Egreso registrado', mermas: 'Merma registrada' }
    avisar(mensajes[tipo])
  }, [avisar])

  const eliminar = useCallback((tipo, id) => {
    setDatos((d) => ({ ...d, [tipo]: d[tipo].filter((x) => x.id !== id) }))
  }, [])

  // Promos: crear o actualizar (por id), eliminar
  const guardarPromo = useCallback((promo) => {
    setDatos((d) => ({
      ...d,
      promos: d.promos.some((p) => p.id === promo.id) ? d.promos.map((p) => (p.id === promo.id ? promo : p)) : [...d.promos, promo],
    }))
    avisar('Promo guardada')
  }, [avisar])

  const eliminarPromo = useCallback((id) => {
    setDatos((d) => ({ ...d, promos: d.promos.filter((p) => p.id !== id) }))
  }, [])

  // ---------- Catálogo: productos e insumos ----------
  const hoyIso = isoLocal(HOY)

  // Crea o actualiza (por id). Si cambia el precio de un producto, queda en su historial.
  const guardarProducto = useCallback((producto) => {
    setDatos((d) => {
      const anterior = d.productos.find((p) => p.id === producto.id)
      if (!anterior) return { ...d, productos: [...d.productos, { ...producto, historial: [] }] }
      const historial = anterior.precio !== producto.precio
        ? [{ fecha: hoyIso, anterior: anterior.precio, nuevo: producto.precio, motivo: 'Edición' }, ...(anterior.historial ?? [])]
        : anterior.historial ?? []
      return { ...d, productos: d.productos.map((p) => (p.id === producto.id ? { ...producto, historial } : p)) }
    })
    avisar('Producto guardado')
  }, [avisar, hoyIso])

  const guardarInsumo = useCallback((insumo) => {
    setDatos((d) => ({
      ...d,
      insumos: d.insumos.some((p) => p.id === insumo.id) ? d.insumos.map((p) => (p.id === insumo.id ? insumo : p)) : [...d.insumos, insumo],
    }))
    avisar('Insumo guardado')
  }, [avisar])

  // Se quita del catálogo; las ventas, compras y mermas ya registradas se mantienen
  const eliminarProducto = useCallback((id) => {
    setDatos((d) => ({ ...d, productos: d.productos.filter((p) => p.id !== id) }))
    setImagen(id, null)
    avisar('Producto eliminado')
  }, [avisar, setImagen])

  const eliminarInsumo = useCallback((id) => {
    setDatos((d) => ({ ...d, insumos: d.insumos.filter((p) => p.id !== id) }))
    avisar('Insumo eliminado')
  }, [avisar])

  // cambios: [{ id, precio }]. Aplica nuevos precios de venta y los anota en el historial.
  const ajustarPrecios = useCallback((cambios, motivo) => {
    const nuevos = Object.fromEntries(cambios.map((c) => [c.id, c.precio]))
    setDatos((d) => ({
      ...d,
      productos: d.productos.map((p) => (nuevos[p.id] !== undefined && nuevos[p.id] !== p.precio
        ? { ...p, precio: nuevos[p.id], historial: [{ fecha: hoyIso, anterior: p.precio, nuevo: nuevos[p.id], motivo }, ...(p.historial ?? [])] }
        : p)),
    }))
    avisar(cambios.length === 1 ? 'Precio actualizado' : `Precios actualizados (${cambios.length} productos)`)
  }, [avisar, hoyIso])

  // Catálogo listo para los formularios + los 10 ítems más frecuentes de cada tipo
  const catalogo = useMemo(() => {
    const reciente = enRango(datos.ingresos, rango('90d').desde, rango('90d').hasta)
    return {
      productos: datos.productos.map((p) => ({ ...p, tipo: 'producto' })),
      productosCosto: datos.productos.map((p) => ({ ...p, tipo: 'producto', precio: p.costo })),
      insumos: datos.insumos.map((p) => ({ ...p, tipo: 'insumo' })),
      promos: datos.promos.filter((p) => p.activa).map((p) => ({
        tipo: 'promo', id: p.id, codigo: p.codigo, nombre: p.nombre, categoria: 'Promos', unidad: 'un',
        precio: p.precio, precioNormal: precioNormal(p, datos.productos), componentes: componentesPromo(p, datos.productos),
      })),
      frecuentes: {
        venta: masFrecuentes(reciente, 'producto'),
        promos: datos.promos.filter((p) => p.activa).map((p) => p.id),
        compra: masFrecuentes(datos.egresos, 'insumo'),
        mermaProducto: masFrecuentes(datos.mermas, 'producto'),
        mermaInsumo: masFrecuentes(datos.mermas, 'insumo'),
      },
    }
  }, [datos])

  const value = useMemo(
    () => ({
      ...datos, agregar, eliminar, guardarPromo, eliminarPromo, toast, exito, catalogo, imagenes, setImagen,
      guardarProducto, guardarInsumo, eliminarProducto, eliminarInsumo, ajustarPrecios, hoy: HOY,
    }),
    [datos, agregar, eliminar, guardarPromo, eliminarPromo, toast, exito, catalogo, imagenes, setImagen, guardarProducto, guardarInsumo, eliminarProducto, eliminarInsumo, ajustarPrecios],
  )
  return <DataContext.Provider value={value}>{children}</DataContext.Provider>
}

export const useDatos = () => useContext(DataContext)
