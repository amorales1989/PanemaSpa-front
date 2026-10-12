import { useState } from 'react'
import { KeyRound, LogOut } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

// Primer ingreso con contraseña temporal: no se puede usar nada hasta cambiarla
export default function CambioObligatorio() {
  const { usuario, cambiarPassword, recargarPerfil, cerrarSesion } = useAuth()
  const [actual, setActual] = useState('')
  const [nueva, setNueva] = useState('')
  const [repetir, setRepetir] = useState('')
  const [error, setError] = useState('')
  const [enviando, setEnviando] = useState(false)

  const enviar = async (e) => {
    e.preventDefault()
    if (nueva.length < 8) return setError('La nueva contraseña debe tener al menos 8 caracteres')
    if (nueva !== repetir) return setError('Las contraseñas nuevas no coinciden')
    setError('')
    setEnviando(true)
    try {
      await cambiarPassword(actual, nueva)
      await recargarPerfil()
    } catch (err) {
      setError(err.detalles?.nueva?.[0] ?? err.message)
      setEnviando(false)
    }
  }

  return (
    <div className="login">
      <form className="card login-card form" onSubmit={enviar}>
        <div className="logo login-logo">
          <div className="logo-mark">P</div>
          <div className="logo-text">Panema<small>Control del negocio</small></div>
        </div>
        <div>
          <h2 className="serif">Hola, {usuario.nombre.split(' ')[0]}</h2>
          <p className="sub">Por seguridad, cambia la contraseña temporal por una tuya antes de empezar.</p>
        </div>
        <div className="campo">
          <label htmlFor="co-actual">Contraseña temporal</label>
          <input id="co-actual" type="password" className="input" autoComplete="current-password" required autoFocus
            value={actual} onChange={(e) => setActual(e.target.value)} />
        </div>
        <div className="campo">
          <label htmlFor="co-nueva">Nueva contraseña</label>
          <input id="co-nueva" type="password" className="input" autoComplete="new-password" required minLength={8}
            value={nueva} onChange={(e) => setNueva(e.target.value)} />
        </div>
        <div className="campo">
          <label htmlFor="co-repetir">Repetir nueva contraseña</label>
          <input id="co-repetir" type="password" className="input" autoComplete="new-password" required
            value={repetir} onChange={(e) => setRepetir(e.target.value)} />
        </div>
        {error && <div className="alerta-error" role="alert">{error}</div>}
        <button className="btn btn-primary" disabled={enviando}><KeyRound size={18} /> {enviando ? 'Guardando…' : 'Guardar y entrar'}</button>
        <button type="button" className="btn btn-ghost" onClick={cerrarSesion}><LogOut size={18} /> Salir</button>
      </form>
    </div>
  )
}
