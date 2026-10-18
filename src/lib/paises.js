// Lo que cambia según el país de la empresa: identificación fiscal, documentos, teléfonos y cuentas
// bancarias. El back tiene su par en src/utilidades/paises.js (moneda, huso horario, validaciones).
import { useAuth } from '../context/AuthContext'
import { normalizarRut } from './rut'

export const PAISES = {
  AR: {
    codigo: 'AR', nombre: 'Argentina',
    idFiscal: 'CUIT', idFiscalEjemplo: '20-12345678-6',
    documento: 'DNI / CUIT', documentoEjemplo: '30.123.456',
    telefonoEjemplo: '+54 9 11 1234-5678',
    tiposCuenta: { ahorro: 'Caja de ahorro', corriente: 'Cuenta corriente' },
    tipoCuentaInicial: 'ahorro',
    numeroCuenta: 'CBU / CVU', numeroCuentaEjemplo: '22 números',
    conAlias: true,
    bancos: [
      // Bancos
      'Banco Nación', 'Banco Provincia', 'Banco Ciudad', 'Galicia', 'Santander', 'BBVA', 'Macro', 'ICBC', 'HSBC',
      'Credicoop', 'Patagonia', 'Supervielle', 'Comafi', 'Hipotecario', 'Itaú', 'Banco de Córdoba', 'Banco Santa Fe',
      'Banco Entre Ríos', 'Banco San Juan', 'Banco del Sol', 'Columbia', 'Brubank',
      // Billeteras virtuales (CVU)
      'Mercado Pago', 'Ualá', 'Naranja X', 'Personal Pay', 'MODO', 'Cuenta DNI', 'Lemon', 'Prex',
    ],
  },
  CL: {
    codigo: 'CL', nombre: 'Chile',
    idFiscal: 'RUT', idFiscalEjemplo: '76.123.456-7',
    documento: 'RUT', documentoEjemplo: '12.345.678-9',
    telefonoEjemplo: '+56 9 1234 5678',
    tiposCuenta: { corriente: 'Cuenta corriente', vista: 'Cuenta vista', rut: 'CuentaRUT', ahorro: 'Cuenta de ahorro' },
    tipoCuentaInicial: 'corriente',
    numeroCuenta: 'N° de cuenta', numeroCuentaEjemplo: '',
    conAlias: false,
    bancos: [
      // Bancos
      'Banco de Chile', 'BancoEstado', 'Santander', 'BCI', 'Scotiabank', 'Itaú', 'BICE', 'Security', 'Banco Falabella',
      'Banco Ripley', 'Consorcio', 'Banco Internacional', 'BTG Pactual', 'HSBC',
      // Cooperativas y cajas
      'Coopeuch', 'Oriencoop', 'Ahorrocoop', 'Detacoop', 'Tapp (Caja Los Andes)',
      // Cuentas digitales y prepago
      'Mercado Pago', 'MACH', 'Tenpo', 'Superdigital', 'Copec Pay', 'Global66', 'Prex', 'Prepago Los Héroes',
    ],
  },
}
export const LISTA_PAISES = Object.values(PAISES)
export const PAIS_POR_DEFECTO = 'AR'

export const paisDe = (codigo) => PAISES[codigo] ?? PAISES[PAIS_POR_DEFECTO]

// País de la empresa activa
export function usePais() {
  const { empresa } = useAuth()
  return paisDe(empresa?.pais)
}

// CUIT/CUIL argentino: 11 dígitos con verificador → "20-12345678-6" (null si es inválido)
export function normalizarCuit(valor) {
  const d = String(valor ?? '').replace(/\D/g, '')
  if (d.length !== 11) return null
  const suma = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2].reduce((t, p, i) => t + p * Number(d[i]), 0)
  const resto = 11 - (suma % 11)
  const verificador = resto === 11 ? 0 : resto === 10 ? 9 : resto
  return verificador === Number(d[10]) ? `${d.slice(0, 2)}-${d.slice(2, 10)}-${d[10]}` : null
}

// RUT (Chile) o CUIT (Argentina) con su formato; null si el dígito verificador no calza
export const normalizarIdFiscal = (codigo, valor) => (codigo === 'CL' ? normalizarRut(valor) : normalizarCuit(valor))

const soloDigitos = (t) => String(t ?? '').replace(/\D/g, '')

// Número para wa.me según el país:
// Argentina: celulares con 549 + característica + número ("011 15 1234-5678" → 5491112345678)
// Chile: 56 + los 9 dígitos del celular
export function numeroWhatsapp(telefono, codigo) {
  let d = soloDigitos(telefono)
  if (codigo === 'CL') return d.length === 9 ? `56${d}` : d
  if (d.startsWith('54')) d = d.slice(2)
  if (d.startsWith('9')) d = d.slice(1)
  if (d.startsWith('0')) d = d.slice(1)
  // El "15" de los celulares va después de la característica (2 a 4 dígitos) y se quita
  if (d.length === 12) {
    const m = /^(\d{2,4})15(\d+)$/.exec(d)
    if (m && m[1].length + m[2].length === 10) d = m[1] + m[2]
  }
  return d.length === 10 ? `549${d}` : soloDigitos(telefono)
}
