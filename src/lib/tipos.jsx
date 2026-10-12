import { TrendingUp, TrendingDown, PackageX } from 'lucide-react'

// Configuración visual y de textos de cada tipo de registro
export const TIPOS = {
  ingresos: {
    titulo: 'Ingresos', singular: 'Venta', nuevo: 'Registrar venta', ruta: '/ingresos', Icono: TrendingUp,
    color: 'var(--ingreso)', suave: 'var(--ingreso-soft)', signo: '+', registros: 'Ventas',
    ayuda: 'Ventas con sus productos', etiquetaCategoria: 'Canal', permisoCrear: 'ventas.crear', permisoAnular: 'ventas.anular',
  },
  egresos: {
    titulo: 'Egresos', singular: 'Egreso', nuevo: 'Nuevo egreso', ruta: '/egresos', Icono: TrendingDown,
    color: 'var(--egreso)', suave: 'var(--egreso-soft)', signo: '−', registros: 'Registros',
    ayuda: 'Compras de insumos, sueldos, arriendo y gastos', etiquetaCategoria: 'Categoría', permisoCrear: 'egresos.crear', permisoAnular: 'egresos.anular',
  },
  mermas: {
    titulo: 'Merma', singular: 'Merma', nuevo: 'Nueva merma', ruta: '/merma', Icono: PackageX,
    color: 'var(--merma)', suave: 'var(--merma-soft)', signo: '−', registros: 'Registros',
    ayuda: 'Productos e insumos vencidos o perdidos', etiquetaCategoria: 'Tipo', permisoCrear: 'mermas.crear', permisoAnular: 'mermas.anular',
  },
}

// Categorías para filtrar/elegir en cada tipo: las de la empresa (canales, categorías de egreso)
export const categoriasDe = (tipo, listas) =>
  ({ ingresos: listas.canales, egresos: listas.categoriasEgreso, mermas: ['Productos', 'Insumos'] })[tipo]
