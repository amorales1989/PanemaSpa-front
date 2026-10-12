import { useState } from 'react'
import { Check } from 'lucide-react'
import Modal from './Modal'
import { useAuth } from '../context/AuthContext'

export default function CambiarPassword({ onClose }) {
  const { cambiarPassword } = useAuth()
  const [actual, setActual] = useState('')
  const [nueva, setNueva] = useState('')
  const [repetir, setRepetir] = useState('')
  const [error, setError] = useState('')
  const [listo, setListo] = useState(false)
  const [enviando, setEnviando] = useState(false)

  const enviar = async (e) => {
    e.preventDefault()
    if (nueva.length < 8) return setError('La nueva contraseña debe tener al menos 8 caracteres')
    if (nueva !== repetir) return setError('Las contraseñas nuevas no coinciden')
    setError('')
    setEnviando(true)
    try {
      await cambiarPassword(actual, nueva)
      setListo(true)
    } catch (err) {
      setError(err.detalles?.nueva?.[0] ?? err.message)
    } finally {
      setEnviando(false)
    }
  }

  return (
    <Modal titulo="Cambiar contraseña" onClose={onClose}>
      {listo ? (
        <div className="form">
          <p>Contraseña actualizada. Las sesiones abiertas en otros dispositivos se cerraron.</p>
          <button className="btn btn-primary" onClick={onClose}><Check size={18} /> Listo</button>
        </div>
      ) : (
        <form className="form" onSubmit={enviar}>
          <div className="campo">
            <label htmlFor="pw-actual">Contraseña actual</label>
            <input id="pw-actual" type="password" className="input" autoComplete="current-password" required autoFocus
              value={actual} onChange={(e) => setActual(e.target.value)} />
          </div>
          <div className="campo">
            <label htmlFor="pw-nueva">Nueva contraseña</label>
            <input id="pw-nueva" type="password" className="input" autoComplete="new-password" required minLength={8}
              value={nueva} onChange={(e) => setNueva(e.target.value)} />
          </div>
          <div className="campo">
            <label htmlFor="pw-repetir">Repetir nueva contraseña</label>
            <input id="pw-repetir" type="password" className="input" autoComplete="new-password" required
              value={repetir} onChange={(e) => setRepetir(e.target.value)} />
          </div>
          {error && <div className="alerta-error" role="alert">{error}</div>}
          <button className="btn btn-primary" disabled={enviando}>{enviando ? 'Guardando…' : 'Guardar'}</button>
        </form>
      )}
    </Modal>
  )
}
