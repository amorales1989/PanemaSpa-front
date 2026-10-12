// Achica una foto (de la cámara o un archivo) a un JPEG liviano para guardarla
export async function reducirImagen(archivo, lado = 480, calidad = 0.82) {
  if (!archivo.type.startsWith('image/')) throw new Error('El archivo no es una imagen')
  const bitmap = await createImageBitmap(archivo)
  // Recorte cuadrado centrado, así todas las fotos se ven parejas
  const corte = Math.min(bitmap.width, bitmap.height)
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = Math.min(lado, corte)
  canvas.getContext('2d').drawImage(
    bitmap,
    (bitmap.width - corte) / 2, (bitmap.height - corte) / 2, corte, corte,
    0, 0, canvas.width, canvas.height,
  )
  bitmap.close?.()
  return canvas.toDataURL('image/jpeg', calidad)
}
