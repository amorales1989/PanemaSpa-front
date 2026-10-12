// Genera el PDF en el navegador y lo descarga. La librería de PDF se carga
// recién al pedir el primer informe, para no hacer más pesada la app.
export async function descargarReporte(tipo, datos, periodo) {
  const [{ pdf }, { Documento }, { construirReporte }] = await Promise.all([
    import('@react-pdf/renderer'),
    import('./Documento'),
    import('./datos'),
  ])
  const reporte = construirReporte(tipo, datos, periodo)
  const blob = await pdf(<Documento reporte={reporte} />).toBlob()
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = reporte.archivo
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 10000)
  return reporte.archivo
}
