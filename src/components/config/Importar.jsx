import { useRef, useState } from 'react'
import { CheckCircle2, FileDown, FileUp, Upload } from 'lucide-react'
import { api } from '../../lib/api'
import { descargarPlantilla, leerPlanilla } from '../../lib/planilla'
import { useAuth } from '../../context/AuthContext'
import { useDatos } from '../../context/DataContext'

const plural = (n, uno, varios) => `${n.toLocaleString('es-CL')} ${n === 1 ? uno : varios}`

function Resumen({ r }) {
  const filas = [
    ['Productos', r.productos.creados, r.productos.actualizados, ['nuevo', 'nuevos']],
    ['Insumos', r.insumos.creados, r.insumos.actualizados, ['nuevo', 'nuevos']],
    ['Promos', r.promos.creadas, r.promos.actualizadas, ['nueva', 'nuevas']],
  ].filter(([, c, a]) => c || a)
  if (!filas.length) return <p className="sub">La planilla no trae cambios.</p>
  return (
    <div className="importar-resumen">
      {filas.map(([que, creados, actualizados, [uno, varios]]) => (
        <div key={que}>
          <span>{que}</span>
          <strong>{plural(creados, uno, varios)}</strong>
          {actualizados > 0 && <span className="sub">{plural(actualizados, 'se actualiza', 'se actualizan')}</span>}
        </div>
      ))}
    </div>
  )
}

export default function Importar() {
  const { empresa } = useAuth()
  const { productos, insumos, promos, recargar } = useDatos()
  const inputRef = useRef(null)
  const [archivo, setArchivo] = useState(null)
  const [estado, setEstado] = useState('inicio') // inicio | leyendo | vista | aplicando | listo
  const [lectura, setLectura] = useState(null)
  const [previa, setPrevia] = useState(null)
  const [error, setError] = useState('')
  const hayCatalogo = productos.length + insumos.length + promos.length > 0

  const elegir = async (f) => {
    if (!f) return
    setArchivo(f)
    setEstado('leyendo')
    setError('')
    setPrevia(null)
    try {
      const l = await leerPlanilla(f)
      setLectura(l)
      // Si la planilla ya tiene errores no hace falta preguntarle al servidor
      if (!l.errores.length) {
        setPrevia(await api('/importar/catalogo', { metodo: 'POST', body: { productos: l.productos, insumos: l.insumos, promos: l.promos, aplicar: false } }))
      }
      setEstado('vista')
    } catch (e) {
      setError(e.message.includes('Unsupported') || e.message.includes('Corrupted') ? 'No pude leer el archivo. Usa un Excel (.xlsx) o un CSV.' : e.message)
      setEstado('inicio')
    }
  }

  const aplicar = async () => {
    setEstado('aplicando')
    setError('')
    try {
      const r = await api('/importar/catalogo', { metodo: 'POST', body: { productos: lectura.productos, insumos: lectura.insumos, promos: lectura.promos, aplicar: true } })
      if (!r.aplicado) {
        setPrevia(r)
        setEstado('vista')
        return
      }
      setPrevia(r)
      setEstado('listo')
      await recargar() // el catálogo nuevo ya aparece en ventas, productos y promos
    } catch (e) {
      setError(e.message)
      setEstado('vista')
    }
  }

  const reiniciar = () => {
    setArchivo(null)
    setLectura(null)
    setPrevia(null)
    setEstado('inicio')
  }

  const errores = [...(lectura?.errores ?? []), ...(previa?.errores ?? [])]

  return (
    <div className="stack" style={{ maxWidth: 820 }}>
      <div className="card">
        <div className="card-head"><h2>1. Descarga la planilla</h2></div>
        <p className="sub" style={{ marginTop: 0 }}>
          {hayCatalogo
            ? 'Trae tu catálogo actual: edita precios o agrega filas y vuelve a subirla. Lo que ya existe se actualiza.'
            : 'Trae filas de ejemplo en tres hojas: Productos, Insumos y Promos. Reemplázalas por las tuyas.'}
        </p>
        <button className="btn btn-registrar" onClick={() => descargarPlantilla({ productos, insumos, promos }, empresa.nombre)}>
          <FileDown size={18} /> {hayCatalogo ? 'Descargar catálogo actual' : 'Descargar plantilla'}
        </button>
      </div>

      <div className="card">
        <div className="card-head"><h2>2. Sube la planilla completa</h2></div>
        <button
          type="button" className="zona-archivo"
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => { e.preventDefault(); elegir(e.dataTransfer.files[0]) }}
          disabled={estado === 'leyendo' || estado === 'aplicando'}
        >
          <Upload size={22} />
          <strong>{archivo ? archivo.name : 'Elegir archivo'}</strong>
          <span className="sub">{estado === 'leyendo' ? 'Revisando…' : 'Excel (.xlsx) o CSV · también puedes arrastrarlo aquí'}</span>
        </button>
        <input ref={inputRef} type="file" accept=".xlsx,.xls,.csv" hidden onChange={(e) => { elegir(e.target.files[0]); e.target.value = '' }} />
        {error && <div className="alerta-error" role="alert" style={{ marginTop: 12 }}>{error}</div>}
      </div>

      {(estado === 'vista' || estado === 'aplicando' || estado === 'listo') && (
        <div className="card">
          <div className="card-head"><h2>3. {estado === 'listo' ? 'Listo' : 'Revisa y confirma'}</h2></div>
          {estado === 'listo' ? (
            <div className="form">
              <div className="importar-ok"><CheckCircle2 size={22} /> Catálogo importado.</div>
              <Resumen r={previa} />
              <button className="btn btn-ghost" onClick={reiniciar}>Importar otra planilla</button>
            </div>
          ) : errores.length ? (
            <div className="form">
              <div className="alerta-error" role="alert">
                {plural(errores.length, 'fila tiene un problema', 'problemas encontrados')}. Corrígelos en la planilla y vuelve a subirla: no se guardó nada.
              </div>
              <div className="tabla-scroll">
                <table className="tabla">
                  <thead><tr><th>Hoja</th><th className="num">Fila</th><th>Problema</th></tr></thead>
                  <tbody>
                    {errores.slice(0, 200).map((e, i) => (
                      <tr key={i}><td>{e.hoja}</td><td className="num">{e.fila}</td><td>{e.mensaje}</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {errores.length > 200 && <p className="sub">Y {errores.length - 200} más…</p>}
            </div>
          ) : previa && (
            <div className="form">
              <Resumen r={previa} />
              <p className="sub">Las categorías nuevas se crean solas. Los cambios de precio quedan en el historial como "Importación".</p>
              <button className="btn btn-primary" onClick={aplicar} disabled={estado === 'aplicando'}>
                <FileUp size={18} /> {estado === 'aplicando' ? 'Importando…' : 'Importar'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
