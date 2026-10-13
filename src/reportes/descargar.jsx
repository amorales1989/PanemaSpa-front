// Genera el PDF en el navegador y lo descarga. La librería de PDF se carga
// recién al pedir el primer informe, para no hacer más pesada la app.
// El logo se pasa como data URL: así el PDF no depende de volver a pedirlo
async function logoComoDataUrl(url) {
  if (!url) return null
  try {
    const blob = await (await fetch(url)).blob()
    return await new Promise((ok, mal) => {
      const lector = new FileReader()
      lector.onload = () => ok(lector.result)
      lector.onerror = mal
      lector.readAsDataURL(blob)
    })
  } catch {
    return null // sin logo, el informe usa la inicial
  }
}

export async function descargarReporte(tipo, datos, periodo, marca = 'Panema', logoUrl = null) {
  const [{ pdf }, { Documento }, { construirReporte }] = await Promise.all([
    import('@react-pdf/renderer'),
    import('./Documento'),
    import('./datos'),
  ])
  const reporte = construirReporte(tipo, datos, periodo)
  const logo = await logoComoDataUrl(logoUrl)
  const blob = await pdf(<Documento reporte={reporte} marca={marca} logo={logo} />).toBlob()
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  // "panema-resumen-..." → "<empresa>-resumen-..."
  const prefijo = marca.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'informe'
  const archivo = reporte.archivo.replace(/^panema-/, `${prefijo}-`)
  a.download = archivo
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 10000)
  return archivo
}
