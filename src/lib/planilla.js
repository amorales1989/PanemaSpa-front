// Lectura y armado de la planilla de catálogo (Excel o CSV).
// SheetJS se carga recién al usarla para no hacer más pesada la app.
const cargarXlsx = () => import('xlsx')

// ---------- Columnas ----------

// "Precio de venta ($)" → "precio de venta"
const normalizar = (t) => String(t ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
  .replace(/\(.*?\)/g, '').replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim()

const COLUMNAS = {
  codigo: ['codigo', 'cod', 'cod producto', 'codigo producto'],
  nombre: ['nombre', 'producto', 'insumo', 'promo', 'descripcion', 'nombre producto'],
  categoria: ['categoria', 'rubro', 'familia'],
  unidad: ['unidad', 'unidad de venta', 'unidad de compra', 'se vende', 'se compra por'],
  precio: ['precio', 'precio de venta', 'precio venta', 'precio de compra', 'precio compra', 'precio promo'],
  costo: ['costo', 'costo de produccion', 'costo unitario'],
  productos: ['productos', 'incluye', 'contenido'],
  activa: ['activa', 'activo', 'estado'],
}
const campoDe = (encabezado) => {
  const n = normalizar(encabezado)
  return Object.keys(COLUMNAS).find((c) => COLUMNAS[c].includes(n)) ?? null
}

// ---------- Valores ----------

// 2490 · "$2.490" · "2,5" · "1.250,50" → número
export function numero(v) {
  if (v === null || v === undefined || v === '') return undefined
  if (typeof v === 'number') return v
  let s = String(v).replace(/[$\s]/g, '')
  if (s.includes(',')) s = s.replace(/\./g, '').replace(',', '.')
  else if (/^\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, '')
  const n = Number(s)
  return Number.isFinite(n) ? n : NaN
}

const UNIDADES = { un: 'un', u: 'un', unidad: 'un', unidades: 'un', kg: 'kg', kilo: 'kg', kilos: 'kg', kilogramo: 'kg', lt: 'lt', l: 'lt', litro: 'lt', litros: 'lt' }
const unidadDe = (v) => UNIDADES[normalizar(v)] ?? null

const siNo = (v) => {
  const n = normalizar(v)
  if (!n) return undefined
  if (['si', 's', 'activa', 'activo', '1', 'true', 'x'].includes(n)) return true
  if (['no', 'n', 'inactiva', 'inactivo', '0', 'false'].includes(n)) return false
  return undefined
}

// "102 x1, 103 x2" · "102*2; 103" · "103 (2)" → [{ codigo, cantidad }]
export function productosDePromo(texto) {
  return String(texto ?? '').split(/[,;\n+]/).map((t) => t.trim()).filter(Boolean).map((t) => {
    const m = /^#?(\d+)\s*(?:[x×*]\s*|\(\s*)?(\d+(?:[.,]\d+)?)?\)?$/i.exec(t)
    if (!m) return { error: t }
    return { codigo: Number(m[1]), cantidad: m[2] ? Number(m[2].replace(',', '.')) : 1 }
  })
}

// ---------- Lectura ----------

const HOJAS = {
  productos: ['productos', 'producto', 'sheet1', 'hoja1', 'hoja 1'],
  insumos: ['insumos', 'insumo', 'materias primas'],
  promos: ['promos', 'promo', 'promociones', 'combos'],
}

// Filas de una hoja como objetos { fila, campo: valor } (fila = número de fila en Excel)
function filasDe(XLSX, hoja) {
  const matriz = XLSX.utils.sheet_to_json(hoja, { header: 1, blankrows: true, defval: '' })
  const iEnc = matriz.findIndex((r) => r.some((c) => campoDe(c)))
  if (iEnc < 0) return { filas: [], sinEncabezado: matriz.some((r) => r.some((c) => c !== '')) }
  const campos = matriz[iEnc].map(campoDe)
  const filas = []
  for (let i = iEnc + 1; i < matriz.length; i++) {
    const r = matriz[i]
    if (!r.some((c) => String(c).trim() !== '')) continue
    const o = { fila: i + 1 }
    campos.forEach((c, j) => { if (c) o[c] = typeof r[j] === 'string' ? r[j].trim() : r[j] })
    filas.push(o)
  }
  return { filas }
}

function validarComunes(f, hoja, errores, vistos) {
  const e = (mensaje) => errores.push({ hoja, fila: f.fila, mensaje })
  const nombre = String(f.nombre ?? '').trim()
  if (!nombre) e('Falta el nombre')
  const codigo = numero(f.codigo)
  if (codigo !== undefined && (!Number.isInteger(codigo) || codigo < 1)) e(`Código inválido: "${f.codigo}"`)
  if (codigo !== undefined) {
    if (vistos.codigos.has(codigo)) e(`El código ${codigo} está repetido en la hoja (fila ${vistos.codigos.get(codigo)})`)
    else vistos.codigos.set(codigo, f.fila)
  }
  const clave = nombre.toLowerCase()
  if (nombre && codigo === undefined) {
    if (vistos.nombres.has(clave)) e(`"${nombre}" está repetido en la hoja (fila ${vistos.nombres.get(clave)})`)
    else vistos.nombres.set(clave, f.fila)
  }
  return { nombre, codigo: Number.isInteger(codigo) ? codigo : undefined }
}

// Lee el archivo y devuelve { productos, insumos, promos, errores } listos para la API
export async function leerPlanilla(archivo) {
  const XLSX = await cargarXlsx()
  const libro = XLSX.read(await archivo.arrayBuffer(), { type: 'array' })
  const errores = []
  const resultado = { productos: [], insumos: [], promos: [], errores }

  const hojaDe = (tipo) => libro.SheetNames.find((n) => HOJAS[tipo].includes(normalizar(n)))
  // Un CSV (o un Excel de una sola hoja con otro nombre) se toma como lista de productos
  const nombres = { productos: hojaDe('productos') ?? (libro.SheetNames.length === 1 ? libro.SheetNames[0] : null), insumos: hojaDe('insumos'), promos: hojaDe('promos') }
  if (!nombres.productos && !nombres.insumos && !nombres.promos) {
    errores.push({ hoja: '—', fila: '—', mensaje: 'No encontré hojas llamadas Productos, Insumos o Promos. Usa la plantilla.' })
    return resultado
  }

  for (const tipo of ['productos', 'insumos', 'promos']) {
    if (!nombres[tipo]) continue
    const hoja = { productos: 'Productos', insumos: 'Insumos', promos: 'Promos' }[tipo]
    const { filas, sinEncabezado } = filasDe(XLSX, libro.Sheets[nombres[tipo]])
    if (sinEncabezado) errores.push({ hoja, fila: 1, mensaje: 'No encontré los títulos de las columnas (Código, Nombre, Precio…)' })
    const vistos = { codigos: new Map(), nombres: new Map() }

    for (const f of filas) {
      const antes = errores.length
      const e = (mensaje) => errores.push({ hoja, fila: f.fila, mensaje })
      const { nombre, codigo } = validarComunes(f, hoja, errores, vistos)
      const categoria = String(f.categoria ?? '').trim() || undefined
      const precio = numero(f.precio)

      if (tipo === 'promos') {
        if (!(precio > 0)) e('Falta el precio de la promo')
        const productos = productosDePromo(f.productos)
        if (!productos.length) e('Faltan los productos (ej: 102 x1, 103 x2)')
        for (const p of productos) if (p.error) e(`No entiendo "${p.error}" en productos (usa código x cantidad)`)
        if (errores.length === antes) {
          resultado.promos.push({ fila: f.fila, codigo, nombre, precio, productos, ...(siNo(f.activa) !== undefined && { activa: siNo(f.activa) }) })
        }
        continue
      }

      const unidad = unidadDe(f.unidad)
      if (!unidad) e(`Unidad inválida: "${f.unidad ?? ''}" (usa ${tipo === 'productos' ? 'un o kg' : 'un, kg o lt'})`)
      else if (tipo === 'productos' && unidad === 'lt') e('Los productos se venden por unidad (un) o por kilo (kg)')
      if (tipo === 'productos' && !(precio > 0)) e('Falta el precio de venta')
      if (tipo === 'insumos' && precio !== undefined && !(precio >= 0)) e(`Precio inválido: "${f.precio}"`)
      const costo = numero(f.costo)
      if (tipo === 'productos' && costo !== undefined && !(costo >= 0)) e(`Costo inválido: "${f.costo}"`)
      if (errores.length === antes) {
        resultado[tipo].push({
          fila: f.fila, codigo, nombre, categoria, unidad,
          ...(precio !== undefined && { precio }),
          ...(tipo === 'productos' && costo !== undefined && { costo }),
        })
      }
    }
  }
  return resultado
}

// ---------- Plantilla ----------

// Con catálogo cargado la plantilla trae los datos actuales (para editar precios y volver a subir);
// si está vacío, trae filas de ejemplo.
export async function descargarPlantilla({ productos, insumos, promos }, nombreEmpresa) {
  const XLSX = await cargarXlsx()
  const vacio = !productos.length && !insumos.length && !promos.length
  const codigoDe = Object.fromEntries(productos.map((p) => [p.id, p.codigo]))

  const filasProductos = vacio
    ? [[101, 'Marraqueta', 'Panes', 'kg', 2490, 1100], [102, 'Café americano', 'Cafetería', 'un', 1900, 400], [103, 'Medialuna', 'Pastelería', 'un', 900, 300]]
    : productos.map((p) => [p.codigo, p.nombre, p.categoria === 'Sin categoría' ? '' : p.categoria, p.unidad, p.precio, p.costo ?? ''])
  const filasInsumos = vacio
    ? [[501, 'Harina', 'Secos', 'kg', 880], [502, 'Huevos', 'Lácteos y huevos', 'un', 180]]
    : insumos.map((i) => [i.codigo, i.nombre, i.categoria === 'Sin categoría' ? '' : i.categoria, i.unidad, i.precio])
  const filasPromos = vacio
    ? [[901, 'Desayuno', 3200, '102 x1, 103 x2', 'sí']]
    : promos.map((p) => [p.codigo, p.nombre, p.precio, p.productos.map((c) => `${codigoDe[c.id]} x${c.cantidad}`).join(', '), p.activa ? 'sí' : 'no'])

  const hoja = (encabezados, filas, anchos) => {
    const h = XLSX.utils.aoa_to_sheet([encabezados, ...filas])
    h['!cols'] = anchos.map((wch) => ({ wch }))
    return h
  }
  const libro = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(libro, hoja([
    ['Cómo completar esta planilla'],
    [],
    ['• Productos: lo que vendes. Unidad "un" (por unidad) o "kg" (por kilo, se pesa en la venta).'],
    ['• Insumos: lo que compras para producir. Unidad "un", "kg" o "lt".'],
    ['• Promos: combos a precio especial. En "Productos" escribe código x cantidad, separados por coma: 102 x1, 103 x2'],
    ['• El código es opcional: si lo dejas vacío se asigna solo. Si el código (o el nombre) ya existe, se actualiza.'],
    ['• Las categorías que no existan se crean solas.'],
    ['• Precios sin puntos ni signo $ (ej: 2490). El costo es opcional.'],
    ['• Antes de guardar vas a ver una vista previa con los errores, fila por fila. Si hay errores no se guarda nada.'],
  ], [], [110]), 'Cómo completar')
  XLSX.utils.book_append_sheet(libro, hoja(['Código', 'Nombre', 'Categoría', 'Unidad (un / kg)', 'Precio de venta', 'Costo'], filasProductos, [8, 32, 18, 16, 15, 10]), 'Productos')
  XLSX.utils.book_append_sheet(libro, hoja(['Código', 'Nombre', 'Categoría', 'Unidad (un / kg / lt)', 'Precio de compra'], filasInsumos, [8, 32, 18, 18, 16]), 'Insumos')
  XLSX.utils.book_append_sheet(libro, hoja(['Código', 'Nombre', 'Precio', 'Productos (código x cantidad)', 'Activa (sí / no)'], filasPromos, [8, 28, 10, 34, 14]), 'Promos')

  const prefijo = normalizar(nombreEmpresa).replace(/ /g, '-') || 'catalogo'
  XLSX.writeFile(libro, `${prefijo}-${vacio ? 'plantilla' : 'catalogo'}.xlsx`)
}
