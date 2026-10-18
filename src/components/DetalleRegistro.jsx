import { useState } from 'react'
import { Ban, Printer } from 'lucide-react'
import Modal from './Modal'
import { useDatos } from '../context/DataContext'
import { useAuth } from '../context/AuthContext'
import { imprimirComprobante } from '../lib/comprobante'
import { TIPOS } from '../lib/tipos'
import { dinero, etiquetaDia } from '../lib/format'
import { fmtNum, resumenItems, subtotal } from '../lib/items'

// Detalle de una venta / egreso / merma con sus líneas
export default function DetalleRegistro({ tipo, registro, onClose }) {
  const { anular, hoy, puede } = useDatos()
  const { empresa } = useAuth()
  const t = TIPOS[tipo]
  const r = registro
  const [anulando, setAnulando] = useState(false)
  const [motivo, setMotivo] = useState('')
  const [error, setError] = useState('')
  const [enviando, setEnviando] = useState(false)

  const datos = [
    ['Fecha', `${etiquetaDia(r.fecha, hoy)}${r.hora ? ` · ${r.hora}` : ''}`],
    tipo !== 'mermas' && [t.etiquetaCategoria, r.categoria],
    r.proveedor && ['Proveedor', r.proveedor],
    !r.items && ['Detalle', r.descripcion],
    r.metodo && ['Medio de pago', r.metodo],
    r.motivo && ['Motivo', r.motivo],
    r.usuario && ['Registró', r.usuario],
  ].filter(Boolean)

  // Los registros no se borran: se anulan con un motivo (queda en el historial)
  const confirmarAnulacion = async (e) => {
    e.preventDefault()
    if (!motivo.trim()) return setError('Escribe el motivo')
    setEnviando(true)
    try {
      await anular(tipo, r.id, motivo.trim())
      onClose()
    } catch (err) {
      setError(err.message)
      setEnviando(false)
    }
  }

  return (
    <Modal titulo={`${t.singular} #${r.numero ?? ''}`} onClose={onClose}>
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
      {tipo === 'ingresos' && empresa?.comprobanteActivo && (
        <button type="button" className="btn btn-ghost" style={{ marginTop: 12, width: '100%' }} onClick={() => imprimirComprobante(r, empresa)}>
          <Printer size={18} /> Imprimir comprobante
        </button>
      )}
      {puede(t.permisoAnular) && (anulando ? (
        <form className="form anular" onSubmit={confirmarAnulacion}>
          <div className="campo">
            <label htmlFor="motivo-anulacion">¿Por qué se anula?</label>
            <input id="motivo-anulacion" className="input" autoFocus placeholder="Ej: se registró dos veces" maxLength={300}
              value={motivo} onChange={(e) => setMotivo(e.target.value)} />
          </div>
          {error && <div className="alerta-error" role="alert">{error}</div>}
          <div className="acciones-form">
            <button type="button" className="btn btn-ghost" onClick={() => setAnulando(false)}>Cancelar</button>
            <button className="btn btn-peligro" style={{ flex: 1 }} disabled={enviando}><Ban size={16} /> {enviando ? 'Anulando…' : 'Anular registro'}</button>
          </div>
        </form>
      ) : (
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12 }}>
          <button className="btn btn-ghost" onClick={() => setAnulando(true)}><Ban size={16} /> Anular</button>
        </div>
      ))}
    </Modal>
  )
}
