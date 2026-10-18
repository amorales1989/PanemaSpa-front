// Comprobante de venta imprimible: ticket de 80 mm (impresora térmica) u hoja carta/A4.
// Se arma como HTML independiente y se imprime desde un iframe oculto, así no depende
// de los estilos de la app y el diálogo de impresión muestra solo el comprobante.
import { urlArchivo } from './api'
import { dinero } from './format'
import { cantidadTexto, fmtNum, subtotal } from './items'

const escapar = (t) =>
  String(t ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c])

const fechaTexto = (iso) => iso.split('-').reverse().join('/')

const ESTILOS = {
  ticket: `
    /* El alto de página se fija al imprimir, según el largo del ticket (ver altoTicket) */
    body { width: 72mm; margin: 0 auto; padding: 4mm 0 6mm; font: 12px/1.35 'Courier New', monospace; color: #000; }
    .cabecera { text-align: center; }
    .logo { max-width: 34mm; max-height: 22mm; margin-bottom: 4px; filter: grayscale(1); }
    h1 { font-size: 15px; margin: 0 0 2px; }
    .sep { border-top: 1px dashed #000; margin: 6px 0; }
    table { width: 100%; border-collapse: collapse; }
    td { vertical-align: top; padding: 1px 0; }
    .num { text-align: right; white-space: nowrap; padding-left: 6px; }
    .cant { white-space: nowrap; padding-right: 6px; }
    .comp { font-size: 10px; padding-left: 10px; }
    .total { display: flex; justify-content: space-between; font-size: 16px; font-weight: bold; }
    .pie, .legal { text-align: center; }
    .legal { font-size: 10px; margin-top: 8px; }
  `,
  carta: `
    @page { size: A4; margin: 16mm; }
    body { margin: 0; font: 13px/1.45 system-ui, -apple-system, 'Segoe UI', sans-serif; color: #1d1d1d; }
    .cabecera { display: flex; align-items: center; gap: 16px; padding-bottom: 14px; border-bottom: 2px solid #1d1d1d; }
    .logo { max-width: 70px; max-height: 70px; }
    h1 { font-size: 22px; margin: 0 0 2px; }
    .titulo { display: flex; justify-content: space-between; align-items: baseline; margin: 18px 0 10px; }
    .titulo h2 { font-size: 17px; margin: 0; }
    .sep { display: none; }
    .datos { display: grid; grid-template-columns: repeat(4, auto); gap: 4px 24px; justify-content: start; margin-bottom: 16px; }
    .datos span { display: block; font-size: 11px; color: #666; }
    table { width: 100%; border-collapse: collapse; }
    th { text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: .04em; color: #666; border-bottom: 1px solid #999; padding: 6px 4px; }
    td { padding: 7px 4px; border-bottom: 1px solid #e3e3e3; vertical-align: top; }
    .num { text-align: right; white-space: nowrap; }
    .comp { font-size: 11px; color: #666; }
    .total { display: flex; justify-content: flex-end; gap: 32px; font-size: 20px; font-weight: 700; margin-top: 14px; }
    .pie { margin-top: 28px; text-align: center; }
    .legal { margin-top: 10px; font-size: 11px; color: #777; text-align: center; }
  `,
}

function lineas(venta, formato) {
  return venta.items.map((i) => {
    const comp = i.componentes?.length
      ? `<div class="comp">${i.componentes.map((c) => escapar(`${fmtNum(c.cantidad * i.cantidad)} ${c.unidad === 'un' ? '×' : c.unidad} ${c.nombre}`)).join('<br>')}</div>`
      : ''
    if (formato === 'ticket') {
      return `<tr><td class="cant">${escapar(cantidadTexto(i))}</td><td>${escapar(i.nombre)}${comp}</td><td class="num">${dinero(subtotal(i))}</td></tr>`
    }
    return `<tr><td>${i.codigo ? `${i.codigo}` : ''}</td><td>${escapar(i.nombre)}${comp}</td>
      <td class="num">${fmtNum(i.cantidad)} ${escapar(i.unidad)}</td><td class="num">${dinero(i.precio)}</td><td class="num">${dinero(subtotal(i))}</td></tr>`
  }).join('')
}

