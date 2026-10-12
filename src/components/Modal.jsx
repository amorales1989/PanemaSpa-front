import { useEffect } from 'react'
import { X } from 'lucide-react'

// `soloCruz`: el modal se cierra únicamente con la ✕ (no con Escape ni clic afuera)
export default function Modal({ titulo, onClose, children, soloCruz = false }) {
  useEffect(() => {
    if (soloCruz) return
    const onKey = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose, soloCruz])

  return (
    <div className="overlay" onMouseDown={(e) => !soloCruz && e.target === e.currentTarget && onClose()}>
      <div className="modal" role="dialog" aria-modal="true" aria-label={titulo}>
        <div className="modal-head">
          <h2 className="serif">{titulo}</h2>
          <button className="icon-btn" onClick={onClose} aria-label="Cerrar"><X size={20} /></button>
        </div>
        {children}
      </div>
    </div>
  )
}
