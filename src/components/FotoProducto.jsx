import { useRef, useState } from 'react'
import { Camera, Loader2 } from 'lucide-react'
import ImagenProducto from './ImagenProducto'
import { useDatos } from '../context/DataContext'
import { reducirImagen } from '../lib/imagen'
import { useDialogo } from './Dialogo'

// Foto editable del producto: se toca (o se arrastra un archivo encima) para subirla.
// En el celular, el selector ofrece sacar la foto con la cámara.
export default function FotoProducto({ producto }) {
  const { imagenes, setImagen } = useDatos()
  const { avisar } = useDialogo()
  const inputRef = useRef(null)
  const [cargando, setCargando] = useState(false)
  const [arrastrando, setArrastrando] = useState(false)
  const tiene = !!imagenes[producto.id]

  const usar = async (archivo) => {
    if (!archivo) return
    setCargando(true)
    try {
      setImagen(producto.id, await reducirImagen(archivo))
    } catch {
      avisar({ tipo: 'error', titulo: 'No se pudo usar ese archivo', mensaje: 'Elige una foto (JPG, PNG o similar).' })
    } finally {
      setCargando(false)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <button
        type="button"
        className={`foto-producto ${arrastrando ? 'arrastrando' : ''}`}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setArrastrando(true) }}
        onDragLeave={() => setArrastrando(false)}
        onDrop={(e) => { e.preventDefault(); setArrastrando(false); usar(e.dataTransfer.files[0]) }}
        aria-label={tiene ? `Cambiar foto de ${producto.nombre}` : `Agregar foto a ${producto.nombre}`}
        title="Toca o arrastra una foto aquí"
      >
        <ImagenProducto producto={{ ...producto, tipo: 'producto' }} tamano={null} />
        <span className="foto-accion">
          {cargando ? <Loader2 size={12} className="girando" /> : <Camera size={12} />}
          {tiene ? 'Cambiar' : 'Agregar foto'}
        </span>
      </button>
      <input ref={inputRef} type="file" accept="image/*" hidden onChange={(e) => { usar(e.target.files[0]); e.target.value = '' }} />
      {tiene && <button type="button" className="link-quitar" onClick={() => setImagen(producto.id, null)}>Quitar foto</button>}
    </div>
  )
}
