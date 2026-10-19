import { useState } from 'react'
import { ArrowRight } from 'lucide-react'
import Modal from './Modal'
import { useDatos } from '../context/DataContext'
import { num } from '../lib/items'
import { cantStock } from '../lib/stock'

const MODOS = [
  { id: 'reposicion', label: 'Reposición', ayuda: 'Suma lo que entró al stock actual' },
  { id: 'conteo', label: 'Conteo', ayuda: 'Indica cuánto hay realmente; el stock queda en ese valor' },
]

const soloCantidad = (v) => v.replace('.', ',').replace(/[^\d,]/g, '').replace(/,(?=.*,)/g, '')

// Repone o cuenta el stock de uno o varios ítems. items: [{ tipo: 'producto' | 'insumo', id, nombre, unidad, stock, stockMinimo }]
export default function AjusteStock({ items, onClose }) {
  const { ajustarStock } = useDatos()
  const [modo, setModo] = useState('reposicion')
  const [cantidades, setCantidades] = useState(() => Object.fromEntries(items.map((i) => [i.id, ''])))
  const [motivo, setMotivo] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')

  const filas = items.map((i) => {
    const texto = cantidades[i.id]
    const valor = num(texto)
    const nuevo = texto === '' ? i.stock : modo === 'reposicion' ? i.stock + valor : valor
    const enteros = i.unidad === 'un' && !Number.isInteger(valor)
    return { ...i, texto, valor, nuevo, cambia: texto !== '' && (modo === 'conteo' || valor > 0), enteros }
  })
  const aplicar = filas.filter((f) => f.cambia)
  const invalida = filas.some((f) => f.enteros)

  const guardar = async (e) => {
    e.preventDefault()
    if (!aplicar.length || invalida) return
    setGuardando(true)
    setError('')
    try {
      await ajustarStock(aplicar.map((f) => ({ tipo: f.tipo, id: f.id, modo, cantidad: f.valor })), motivo.trim() || undefined)
      onClose()
    } catch (err) {
      setError(err.message)
      setGuardando(false)
    }
  }

  const uno = items.length === 1
  return (
    <Modal titulo={uno ? `Stock: ${items[0].nombre}` : `Reponer stock de ${items.length} ítems`} onClose={onClose}>
      <form className="form" onSubmit={guardar}>
        <div>
          <div className="segmented" role="radiogroup" aria-label="Tipo de ajuste">
            {MODOS.map((m) => (
              <button type="button" key={m.id} role="radio" aria-checked={modo === m.id} className={modo === m.id ? 'on' : ''} onClick={() => setModo(m.id)}>{m.label}</button>
            ))}
          </div>
          <div className="sub" style={{ marginTop: 6 }}>{MODOS.find((m) => m.id === modo).ayuda}.</div>
        </div>

        <div>
          {filas.map((f) => (
            <div className="linea" key={f.id} style={{ gridTemplateColumns: '1fr auto 110px' }}>
              <div className="linea-info">
                <div className="linea-nombre">{f.nombre}</div>
                <div className="linea-precio">
                  Hay {cantStock(f.stock, f.unidad)}{f.stockMinimo != null && ` · mínimo ${cantStock(f.stockMinimo, f.unidad)}`}
                </div>
              </div>
              <label className="precio-input">
                <input inputMode="decimal" placeholder={modo === 'reposicion' ? '+0' : '0'} value={f.texto} autoFocus={uno}
                  aria-label={`${modo === 'reposicion' ? 'Cantidad que entra de' : 'Stock real de'} ${f.nombre}`}
                  onChange={(e) => setCantidades((c) => ({ ...c, [f.id]: soloCantidad(e.target.value) }))} />
                <span className="sub">{f.unidad}</span>
              </label>
              <div className="linea-total" style={{ color: f.enteros ? 'var(--egreso)' : f.stockMinimo != null && f.nuevo <= f.stockMinimo ? 'var(--merma)' : undefined }}>
                {f.enteros ? 'Solo enteros' : f.cambia ? <><ArrowRight size={12} style={{ verticalAlign: -1 }} /> {cantStock(f.nuevo, f.unidad)}</> : ''}
              </div>
            </div>
          ))}
        </div>

        <div className="campo">
          <label htmlFor="stock-motivo">Nota <span style={{ fontWeight: 400 }}>(opcional)</span></label>
          <input id="stock-motivo" className="input" maxLength={200} placeholder={modo === 'reposicion' ? 'Ej: llegó pedido del proveedor' : 'Ej: conteo de fin de mes'}
            value={motivo} onChange={(e) => setMotivo(e.target.value)} />
        </div>

        {error && <div className="alerta-error" role="alert">{error}</div>}
        <button className="btn btn-primary btn-guardar" disabled={guardando || !aplicar.length || invalida}>
          {guardando ? 'Guardando…' : aplicar.length > 1 ? `Actualizar ${aplicar.length} ítems` : 'Actualizar stock'}
        </button>
      </form>
    </Modal>
  )
}
