import { useState } from 'react'
import { CircleCheck, Plus, Printer } from 'lucide-react'
import Modal from './Modal'
import RegistroForm from './RegistroForm'
import { TIPOS } from '../lib/tipos'
import { useDatos } from '../context/DataContext'
import { useAuth } from '../context/AuthContext'
import { dinero } from '../lib/format'
import { imprimirComprobante } from '../lib/comprobante'

// Después de una venta, si la empresa usa comprobante: imprimirlo o seguir vendiendo
function VentaLista({ venta, empresa, onNueva }) {
  return (
    <div className="venta-lista">
      <CircleCheck size={44} className="venta-lista-icono" />
      <div>
        <h3 className="serif">Venta #{venta.numero} registrada</h3>
        <p className="sub">{dinero(venta.monto)} · {venta.metodo}</p>
      </div>
      <div className="venta-lista-acciones">
        <button type="button" className="btn btn-primary" autoFocus onClick={() => imprimirComprobante(venta, empresa)}>
          <Printer size={18} /> Imprimir comprobante
        </button>
        <button type="button" className="btn btn-registrar" onClick={onNueva}><Plus size={18} /> Nueva venta</button>
      </div>
    </div>
  )
}

// Modal "¿Qué quieres registrar?" → formulario del tipo elegido.
// Si recibe `tipoInicial`, salta directo al formulario.
export default function Registrar({ tipoInicial = null, onClose }) {
  const [tipo, setTipo] = useState(tipoInicial)
  // Las ventas se registran seguidas: al finalizar, el formulario se limpia
  // (se vuelve a montar) y el modal sigue abierto hasta tocar la ✕
  const [ventas, setVentas] = useState(0)
  const [ultima, setUltima] = useState(null)
  const { puede } = useDatos()
  const { empresa } = useAuth()
  const permitidos = Object.entries(TIPOS).filter(([, t]) => puede(t.permisoCrear))

  if (tipo) {
    const esVenta = tipo === 'ingresos'
    const terminarVenta = (venta) => {
      setVentas((n) => n + 1)
      if (empresa?.comprobanteActivo && venta) setUltima(venta)
    }
    return (
      <Modal titulo={TIPOS[tipo].nuevo} onClose={onClose} soloCruz={esVenta}>
        {ultima
          ? <VentaLista venta={ultima} empresa={empresa} onNueva={() => setUltima(null)} />
          : <RegistroForm key={ventas} tipo={tipo} onDone={esVenta ? terminarVenta : onClose} />}
      </Modal>
    )
  }

  return (
    <Modal titulo="¿Qué quieres registrar?" onClose={onClose}>
      <div className="opciones-registro">
        {permitidos.map(([id, t]) => (
          <button key={id} className="opcion-registro" onClick={() => setTipo(id)}>
            <div className="mov-icon" style={{ background: t.suave, color: t.color }}><t.Icono size={24} /></div>
            <div><strong>{t.nuevo}</strong><span>{t.ayuda}</span></div>
          </button>
        ))}
      </div>
    </Modal>
  )
}
