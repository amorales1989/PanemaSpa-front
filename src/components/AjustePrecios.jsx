import { useState } from 'react'
import { ArrowRight, TrendingUp, TrendingDown } from 'lucide-react'
import Modal from './Modal'
import ImagenProducto from './ImagenProducto'
import { useDatos } from '../context/DataContext'
import { dinero, porcentaje } from '../lib/format'

const REDONDEOS = [[1, 'Sin redondear'], [10, 'A $10'], [50, 'A $50'], [100, 'A $100']]

// Calcula el precio nuevo según el ajuste elegido
export function calcularPrecio(precio, { modo, sentido, valor, redondeo }) {
  const signo = sentido === 'subir' ? 1 : -1
  const bruto = modo === 'porcentaje' ? precio * (1 + (signo * valor) / 100) : precio + signo * valor
  return Math.round(bruto / redondeo) * redondeo
}

// Ajusta el precio de venta de uno o varios productos, por % o por monto
export default function AjustePrecios({ productos, onClose, onAplicado }) {
  const { ajustarPrecios } = useDatos()
  const [modo, setModo] = useState('porcentaje')
  const [sentido, setSentido] = useState('subir')
  const [valor, setValor] = useState('')
  const [redondeo, setRedondeo] = useState(10)

  const v = parseFloat(valor.replace(',', '.')) || 0
  const filas = productos.map((p) => {
    const nuevo = v ? calcularPrecio(p.precio, { modo, sentido, valor: v, redondeo }) : p.precio
    return { ...p, nuevo, invalido: nuevo <= 0 }
  })
  const hayInvalidos = filas.some((f) => f.invalido)
  const cambian = filas.filter((f) => f.nuevo !== f.precio && !f.invalido)
  const listo = v > 0 && !hayInvalidos && cambian.length > 0

  const aplicar = () => {
    if (!listo) return
    const motivo = `${sentido === 'subir' ? 'Aumento' : 'Rebaja'} ${modo === 'porcentaje' ? `${String(v).replace('.', ',')}%` : dinero(v)}`
    ajustarPrecios(cambian.map((f) => ({ id: f.id, precio: f.nuevo })), motivo)
    onAplicado?.()
    onClose()
  }

  const uno = productos.length === 1

  return (
    <Modal titulo={uno ? `Ajustar precio: ${productos[0].nombre}` : `Ajustar precios de ${productos.length} productos`} onClose={onClose}>
      <div className="form">
        <div className="fila">
          <div className="segmented">
            <button type="button" className={sentido === 'subir' ? 'on' : ''} onClick={() => setSentido('subir')}><TrendingUp size={14} style={{ verticalAlign: -2 }} /> Subir</button>
            <button type="button" className={sentido === 'bajar' ? 'on' : ''} onClick={() => setSentido('bajar')}><TrendingDown size={14} style={{ verticalAlign: -2 }} /> Bajar</button>
          </div>
          <div className="segmented">
            <button type="button" className={modo === 'porcentaje' ? 'on' : ''} onClick={() => setModo('porcentaje')}>Porcentaje %</button>
            <button type="button" className={modo === 'monto' ? 'on' : ''} onClick={() => setModo('monto')}>Monto $</button>
          </div>
        </div>

        <div className="campo">
          <label htmlFor="ajuste-valor">{sentido === 'subir' ? 'Aumento' : 'Rebaja'} {modo === 'porcentaje' ? 'en porcentaje' : 'en pesos por producto'}</label>
          <div className="monto-input">
            {modo === 'monto' && <span>$</span>}
            <input
              id="ajuste-valor" autoFocus inputMode="decimal" placeholder="0"
              value={valor} onChange={(e) => setValor(e.target.value.replace(modo === 'monto' ? /\D/g : /[^\d,.]/g, ''))}
              onKeyDown={(e) => e.key === 'Enter' && aplicar()}
            />
            {modo === 'porcentaje' && <span>%</span>}
          </div>
          {modo === 'porcentaje' && (
            <div className="chips chips-sm" style={{ marginTop: 10 }}>
              {[5, 10, 15, 20].map((n) => <button type="button" key={n} className={`chip ${v === n ? 'on' : ''}`} onClick={() => setValor(String(n))}>{n}%</button>)}
            </div>
          )}
        </div>

        <div className="campo">
          <label>Redondear el precio final</label>
          <div className="chips chips-sm">
            {REDONDEOS.map(([n, t]) => <button type="button" key={n} className={`chip ${redondeo === n ? 'on' : ''}`} onClick={() => setRedondeo(n)}>{t}</button>)}
          </div>
        </div>

        <div className="campo">
          <label>Vista previa</label>
          <div className="preview-precios">
            {filas.map((f) => (
              <div key={f.id} className={`preview-fila ${f.invalido ? 'invalida' : ''}`}>
                <ImagenProducto producto={{ ...f, tipo: 'producto' }} tamano={30} />
                <span className="preview-nombre">{f.nombre}</span>
                <span className="preview-antes">{dinero(f.precio)}</span>
                <ArrowRight size={14} color="var(--muted)" />
                <strong className="preview-despues">{f.invalido ? 'Inválido' : dinero(f.nuevo)}</strong>
                <span className={`preview-dif ${f.nuevo >= f.precio ? 'sube' : 'baja'}`}>
                  {f.nuevo === f.precio || f.invalido ? '—' : `${f.nuevo > f.precio ? '+' : ''}${dinero(f.nuevo - f.precio)}`}
                </span>
              </div>
            ))}
          </div>
          {hayInvalidos && <div className="texto-error">Algunos precios quedarían en $0 o negativos. Usa un valor menor.</div>}
          {!hayInvalidos && v > 0 && modo === 'porcentaje' && redondeo > 1 && (
            <div className="sub" style={{ marginTop: 6 }}>Con el redondeo, el cambio real puede variar un poco del {porcentaje(v, 0)}.</div>
          )}
        </div>

        <div className="sub">Las ventas ya registradas mantienen su precio. Las promos conservan su precio especial.</div>

        <button type="button" className="btn btn-primary btn-guardar" disabled={!listo} style={{ opacity: listo ? 1 : 0.45 }} onClick={aplicar}>
          {listo ? `Aplicar a ${cambian.length} ${cambian.length === 1 ? 'producto' : 'productos'}` : hayInvalidos ? 'Hay precios inválidos' : 'Ingresa el ajuste'}
        </button>
      </div>
    </Modal>
  )
}
