import { Wheat, Croissant, CakeSlice, Coffee, BadgePercent, Package } from 'lucide-react'
import { useDatos } from '../context/DataContext'

// Si el producto no tiene foto se muestra el ícono de su categoría
const CATEGORIA = {
  Panes: { Icono: Wheat, fondo: '#f3e3c3', color: '#8a5a1f' },
  Pastelería: { Icono: Croissant, fondo: '#fbeedb', color: '#c97a1c' },
  Tortas: { Icono: CakeSlice, fondo: '#f8e5e1', color: '#c2513f' },
  Cafetería: { Icono: Coffee, fondo: '#ede4da', color: '#3b2a20' },
  Promos: { Icono: BadgePercent, fondo: '#f3e3c3', color: '#3b2a20' },
}

export default function ImagenProducto({ producto, tamano = 40, className = '' }) {
  const { imagenes, productos } = useDatos()
  const src = producto.tipo !== 'promo' ? imagenes[producto.id] : null
  const estilo = typeof tamano === 'number' ? { width: tamano, height: tamano } : {}

  if (src) return <img src={src} alt={producto.nombre} className={`img-producto ${className}`} style={estilo} />

  // Las líneas de venta no guardan la categoría: se busca en el catálogo
  const categoria = producto.tipo === 'promo' ? 'Promos' : producto.categoria ?? productos.find((p) => p.id === producto.id)?.categoria
  const { Icono, fondo, color } = CATEGORIA[categoria] ?? { Icono: Package, fondo: '#faf6f0', color: '#7d7168' }
  return (
    <div className={`img-producto img-vacia ${className}`} style={{ ...estilo, background: fondo, color }} aria-hidden="true">
      <Icono size={typeof tamano === 'number' ? Math.max(14, Math.round(tamano * 0.42)) : 28} strokeWidth={1.75} />
    </div>
  )
}
