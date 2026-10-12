import { TrendingUp, TrendingDown, PackageX } from 'lucide-react'
import { CATEGORIAS_INGRESO, CATEGORIAS_EGRESO } from '../data/mock'

// Configuración visual y de textos de cada tipo de registro
export const TIPOS = {
  ingresos: {
    titulo: 'Ingresos', singular: 'Venta', nuevo: 'Registrar venta', ruta: '/ingresos', Icono: TrendingUp,
    color: 'var(--ingreso)', suave: 'var(--ingreso-soft)', signo: '+', registros: 'Ventas',
    ayuda: 'Ventas con sus productos', categorias: CATEGORIAS_INGRESO, etiquetaCategoria: 'Canal',
  },
  egresos: {
    titulo: 'Egresos', singular: 'Egreso', nuevo: 'Nuevo egreso', ruta: '/egresos', Icono: TrendingDown,
    color: 'var(--egreso)', suave: 'var(--egreso-soft)', signo: '−', registros: 'Registros',
    ayuda: 'Compras de insumos, sueldos, arriendo y gastos', categorias: CATEGORIAS_EGRESO, etiquetaCategoria: 'Categoría',
  },
  mermas: {
    titulo: 'Merma', singular: 'Merma', nuevo: 'Nueva merma', ruta: '/merma', Icono: PackageX,
    color: 'var(--merma)', suave: 'var(--merma-soft)', signo: '−', registros: 'Registros',
    ayuda: 'Productos e insumos vencidos o perdidos', categorias: ['Productos', 'Insumos'], etiquetaCategoria: 'Tipo',
  },
}
