import { useCallback, useEffect, useState } from 'react'
import { Copy, KeyRound, UserPlus } from 'lucide-react'
import { api } from '../lib/api'
import Modal from './Modal'
import { haceCuanto } from '../pages/admin/adminFormato'

// Contraseña temporal: se muestra una sola vez para entregarla a la persona
function ClaveTemporal({ titulo, email, clave, onClose }) {
  const [copiada, setCopiada] = useState(false)
  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(`Usuario: ${email}\nContraseña temporal: ${clave}\nIngreso: ${window.location.origin}/login`)
      setCopiada(true)
    } catch {
      setCopiada(false)
    }
  }
  return (
    <Modal titulo={titulo} onClose={onClose} soloCruz>
      <div className="form">
        <p>Entrégale estos datos a la persona. <strong>La contraseña no se vuelve a mostrar</strong>; al ingresar por primera vez el sistema le pedirá cambiarla.</p>
        <div className="clave-temporal">
          <div><span>Usuario</span><strong>{email}</strong></div>
          <div><span>Contraseña temporal</span><strong className="mono">{clave}</strong></div>
          <div><span>Ingreso</span><strong>{window.location.origin}/login</strong></div>
        </div>
        <button className="btn btn-registrar" onClick={copiar}><Copy size={18} /> {copiada ? 'Copiado' : 'Copiar datos'}</button>
        <button className="btn btn-primary" onClick={onClose}>Listo</button>
      </div>
    </Modal>
  )
}

function Agregar({ roles, onAgregar, onClose }) {
  const [nombre, setNombre] = useState('')
  const [email, setEmail] = useState('')
  const [rolId, setRolId] = useState(roles.find((r) => r.codigo === 'vendedor')?.id ?? roles[0]?.id)
  const [error, setError] = useState('')
  const [enviando, setEnviando] = useState(false)
  const rol = roles.find((r) => r.id === rolId)

  const enviar = async (e) => {
    e.preventDefault()
    setEnviando(true)
    setError('')
    try {
      await onAgregar({ nombre: nombre.trim(), email: email.trim(), rolId })
    } catch (err) {
      setError(Object.values(err.detalles ?? {})[0]?.[0] ?? err.message)
      setEnviando(false)
    }
  }

  return (
    <Modal titulo="Agregar usuario" onClose={onClose}>
      <form className="form" onSubmit={enviar}>
        <div className="campo">
          <label htmlFor="nu-nombre">Nombre</label>
          <input id="nu-nombre" className="input" required autoFocus value={nombre} onChange={(e) => setNombre(e.target.value)} />
        </div>
        <div className="campo">
          <label htmlFor="nu-email">Email</label>
          <input id="nu-email" type="email" className="input" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div className="campo">
          <label htmlFor="nu-rol">Rol</label>
          <select id="nu-rol" className="input" value={rolId} onChange={(e) => setRolId(e.target.value)}>
            {roles.map((r) => <option key={r.id} value={r.id}>{r.nombre}</option>)}
          </select>
          {rol?.descripcion && <div className="sub" style={{ marginTop: 6 }}>{rol.descripcion}</div>}
        </div>
        {error && <div className="alerta-error" role="alert">{error}</div>}
        <button className="btn btn-primary" disabled={enviando}><UserPlus size={18} /> {enviando ? 'Agregando…' : 'Agregar'}</button>
      </form>
    </Modal>
  )
}

