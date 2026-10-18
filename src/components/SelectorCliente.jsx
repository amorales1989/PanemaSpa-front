import { useEffect, useRef, useState } from 'react'
import { Check, CircleUser, Search, UserPlus, X } from 'lucide-react'
import { api } from '../lib/api'

const mensajeDe = (e) => Object.values(e.detalles ?? {})[0]?.[0] ?? e.message

// Cliente de la venta (opcional): busca por nombre, documento, teléfono o email, o da de alta uno nuevo.
// Va dentro del formulario de la venta: Enter elige o guarda acá, nunca finaliza la venta.
export default function SelectorCliente({ valor, onChange }) {
  const [texto, setTexto] = useState('')
  const [abierto, setAbierto] = useState(false)
  const [resultados, setResultados] = useState([])
  const [activo, setActivo] = useState(0)
  const [nuevo, setNuevo] = useState(null) // { nombre, documento, telefono, email }
  const [error, setError] = useState('')
  const [guardando, setGuardando] = useState(false)
  const caja = useRef(null)

  // Búsqueda en el servidor con una pequeña espera entre teclas
  useEffect(() => {
    if (!abierto) return
    const t = setTimeout(() => {
      api(`/clientes?buscar=${encodeURIComponent(texto.trim())}&limite=8`)
        .then((r) => { setResultados(r); setActivo(0) })
        .catch(() => setResultados([]))
    }, 200)
    return () => clearTimeout(t)
  }, [texto, abierto])

  // Clic afuera: se cierra la lista
  useEffect(() => {
    const fuera = (e) => !caja.current?.contains(e.target) && setAbierto(false)
    document.addEventListener('mousedown', fuera)
    return () => document.removeEventListener('mousedown', fuera)
  }, [])

  const elegir = (c) => {
    onChange({ id: c.id, nombre: c.nombre, documento: c.documento })
    setTexto('')
    setAbierto(false)
  }

  const empezarNuevo = () => {
    // Lo escrito se usa como documento si son números, si no como nombre
    const esNumero = /^[\d.\-\s]+[kK]?$/.test(texto.trim())
    setNuevo({ nombre: esNumero ? '' : texto.trim(), documento: esNumero ? texto.trim() : '', telefono: '', email: '' })
    setAbierto(false)
    setError('')
  }

  const teclas = (e) => {
    const opciones = resultados.length + 1 // + "Nuevo cliente"
    if (e.key === 'ArrowDown') { e.preventDefault(); setAbierto(true); setActivo((i) => (i + 1) % opciones) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActivo((i) => (i - 1 + opciones) % opciones) }
    else if (e.key === 'Escape') setAbierto(false)
    else if (e.key === 'Enter') {
      e.preventDefault()
      if (!abierto) return
      if (activo < resultados.length) elegir(resultados[activo])
      else empezarNuevo()
    }
  }

  const guardarNuevo = async () => {
    if (!nuevo.nombre.trim()) return setError('Escribe el nombre')
    setGuardando(true)
    setError('')
    try {
      const vacioANull = (v) => v.trim() || null
      const c = await api('/clientes', {
        metodo: 'POST',
        body: { nombre: nuevo.nombre.trim(), documento: vacioANull(nuevo.documento), telefono: vacioANull(nuevo.telefono), email: vacioANull(nuevo.email) },
      })
      setNuevo(null)
      elegir(c)
    } catch (err) {
      setError(mensajeDe(err))
    } finally {
      setGuardando(false)
    }
  }

  if (valor) {
    return (
      <div className="cliente-elegido">
        <CircleUser size={18} />
        <div>
          <strong>{valor.nombre}</strong>
          {valor.documento && <span className="sub">{valor.documento}</span>}
        </div>
        <button type="button" className="icon-btn" onClick={() => onChange(null)} aria-label="Quitar cliente" title="Quitar cliente"><X size={16} /></button>
      </div>
    )
  }

  if (nuevo) {
    const campo = (id, etiqueta, extra = {}) => (
      <input className="input input-sm" placeholder={etiqueta} aria-label={etiqueta} value={nuevo[id]} {...extra}
        onChange={(e) => setNuevo((n) => ({ ...n, [id]: e.target.value }))}
        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); guardarNuevo() } else if (e.key === 'Escape') setNuevo(null) }} />
    )
    return (
      <div className="cliente-nuevo">
        {campo('nombre', 'Nombre', { autoFocus: !nuevo.nombre, maxLength: 100 })}
        {campo('documento', 'RUT / DNI', { maxLength: 30, autoFocus: !!nuevo.nombre })}
        {campo('telefono', 'Teléfono', { type: 'tel', maxLength: 30 })}
        {campo('email', 'Email', { type: 'email', maxLength: 200 })}
        {error && <div className="alerta-error" role="alert">{error}</div>}
        <div className="acciones-form">
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => setNuevo(null)}>Cancelar</button>
          <button type="button" className="btn btn-registrar btn-sm" style={{ flex: 1 }} onClick={guardarNuevo} disabled={guardando}>
            <Check size={15} /> {guardando ? 'Guardando…' : 'Guardar cliente'}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="selector-cliente" ref={caja}>
      <label className="search search-sm">
        <Search size={16} />
        <input placeholder="Buscar por nombre, RUT/DNI o teléfono (opcional)" value={texto} aria-label="Cliente"
          role="combobox" aria-expanded={abierto} aria-controls="clientes-sugeridos"
          onFocus={() => setAbierto(true)} onChange={(e) => { setTexto(e.target.value); setAbierto(true) }} onKeyDown={teclas} />
      </label>
      {abierto && (
        <ul className="selector-cliente-lista" id="clientes-sugeridos" role="listbox">
          {resultados.map((c, i) => (
            <li key={c.id} role="option" aria-selected={i === activo} className={i === activo ? 'activo' : ''}
              onMouseDown={(e) => { e.preventDefault(); elegir(c) }} onMouseEnter={() => setActivo(i)}>
              <strong>{c.nombre}</strong>
              <span className="sub">{[c.documento, c.telefono].filter(Boolean).join(' · ') || 'Sin datos de contacto'}</span>
            </li>
          ))}
          <li role="option" aria-selected={activo === resultados.length} className={`selector-cliente-nuevo ${activo === resultados.length ? 'activo' : ''}`}
            onMouseDown={(e) => { e.preventDefault(); empezarNuevo() }} onMouseEnter={() => setActivo(resultados.length)}>
            <UserPlus size={15} /> Nuevo cliente{texto.trim() ? ` "${texto.trim()}"` : ''}
          </li>
        </ul>
      )}
    </div>
  )
}
