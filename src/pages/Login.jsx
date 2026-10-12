import { useState } from 'react'
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { LogIn } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

// Solo rutas internas (evita redirigir a otro sitio con ?siguiente=https://...)
const destinoSeguro = (ruta) => (ruta?.startsWith('/') && !ruta.startsWith('//') ? ruta : null)

export default function Login() {
  const { usuario, cargando, iniciarSesion } = useAuth()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const siguiente = destinoSeguro(params.get('siguiente'))
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [enviando, setEnviando] = useState(false)

  const destino = (u) => siguiente ?? (u.esSuperadmin ? '/admin' : '/')

  if (!cargando && usuario) return <Navigate to={destino(usuario)} replace />

  const enviar = async (e) => {
    e.preventDefault()
    setError('')
    setEnviando(true)
    try {
      const yo = await iniciarSesion(email.trim(), password)
      navigate(destino(yo.usuario), { replace: true })
    } catch (err) {
      setError(err.codigo === 'DEMASIADOS_INTENTOS' ? 'Demasiados intentos. Espera unos minutos.' : err.message)
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
        <div className="campo">
          <label htmlFor="email">Email</label>
          <input id="email" type="email" className="input" autoComplete="email" autoFocus required
            value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div className="campo">
          <label htmlFor="password">Contraseña</label>
          <input id="password" type="password" className="input" autoComplete="current-password" required
            value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        {error && <div className="alerta-error" role="alert">{error}</div>}
        <button className="btn btn-primary" disabled={enviando || cargando}>
          <LogIn size={18} /> {enviando ? 'Ingresando…' : 'Ingresar'}
        </button>
      </form>
    </div>
  )
}