// Tabla del equipo de una empresa. La usan:
//  - el panel de plataforma: base = /admin/empresas/:id/usuarios (puede todo)
//  - la configuración de la empresa: base = /equipo (no toca su propia fila; solo un dueño nombra dueños)
export default function Equipo({ base, yoId = null, puedeDuenos = true }) {
  const [datos, setDatos] = useState(null)
  const [agregando, setAgregando] = useState(false)
  const [clave, setClave] = useState(null) // { titulo, email, clave }
  const [aviso, setAviso] = useState('')
  const [error, setError] = useState('')

  const cargar = useCallback(() => api(base).then(setDatos).catch((e) => setError(e.message)), [base])
  // Roles que puede asignar quien está usando la pantalla
  const rolesAsignables = (datos?.roles ?? []).filter((r) => puedeDuenos || r.codigo !== 'dueno')
  const editable = (m) => m.usuarioId !== yoId && (puedeDuenos || m.rolCodigo !== 'dueno')
  useEffect(() => { cargar() }, [cargar])

  const mostrarAviso = (t) => { setAviso(t); setTimeout(() => setAviso(''), 2600) }
  const conError = (fn) => async (...args) => {
    setError('')
    try {
      await fn(...args)
    } catch (e) {
      setError(e.message)
      cargar()
    }
  }

  const agregar = async (cuerpo) => {
    const r = await api(base, { metodo: 'POST', body: cuerpo })
    setAgregando(false)
    await cargar()
    if (r.passwordTemporal) setClave({ titulo: 'Usuario creado', email: cuerpo.email.toLowerCase(), clave: r.passwordTemporal })
    else mostrarAviso('Ya tenía cuenta: ahora también tiene acceso a esta empresa')
  }

  const cambiar = conError(async (m, cambios) => {
    await api(`${base}/${m.membresiaId}`, { metodo: 'PATCH', body: cambios })
    await cargar()
    mostrarAviso('Usuario actualizado')
  })

  const restablecer = conError(async (m) => {
    if (!window.confirm(`¿Generar una contraseña nueva para ${m.nombre}? Se cerrarán sus sesiones abiertas.`)) return
    const r = await api(`${base}/${m.membresiaId}/restablecer-password`, { metodo: 'POST' })
    setClave({ titulo: 'Contraseña restablecida', email: m.email, clave: r.passwordTemporal })
  })

  return (
    <div className="card">
      <div className="card-head">
        <h2>Usuarios</h2>
        <button className="btn btn-registrar btn-sm" onClick={() => setAgregando(true)} disabled={!datos}>
          <UserPlus size={16} /> Agregar usuario
        </button>
      </div>
      {error && <div className="alerta-error" role="alert" style={{ marginBottom: 12 }}>{error}</div>}
      {!datos ? <div className="vacio">Cargando…</div> : (
        <div className="tabla-scroll">
          <table className="tabla">
            <thead><tr><th>Usuario</th><th>Rol</th><th className="ocultar-movil">Último acceso</th><th /></tr></thead>
            <tbody>
              {datos.miembros.map((m) => (
                <tr key={m.membresiaId} className={m.estado === 'suspendido' ? 'fila-apagada' : ''}>
                  <td>
                    <strong>{m.nombre}</strong>
                    <div className="sub">{m.email}</div>
                    {m.debeCambiarPassword && <span className="badge aviso">Contraseña temporal</span>}
                    {m.estado === 'suspendido' && <span className="badge mal">Suspendido</span>}
                  </td>
                  <td>
                    {editable(m) ? (
                      <select className="input input-sm" value={m.rolId} aria-label={`Rol de ${m.nombre}`}
                        onChange={(e) => cambiar(m, { rolId: e.target.value })}>
                        {rolesAsignables.map((r) => <option key={r.id} value={r.id}>{r.nombre}</option>)}
                      </select>
                    ) : (
                      <span>{m.rol}{m.usuarioId === yoId && <span className="sub"> (tú)</span>}</span>
                    )}
                  </td>
                  <td className="ocultar-movil">{haceCuanto(m.ultimoAccesoEn)}</td>
                  <td className="acciones-fila">
                    {editable(m) && (<>
                    <button className="btn btn-ghost btn-sm" onClick={() => cambiar(m, { estado: m.estado === 'activo' ? 'suspendido' : 'activo' })}>
                      {m.estado === 'activo' ? 'Suspender' : 'Reactivar'}
                    </button>
                    <button className="icon-btn" title="Restablecer contraseña" aria-label={`Restablecer contraseña de ${m.nombre}`} onClick={() => restablecer(m)}>
                      <KeyRound size={18} />
                    </button>
                    </>)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {agregando && datos && <Agregar roles={rolesAsignables} onAgregar={agregar} onClose={() => setAgregando(false)} />}
      {clave && <ClaveTemporal {...clave} onClose={() => setClave(null)} />}
      {aviso && <div className="toast">{aviso}</div>}
    </div>
  )
}