// empresa: la del perfil (/auth/yo); venta: la forma de ventaDesdeApi
export function htmlComprobante(venta, empresa) {
  const formato = empresa.comprobanteFormato === 'carta' ? 'carta' : 'ticket'
  const logo = empresa.logoUrl ? new URL(urlArchivo(empresa.logoUrl), window.location.origin).href : null
  const contacto = [empresa.razonSocial, empresa.rut && `RUT ${empresa.rut}`, empresa.direccion, empresa.telefono && `Tel. ${empresa.telefono}`]
    .filter(Boolean).map(escapar)
  const numero = String(venta.numero ?? '').padStart(6, '0')
  const datos = [
    ['Fecha', `${fechaTexto(venta.fecha)}${venta.hora ? ` ${venta.hora}` : ''}`],
    ['Canal', venta.categoria],
    ['Pago', venta.metodo],
    venta.usuario && ['Atendió', venta.usuario],
  ].filter(Boolean)

  const cabecera = `
    <div class="cabecera">
      ${logo ? `<img class="logo" src="${escapar(logo)}" alt="">` : ''}
      <div><h1>${escapar(empresa.nombre)}</h1>${contacto.map((c) => `<div>${c}</div>`).join('')}</div>
    </div>`

  const cuerpo = formato === 'ticket'
    ? `${cabecera}
      <div class="sep"></div>
      <div><b>Comprobante N° ${numero}</b></div>
      ${datos.map(([k, v]) => `<div>${k}: ${escapar(v)}</div>`).join('')}
      <div class="sep"></div>
      <table>${lineas(venta, formato)}</table>
      <div class="sep"></div>
      <div class="total"><span>TOTAL</span><span>${dinero(venta.monto)}</span></div>
      <div class="sep"></div>`
    : `${cabecera}
      <div class="titulo"><h2>Comprobante de venta</h2><b>N° ${numero}</b></div>
      <div class="datos">${datos.map(([k, v]) => `<div><span>${k}</span>${escapar(v)}</div>`).join('')}</div>
      <table>
        <thead><tr><th>Cód.</th><th>Descripción</th><th class="num">Cant.</th><th class="num">Precio</th><th class="num">Total</th></tr></thead>
        <tbody>${lineas(venta, formato)}</tbody>
      </table>
      <div class="total"><span>Total</span><span>${dinero(venta.monto)}</span></div>`

  return `<!doctype html><html lang="es"><head><meta charset="utf-8">
    <title>Comprobante ${numero}</title><style>${ESTILOS[formato]}</style></head>
    <body>${cuerpo}
      ${empresa.comprobantePie ? `<div class="pie">${escapar(empresa.comprobantePie)}</div>` : ''}
      <div class="legal">Comprobante interno. No válido como documento tributario.</div>
    </body></html>`
}

// Espera a que carguen las imágenes (el logo) para que no salga en blanco
const imagenesListas = (doc) =>
  Promise.all([...doc.images].map((img) => (img.complete ? null : new Promise((ok) => { img.onload = ok; img.onerror = ok }))))

// Rollo de 80 mm: la página mide lo mismo que el ticket, así la impresora corta justo al final
// (Chrome no acepta "size: 80mm auto")
function altoTicket(doc) {
  const mm = Math.ceil((doc.documentElement.scrollHeight * 25.4) / 96) + 2
  const estilo = doc.createElement('style')
  estilo.textContent = `@page { size: 80mm ${mm}mm; margin: 0; }`
  doc.head.appendChild(estilo)
}

export async function imprimirComprobante(venta, empresa) {
  const iframe = document.createElement('iframe')
  iframe.setAttribute('aria-hidden', 'true')
  Object.assign(iframe.style, { position: 'fixed', right: '0', bottom: '0', width: '0', height: '0', border: '0' })
  document.body.appendChild(iframe)
  const doc = iframe.contentDocument
  doc.open()
  doc.write(htmlComprobante(venta, empresa))
  doc.close()
  await Promise.race([imagenesListas(doc), new Promise((ok) => setTimeout(ok, 3000))])
  if (empresa.comprobanteFormato !== 'carta') altoTicket(doc)
  iframe.contentWindow.focus()
  iframe.contentWindow.print()
  // print() bloquea hasta cerrar el diálogo en la mayoría de los navegadores; en otros, se limpia después
  setTimeout(() => iframe.remove(), 60_000)
}

// Venta de ejemplo para la vista previa en Configuración
export const VENTA_EJEMPLO = {
  numero: 123, fecha: new Date().toISOString().slice(0, 10), hora: '12:30', categoria: 'Mostrador', metodo: 'Débito', usuario: 'Vendedor',
  items: [
    { tipo: 'producto', codigo: 101, nombre: 'Producto de ejemplo', unidad: 'un', cantidad: 2, precio: 1500 },
    { tipo: 'producto', codigo: 102, nombre: 'Producto por kilo', unidad: 'kg', cantidad: 0.5, precio: 3000 },
  ],
  monto: 4500,
}
