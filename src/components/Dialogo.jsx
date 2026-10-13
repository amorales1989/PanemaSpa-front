import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { AlertTriangle, Info } from 'lucide-react'

// Confirmaciones y avisos con el diseño de la app (reemplazan a confirm() y alert() del navegador).
//
//   const { confirmar, avisar } = useDialogo()
//   if (!(await confirmar({ titulo: '¿Eliminar…?', mensaje: '…', textoAceptar: 'Eliminar', peligro: true }))) return
//   await avisar({ titulo: 'No se pudo…', mensaje: '…' })
const DialogoContext = createContext(null)

function Ventana({ dialogo, onResponder }) {
  const { tipo, titulo, mensaje, textoAceptar, textoCancelar, peligro } = dialogo
  const aceptarRef = useRef(null)
  const Icono = peligro || tipo === 'error' ? AlertTriangle : Info

  // Foco en el botón principal; Escape cancela y Enter acepta
  useEffect(() => {
    aceptarRef.current?.focus()
    const onKey = (e) => {
      if (e.key === 'Escape') { e.stopImmediatePropagation(); onResponder(false) }
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [onResponder])

  return (
    <div className="overlay overlay-dialogo" onMouseDown={(e) => e.target === e.currentTarget && onResponder(false)}>
      <div className="modal dialogo" role="alertdialog" aria-modal="true" aria-labelledby="dialogo-titulo" aria-describedby="dialogo-mensaje">
        <div className={`dialogo-icono ${peligro || tipo === 'error' ? 'peligro' : ''}`}><Icono size={22} /></div>
        <h2 id="dialogo-titulo" className="serif">{titulo}</h2>
        {mensaje && <p id="dialogo-mensaje">{mensaje}</p>}
        <div className="dialogo-acciones">
          {tipo === 'confirmar' && (
            <button type="button" className="btn btn-ghost" onClick={() => onResponder(false)}>{textoCancelar}</button>
          )}
          <button ref={aceptarRef} type="button" className={`btn ${peligro ? 'btn-peligro-solido' : 'btn-primary'}`} onClick={() => onResponder(true)}>
            {textoAceptar}
          </button>
        </div>
      </div>
    </div>
  )
}

export function DialogoProvider({ children }) {
  const [dialogo, setDialogo] = useState(null)

  const abrir = useCallback((opciones) => new Promise((resolver) => setDialogo({ ...opciones, resolver })), [])

  const confirmar = useCallback((o) => abrir({
    tipo: 'confirmar', textoAceptar: 'Aceptar', textoCancelar: 'Cancelar', peligro: false, ...o,
  }), [abrir])

  const avisar = useCallback((o) => abrir({ tipo: 'aviso', textoAceptar: 'Entendido', ...o }).then(() => undefined), [abrir])

  const responder = useCallback((valor) => {
    setDialogo((d) => {
      d?.resolver(valor)
      return null
    })
  }, [])

  return (
    <DialogoContext.Provider value={{ confirmar, avisar }}>
      {children}
      {dialogo && <Ventana dialogo={dialogo} onResponder={responder} />}
    </DialogoContext.Provider>
  )
}

export const useDialogo = () => useContext(DialogoContext)
