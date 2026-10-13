// Cliente de la API. En producción Vercel reenvía /api/* al back (vercel.json);
// en desarrollo lo hace Vite (vite.config.js). Así la cookie de sesión es del mismo sitio.
const BASE = import.meta.env.VITE_API_URL ?? '/api'

// El access token vive solo en memoria (no en localStorage): si se recarga la página,
// se pide uno nuevo con la cookie httpOnly del refresh.
let accessToken = null
let empresaId = null

export const setToken = (t) => { accessToken = t }

// '/uploads/…' (lo que guarda la API) → URL que carga el navegador (pasa por el proxy /api)
export const urlArchivo = (ruta) => (ruta ? `${BASE}${ruta}` : null)
export const setEmpresaActiva = (id) => { empresaId = id }

export class ErrorApi extends Error {
  constructor(status, datos) {
    super(datos?.error ?? `Error ${status}`)
    this.status = status
    this.codigo = datos?.codigo
    this.detalles = datos?.detalles
  }
}

const esperar = (ms) => new Promise((r) => setTimeout(r, ms))

// Una sola renovación a la vez (StrictMode y pedidos en paralelo comparten la misma)
let renovando = null
export function renovarSesion() {
  renovando ??= (async () => {
    for (let intento = 0; intento < 2; intento++) {
      const res = await fetch(`${BASE}/v1/auth/refresh`, { method: 'POST', credentials: 'include' })
      if (res.ok) {
        accessToken = (await res.json()).accessToken
        return true
      }
      const datos = await res.json().catch(() => null)
      // Otra pestaña la renovó primero: el navegador ya tiene la cookie nueva, reintentar
      if (datos?.codigo !== 'SESION_ROTADA') break
      await esperar(300)
    }
    accessToken = null
    return false
  })().finally(() => { renovando = null })
  return renovando
}

export async function api(ruta, { metodo = 'GET', body, headers, reintentar = true } = {}) {
  const res = await fetch(`${BASE}/v1${ruta}`, {
    method: metodo,
    credentials: 'include',
    headers: {
      ...(body !== undefined && { 'Content-Type': 'application/json' }),
      ...(accessToken && { Authorization: `Bearer ${accessToken}` }),
      ...(empresaId && { 'X-Empresa-Id': empresaId }),
      ...headers,
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })

  // Token vencido (dura 15 min): se renueva una vez y se repite el pedido
  if (res.status === 401 && reintentar && !ruta.startsWith('/auth/')) {
    if (await renovarSesion()) return api(ruta, { metodo, body, headers, reintentar: false })
    window.dispatchEvent(new Event('panema:sesion-expirada'))
  }
  if (res.status === 204) return null
  const datos = await res.json().catch(() => null)
  if (!res.ok) throw new ErrorApi(res.status, datos)
  return datos
}
