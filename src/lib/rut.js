// RUT chileno: valida el dígito verificador y lo deja como 76.123.456-7 (null si es inválido)
export function normalizarRut(valor) {
  const limpio = String(valor ?? '').replace(/[.\s-]/g, '').toUpperCase()
  const m = /^(\d{1,8})([\dK])$/.exec(limpio)
  if (!m) return null
  const [, cuerpo, dv] = m
  let suma = 0
  let factor = 2
  for (let i = cuerpo.length - 1; i >= 0; i--) {
    suma += Number(cuerpo[i]) * factor
    factor = factor === 7 ? 2 : factor + 1
  }
  const esperado = 11 - (suma % 11)
  const correcto = esperado === 11 ? '0' : esperado === 10 ? 'K' : String(esperado)
  return dv === correcto ? `${Number(cuerpo).toLocaleString('es-CL')}-${dv}` : null
}
