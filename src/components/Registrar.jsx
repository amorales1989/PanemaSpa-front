import { useState } from 'react'
import Modal from './Modal'
import RegistroForm from './RegistroForm'
import { TIPOS } from '../lib/tipos'
import { useDatos } from '../context/DataContext'

// Modal "¿Qué quieres registrar?" → formulario del tipo elegido.
// Si recibe `tipoInicial`, salta directo al formulario.
export default function Registrar({ tipoInicial = null, onClose }) {
  const [tipo, setTipo] = useState(tipoInicial)
  // Las ventas se registran seguidas: al finalizar, el formulario se limpia
  // (se vuelve a montar) y el modal sigue abierto hasta tocar la ✕
  const [ventas, setVentas] = useState(0)
  const { puede } = useDatos()
  const permitidos = Object.entries(TIPOS).filter(([, t]) => puede(t.permisoCrear))

  if (tipo) {
    const esVenta = tipo === 'ingresos'
    return (
      <Modal titulo={TIPOS[tipo].nuevo} onClose={onClose} soloCruz={esVenta}>
        <RegistroForm key={ventas} tipo={tipo} onDone={esVenta ? () => setVentas((n) => n + 1) : onClose} />
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
