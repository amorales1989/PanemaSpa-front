import { useState } from 'react'
import { FileDown, Loader2 } from 'lucide-react'
import { useDatos } from '../context/DataContext'
import { useAuth } from '../context/AuthContext'
import { useDialogo } from './Dialogo'
import { descargarReporte } from '../reportes/descargar'

// Botón que genera y descarga el informe PDF `tipo` para el `periodo` indicado
export default function BotonPDF({ tipo, periodo, texto = 'Descargar PDF', className = 'btn btn-pdf' }) {
  const datos = useDatos()
  const { empresa } = useAuth()
  const { avisar } = useDialogo()
  const [generando, setGenerando] = useState(false)

  const descargar = async () => {
    setGenerando(true)
    try {
      await descargarReporte(tipo, datos, periodo, empresa.nombre)
    } catch (e) {
      console.error(e)
      avisar({ tipo: 'error', titulo: 'No se pudo generar el PDF', mensaje: 'Revisa tu conexión e intenta de nuevo.' })
    } finally {
      setGenerando(false)
    }
  }

  return (
    <button className={className} onClick={descargar} disabled={generando}>
      {generando ? <Loader2 size={17} className="girando" /> : <FileDown size={17} />}
      {generando ? 'Generando…' : texto}
    </button>
  )
}
