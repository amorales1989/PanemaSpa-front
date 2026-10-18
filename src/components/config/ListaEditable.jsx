import { useState } from 'react'
import { Check, Pencil, Plus, Trash2, X } from 'lucide-react'
import { api } from '../../lib/api'
import { useDialogo } from '../Dialogo'

// Una lista configurable (canales, medios de pago, categorías...): agregar, renombrar,
// activar/desactivar (pausar) y eliminar. Si lo eliminado ya se usó, el servidor lo archiva:
// desaparece de acá y de los formularios, y los registros viejos lo siguen mostrando.
// `conDescuento`: cada opción lleva un % de descuento en ventas (medios de pago)
export default function ListaEditable({ titulo, ayuda, lista, filas, extra = {}, etiqueta, conDescuento, onCambio }) {
  const [nuevo, setNuevo] = useState('')
  const [editando, setEditando] = useState(null) // { id, nombre, descuentoPct }
  const [error, setError] = useState('')
  const [ocupado, setOcupado] = useState(false)
  const [nota, setNota] = useState('')
  const { confirmar } = useDialogo()

  const ejecutar = async (fn) => {
    setOcupado(true)
    setError('')
    try {
      await fn()
      await onCambio()
      return true
    } catch (e) {
      setError(e.codigo === 'DUPLICADO' ? 'Ya existe uno con ese nombre' : Object.values(e.detalles ?? {})[0]?.[0] ?? e.message)
      return false
    } finally {
      setOcupado(false)
    }
  }

  const agregar = async (e) => {
    e.preventDefault()
    if (!nuevo.trim()) return
    if (await ejecutar(() => api(`/config/${lista}`, { metodo: 'POST', body: { nombre: nuevo.trim(), ...extra } }))) setNuevo('')
  }

  const renombrar = async (e) => {
    e.preventDefault()
    if (!editando.nombre.trim()) return
    const body = { nombre: editando.nombre.trim(), ...(conDescuento && { descuentoPct: Number(String(editando.descuentoPct).replace(',', '.')) || 0 }) }
    if (await ejecutar(() => api(`/config/${lista}/${editando.id}`, { metodo: 'PATCH', body }))) setEditando(null)
  }

  const alternar = (f) => ejecutar(() => api(`/config/${lista}/${f.id}`, { metodo: 'PATCH', body: { activo: !f.activo } }))

  const eliminar = async (f) => {
    const ok = await confirmar({
      titulo: `¿Eliminar "${f.nombre}"?`,
      mensaje: `Deja de aparecer en ${titulo.toLowerCase()} y en los formularios. Si ya se usó, los registros anteriores lo siguen mostrando.`,
      textoAceptar: 'Eliminar', peligro: true,
    })
    if (!ok) return
    setError('')
    try {
      const r = await api(`/config/${lista}/${f.id}`, { metodo: 'DELETE' })
      await onCambio()
      setNota(r?.archivada ? `"${f.nombre}" se eliminó. Los registros que ya lo usaban lo siguen mostrando.` : `"${f.nombre}" se eliminó.`)
      setTimeout(() => setNota(''), 4000)
    } catch (e) {
      setError(e.message)
    }
  }

  return (
    <div className="card lista-editable">
      <div className="card-head">
        <div>
          <h2>{titulo}</h2>
          {ayuda && <div className="sub">{ayuda}</div>}
        </div>
      </div>
      <ul>
        {filas.map((f) => (
          <li key={f.id} className={f.activo ? '' : 'inactiva'}>
            {editando?.id === f.id ? (
              <form className={`lista-editar ${conDescuento ? 'con-descuento' : ''}`} onSubmit={renombrar}>
                <input className="input input-sm" autoFocus value={editando.nombre} maxLength={60}
                  onChange={(e) => setEditando({ ...editando, nombre: e.target.value })} aria-label="Nuevo nombre" />
                {/* Medios de pago: el % va en una segunda línea para no achicar el nombre */}
                {conDescuento && (
                  <label className="lista-descuento">
                    Descuento en ventas
                    <input className="input input-sm" inputMode="decimal" value={editando.descuentoPct} aria-label="Porcentaje de descuento"
                      placeholder="0"
                      // Al entrar: sin el 0 para escribir limpio; si ya tiene un %, queda seleccionado para reemplazarlo
                      onFocus={(e) => (Number(editando.descuentoPct) ? e.target.select() : setEditando({ ...editando, descuentoPct: '' }))}
                      onChange={(e) => setEditando({ ...editando, descuentoPct: e.target.value.replace(/[^\d.,]/g, '') })} />
                    %
                  </label>
                )}
                <div className="lista-editar-acciones">
                  <button className="icon-btn" disabled={ocupado} aria-label="Guardar" title="Guardar"><Check size={18} /></button>
                  <button type="button" className="icon-btn" onClick={() => setEditando(null)} aria-label="Cancelar" title="Cancelar"><X size={18} /></button>
                </div>
              </form>
            ) : (
              <>
                <span className="lista-nombre">
                  {f.nombre}{etiqueta?.(f)}
                  {conDescuento && f.descuentoPct > 0 && <span className="badge bien" style={{ marginLeft: 8 }}>−{f.descuentoPct}% en ventas</span>}
                </span>
                <button className="icon-btn" onClick={() => setEditando({ id: f.id, nombre: f.nombre, descuentoPct: f.descuentoPct ?? 0 })}
                  aria-label={`Editar ${f.nombre}`} title={conDescuento ? 'Editar nombre y descuento' : 'Renombrar'}>
                  <Pencil size={15} />
                </button>
                <button className="icon-btn icon-peligro" onClick={() => eliminar(f)} aria-label={`Eliminar ${f.nombre}`} title="Eliminar" disabled={ocupado}>
                  <Trash2 size={15} />
                </button>
                <button type="button" role="switch" aria-checked={f.activo} aria-label={`${f.activo ? 'Desactivar' : 'Activar'} ${f.nombre}`}
                  className={`switch ${f.activo ? 'on' : ''}`} onClick={() => alternar(f)} disabled={ocupado}>
                  <span />
                </button>
              </>
            )}
          </li>
        ))}
        {!filas.length && <li className="sub">Todavía no hay ninguno.</li>}
      </ul>
      {error && <div className="alerta-error" role="alert">{error}</div>}
      {nota && <div className="sub lista-nota" role="status">{nota}</div>}
      <form className="lista-agregar" onSubmit={agregar}>
        <input className="input input-sm" placeholder="Agregar…" value={nuevo} maxLength={60} onChange={(e) => setNuevo(e.target.value)} aria-label={`Agregar a ${titulo}`} />
        <button className="btn btn-registrar btn-sm" disabled={ocupado || !nuevo.trim()}><Plus size={16} /> Agregar</button>
      </form>
    </div>
  )
}
