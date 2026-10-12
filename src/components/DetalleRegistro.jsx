import { Trash2 } from 'lucide-react'
import Modal from './Modal'
import { useDatos } from '../context/DataContext'
import { TIPOS } from '../lib/tipos'
import { dinero, etiquetaDia } from '../lib/format'
import { fmtNum, resumenItems, subtotal } from '../lib/items'

// Detalle de una venta / egreso / merma con sus líneas
export default function DetalleRegistro({ tipo, registro, onClose }) {
  const { eliminar, hoy } = useDatos()
  const t = TIPOS[tipo]
  const r = registro

  const datos = [
    ['Fecha', `${etiquetaDia(r.fecha, hoy)}${r.hora ? ` · ${r.hora}` : ''}`],
    tipo !== 'mermas' && [t.etiquetaCategoria, r.categoria],
    r.proveedor && ['Proveedor', r.proveedor],
    !r.items && ['Detalle', r.descripcion],
    r.metodo && ['Medio de pago', r.metodo],
    r.motivo && ['Motivo', r.motivo],
  ].filter(Boolean)

  const borrar = () => {
    if (confirm('¿Eliminar este registro?')) {
      eliminar(tipo, r.id)
      onClose()
    }
  }

  return (
    <Modal titulo={tipo === 'ingresos' ? `Venta #${r.id}` : `${t.singular} #${r.id}`} onClose={onClose}>
      <div className="detalle-datos">
        {datos.map(([k, v]) => <div key={k}><span>{k}</span><strong>{v}</strong></div>)}
      </div>

      {r.items && (
        <table className="tabla" style={{ marginTop: 16 }}>
          <thead><tr><th>{tipo === 'egresos' ? 'Insumo' : 'Producto'}</th><th className="num">Cant.</th><th className="num">Precio</th><th className="num">Total</th></tr></thead>
          <tbody>
            {r.items.map((i) => (
              <tr key={`${i.tipo}:${i.id}`}>
                <td><span className="tile-codigo">#{i.codigo}</span> {i.tipo === 'promo' && <span className="etiqueta-promo">Promo</span>} {i.nombre}{i.componentes && <div className="sub">{resumenItems(i.componentes)}</div>}</td>
                <td className="num">{fmtNum(i.cantidad)} {i.unidad}</td>
                <td className="num">{dinero(i.precio)}</td>
                <td className="num">{dinero(subtotal(i))}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <div className="total-ticket" style={{ background: t.suave, marginTop: 16 }}>
        <span>Total</span><strong>{dinero(r.monto)}</strong>
      </div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12 }}>
        <button className="btn btn-ghost" onClick={borrar}><Trash2 size={16} /> Eliminar</button>
      </div>
    </Modal>
  )
}
