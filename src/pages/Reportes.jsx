import { useState } from 'react'
import { FileText, TrendingUp, TrendingDown, PackageX, Package, Wheat, BadgePercent, BarChart3, LayoutDashboard } from 'lucide-react'
import { SelectorPeriodo } from '../components/ui'
import BotonPDF from '../components/BotonPDF'
import { REPORTES } from '../reportes/datos'

const ICONOS = {
  completo: FileText, resumen: LayoutDashboard, ventas: TrendingUp, egresos: TrendingDown,
  merma: PackageX, productos: Package, insumos: Wheat, promos: BadgePercent, estadisticas: BarChart3,
}

export default function Reportes() {
  const [periodo, setPeriodo] = useState('30d')
  const [completo, ...resto] = REPORTES

  return (
    <>
      <div className="page-head">
        <div>
          <h1 className="serif">Reportes</h1>
          <p>Descarga informes en PDF para saber todo lo que pasa en el negocio.</p>
        </div>
        <SelectorPeriodo valor={periodo} onChange={setPeriodo} />
      </div>

      <div className="card reporte-destacado">
        <div className="reporte-icono grande"><FileText size={30} /></div>
        <div style={{ flex: 1, minWidth: 220 }}>
          <h2 className="serif">{completo.titulo}</h2>
          <p>{completo.descripcion}</p>
        </div>
        <BotonPDF tipo="completo" periodo={periodo} texto="Descargar informe completo" className="btn btn-pdf-grande" />
      </div>

      <div className="reportes">
        {resto.map((r) => {
          const Icono = ICONOS[r.id]
          return (
            <div key={r.id} className="card reporte">
              <div className="reporte-icono"><Icono size={22} /></div>
              <h2>{r.titulo}</h2>
              <p>{r.descripcion}</p>
              <BotonPDF tipo={r.id} periodo={periodo} />
            </div>
          )
        })}
      </div>
    </>
  )
}
