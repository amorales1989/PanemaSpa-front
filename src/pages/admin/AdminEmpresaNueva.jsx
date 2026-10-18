import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Building2 } from 'lucide-react'
import { api } from '../../lib/api'
import { LISTA_PAISES, PAIS_POR_DEFECTO } from '../../lib/paises'
import Modal from '../../components/Modal'
import { ClaveTemporal } from '../../components/Equipo'

const mensajeDe = (e) => Object.values(e.detalles ?? {})[0]?.[0] ?? e.message

// País del negocio: define moneda, huso horario, CUIT/RUT y las cuentas bancarias
export function SelectorPais({ valor, onChange, id = 'pais' }) {
  return (
    <div className="campo">
      <label id={`${id}-label`}>País</label>
      <div className="segmented" role="radiogroup" aria-labelledby={`${id}-label`}>
        {LISTA_PAISES.map((p) => (
          <button type="button" key={p.codigo} role="radio" aria-checked={valor === p.codigo}
            className={valor === p.codigo ? 'on' : ''} onClick={() => onChange(p.codigo)}>{p.nombre}</button>
        ))}
      </div>
    </div>
  )
}

// Alta de un negocio desde el panel: la empresa (14 días de prueba) y su dueño
export function NuevaEmpresa({ onClose }) {
  const navigate = useNavigate()
  const [form, setForm] = useState({ nombre: '', pais: PAIS_POR_DEFECTO, duenoNombre: '', duenoEmail: '' })
  const [creando, setCreando] = useState(false)
  const [error, setError] = useState('')
  const [creada, setCreada] = useState(null) // { id, passwordTemporal }
  const set = (campo) => (e) => setForm((f) => ({ ...f, [campo]: e.target.value }))

  const crear = async (e) => {
    e.preventDefault()
    setCreando(true)
    setError('')
    try {
      const r = await api('/admin/empresas', { metodo: 'POST', body: form })
      if (r.passwordTemporal) setCreada(r)
      else navigate(`/admin/empresas/${r.id}`) // el dueño ya tenía cuenta: entra con su contraseña de siempre
    } catch (err) {
      setError(mensajeDe(err))
      setCreando(false)
    }
  }

  if (creada) {
    return <ClaveTemporal titulo={`${form.nombre} creada`} email={form.duenoEmail} clave={creada.passwordTemporal}
      onClose={() => navigate(`/admin/empresas/${creada.id}`)} />
  }

  return (
    <Modal titulo="Nueva empresa" onClose={onClose}>
      <form className="form" onSubmit={crear}>
        <div className="campo">
          <label htmlFor="emp-nueva-nombre">Nombre del negocio</label>
          <input id="emp-nueva-nombre" className="input" required minLength={2} maxLength={100} autoFocus value={form.nombre} onChange={set('nombre')} />
        </div>
        <SelectorPais id="emp-nueva-pais" valor={form.pais} onChange={(pais) => setForm((f) => ({ ...f, pais }))} />
        <div className="campo">
          <label htmlFor="emp-nueva-dueno">Nombre del dueño</label>
          <input id="emp-nueva-dueno" className="input" required minLength={2} maxLength={100} value={form.duenoNombre} onChange={set('duenoNombre')} />
        </div>
        <div className="campo">
          <label htmlFor="emp-nueva-email">Email del dueño</label>
          <input id="emp-nueva-email" type="email" className="input" required maxLength={200} value={form.duenoEmail} onChange={set('duenoEmail')} />
          <div className="sub" style={{ marginTop: 6 }}>Si ya tiene cuenta, se le suma esta empresa. Si no, se crea con una contraseña temporal.</div>
        </div>
        <p className="sub">Arranca con 14 días de prueba y las listas habituales del país (medios de pago, categorías, etc.).</p>
        {error && <div className="alerta-error" role="alert">{error}</div>}
        <button className="btn btn-primary" disabled={creando}><Building2 size={18} /> {creando ? 'Creando…' : 'Crear empresa'}</button>
      </form>
    </Modal>
  )
}
