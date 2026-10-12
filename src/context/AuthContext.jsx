import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { api, renovarSesion, setEmpresaActiva, setToken } from '../lib/api'

const AuthContext = createContext(null)

const SIN_SESION = { cargando: false, usuario: null, empresas: [] }
const CLAVE_EMPRESA = 'panema-empresa'

const leerEmpresaGuardada = () => {
  try {
    return localStorage.getItem(CLAVE_EMPRESA)
  } catch {
    return null
  }
}

export function AuthProvider({ children }) {
  const [estado, setEstado] = useState({ ...SIN_SESION, cargando: true })
  const [empresaId, setEmpresaId] = useState(leerEmpresaGuardada)

  const cargarPerfil = useCallback(async () => {
    const yo = await api('/auth/yo')
    setEstado({ cargando: false, usuario: yo.usuario, empresas: yo.empresas })
    return yo
  }, [])

  // Al abrir la app: si hay cookie de sesión válida, se recupera sin pedir login
  useEffect(() => {
    renovarSesion()
      .then((ok) => (ok ? cargarPerfil() : setEstado(SIN_SESION)))
      .catch(() => setEstado(SIN_SESION))
  }, [cargarPerfil])

  // Si una llamada descubre que la sesión ya no sirve, se cierra en la interfaz
  useEffect(() => {
    const salir = () => { setToken(null); setEstado(SIN_SESION) }
    window.addEventListener('panema:sesion-expirada', salir)
    return () => window.removeEventListener('panema:sesion-expirada', salir)
  }, [])

  const iniciarSesion = useCallback(async (email, password) => {
    const r = await api('/auth/login', { metodo: 'POST', body: { email, password } })
    setToken(r.accessToken)
    return cargarPerfil()
  }, [cargarPerfil])

  const cerrarSesion = useCallback(async () => {
    await api('/auth/logout', { metodo: 'POST' }).catch(() => {})
    setToken(null)
    setEstado(SIN_SESION)
  }, [])

  const cambiarPassword = useCallback(
    (actual, nueva) => api('/auth/cambiar-password', { metodo: 'POST', body: { actual, nueva } }),
    [],
  )

  // Empresa activa: la elegida antes (si sigue disponible) o la primera
  const empresa = estado.empresas.find((e) => e.id === empresaId) ?? estado.empresas[0] ?? null
  setEmpresaActiva(empresa?.id ?? null)

  const elegirEmpresa = useCallback((id) => {
    setEmpresaId(id)
    try {
      localStorage.setItem(CLAVE_EMPRESA, id)
    } catch {
      // Sin almacenamiento: la elección dura esta sesión
    }
  }, [])

  const puede = useCallback((...permisos) => permisos.some((p) => empresa?.permisos.includes(p)), [empresa])

  const value = useMemo(
    () => ({ ...estado, empresa, elegirEmpresa, puede, iniciarSesion, cerrarSesion, cambiarPassword, recargarPerfil: cargarPerfil }),
    [estado, empresa, elegirEmpresa, puede, iniciarSesion, cerrarSesion, cambiarPassword, cargarPerfil],
  )
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => useContext(AuthContext)
