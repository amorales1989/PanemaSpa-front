import { Document, Page, View, Text, StyleSheet, Font } from '@react-pdf/renderer'
import inter400 from '@fontsource/inter/files/inter-latin-400-normal.woff?url'
import inter500 from '@fontsource/inter/files/inter-latin-500-normal.woff?url'
import inter600 from '@fontsource/inter/files/inter-latin-600-normal.woff?url'
import inter700 from '@fontsource/inter/files/inter-latin-700-normal.woff?url'
import fraunces600 from '@fontsource/fraunces/files/fraunces-latin-600-normal.woff?url'
import { dinero, dineroCorto, porcentaje } from '../lib/format'

Font.register({
  family: 'Inter',
  fonts: [
    { src: inter400, fontWeight: 400 },
    { src: inter500, fontWeight: 500 },
    { src: inter600, fontWeight: 600 },
    { src: inter700, fontWeight: 700 },
  ],
})
Font.register({ family: 'Fraunces', src: fraunces600, fontWeight: 600 })
Font.registerHyphenationCallback((palabra) => [palabra])

const C = {
  tinta: '#2b2420', suave: '#7d7168', linea: '#ece4d8', crema: '#f6f1e9', crema2: '#faf6f0',
  marca: '#3b2a20', marcaSuave: '#f3e3c3', verde: '#2f7d5b', verdeSuave: '#e3f1ea', rojo: '#c2513f', rojoSuave: '#f8e5e1',
}

const s = StyleSheet.create({
  pagina: { fontFamily: 'Inter', fontSize: 9, color: C.tinta, paddingTop: 64, paddingBottom: 52, paddingHorizontal: 40, backgroundColor: '#fff' },
  encabezado: { position: 'absolute', top: 22, left: 40, right: 40, flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: C.linea, paddingBottom: 10 },
  logo: { width: 22, height: 22, borderRadius: 6, backgroundColor: C.marca, alignItems: 'center', justifyContent: 'center', marginRight: 8 },
  logoLetra: { fontFamily: 'Fraunces', fontSize: 13, color: C.marcaSuave, marginTop: -1 },
  marcaNombre: { fontFamily: 'Fraunces', fontSize: 12 },
  marcaSub: { fontSize: 7, color: C.suave, letterSpacing: 0.6, textTransform: 'uppercase' },
  encabezadoDer: { marginLeft: 'auto', textAlign: 'right', fontSize: 7.5, color: C.suave },
  pie: { position: 'absolute', bottom: 22, left: 40, right: 40, flexDirection: 'row', justifyContent: 'space-between', fontSize: 7.5, color: C.suave, borderTopWidth: 1, borderTopColor: C.linea, paddingTop: 8 },

  portada: { backgroundColor: C.marca, borderRadius: 14, padding: 24, marginBottom: 20 },
  portadaEtiqueta: { fontSize: 8, color: C.marcaSuave, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8 },
  portadaTitulo: { fontFamily: 'Fraunces', fontSize: 26, color: '#fff', marginBottom: 8 },
  portadaPeriodo: { fontSize: 11, color: '#f6ead6', fontWeight: 500 },
  portadaGenerado: { fontSize: 8, color: C.marcaSuave, marginTop: 4, opacity: 0.8 },

  seccion: { marginBottom: 14 },
  seccionTitulo: { fontFamily: 'Fraunces', fontSize: 19, marginBottom: 3 },
  seccionSub: { fontSize: 9, color: C.suave },

  bloque: { marginBottom: 16 },
  bloqueTitulo: { fontSize: 11, fontWeight: 600, marginBottom: 2 },
  bloqueSub: { fontSize: 7.5, color: C.suave, marginBottom: 8 },

  kpis: { flexDirection: 'row', marginHorizontal: -4, marginBottom: 12 },
  kpi: { flex: 1, marginHorizontal: 4, backgroundColor: C.crema2, borderRadius: 10, padding: 11, borderWidth: 1, borderColor: C.linea },
  kpiDestacado: { backgroundColor: C.marca, borderColor: C.marca },
  kpiLabel: { fontSize: 7.5, color: C.suave, fontWeight: 500, marginBottom: 6 },
  kpiValor: { fontSize: 15, fontWeight: 700, letterSpacing: -0.3 },
  kpiNota: { fontSize: 7, color: C.suave, marginTop: 5 },
  pill: { alignSelf: 'flex-start', borderRadius: 8, paddingHorizontal: 5, paddingVertical: 1.5, fontSize: 7, fontWeight: 600, marginTop: 6 },

  puntos: { backgroundColor: C.crema, borderRadius: 10, padding: 14, marginBottom: 16 },
  punto: { flexDirection: 'row', marginTop: 5, fontSize: 9, lineHeight: 1.4 },
  vineta: { width: 10, color: C.marca, fontWeight: 700 },

  leyenda: { flexDirection: 'row', marginBottom: 8 },
  leyendaItem: { flexDirection: 'row', alignItems: 'center', marginRight: 12, fontSize: 7.5, color: C.suave },
  leyendaColor: { width: 7, height: 7, borderRadius: 2, marginRight: 4 },

  rankingFila: { marginBottom: 7 },
  rankingTop: { flexDirection: 'row', fontSize: 8.5, marginBottom: 3 },
  barraFondo: { height: 5, borderRadius: 3, backgroundColor: C.crema },
  barra: { height: 5, borderRadius: 3 },

  tablaFila: { flexDirection: 'row', borderBottomWidth: 0.5, borderBottomColor: C.linea, paddingVertical: 5 },
  tablaCabecera: { flexDirection: 'row', backgroundColor: C.crema, borderRadius: 6, paddingVertical: 5, marginBottom: 1 },
  tablaCelda: { paddingHorizontal: 5, fontSize: 8 },
  tablaTotal: { flexDirection: 'row', paddingVertical: 6, borderTopWidth: 1.2, borderTopColor: C.marca, marginTop: -0.5 },
})

function Delta({ valor, subirEsMalo, sobreOscuro }) {
  if (valor === null || valor === undefined || !isFinite(valor)) return null
  const bien = valor >= 0 !== !!subirEsMalo
  const estilo = sobreOscuro
    ? { backgroundColor: 'rgba(255,255,255,0.15)', color: '#fff' }
    : { backgroundColor: bien ? C.verdeSuave : C.rojoSuave, color: bien ? C.verde : C.rojo }
  return <Text style={[s.pill, estilo]}>{`${valor >= 0 ? '+' : '-'}${porcentaje(Math.abs(valor), 0)} vs período anterior`}</Text>
}

function Kpis({ items, chico }) {
  return (
    <View style={s.kpis} wrap={false}>
      {items.map((k) => (
        <View key={k.label} style={[s.kpi, k.destacado && s.kpiDestacado]}>
          <Text style={[s.kpiLabel, k.destacado && { color: C.marcaSuave }]}>{k.label}</Text>
          <Text style={[s.kpiValor, chico && { fontSize: 12 }, k.texto && { fontSize: 11.5 }, k.destacado && { color: '#fff' }]}>{k.valor}</Text>
          <Delta valor={k.delta} subirEsMalo={k.subirEsMalo} sobreOscuro={k.destacado} />
          {k.nota && <Text style={[s.kpiNota, k.destacado && { color: C.marcaSuave }]}>{k.nota}</Text>}
        </View>
      ))}
    </View>
  )
}

function Titulo({ titulo, sub }) {
  return (
    <>
      <Text style={s.bloqueTitulo} minPresenceAhead={80}>{titulo}</Text>
      <Text style={s.bloqueSub}>{sub ?? ' '}</Text>
    </>
  )
}

// Gráfico de columnas (admite valores negativos, p. ej. ganancia)
function Barras({ titulo, sub, series, datos }) {
  const ALTO = 150
  const valores = datos.flatMap((d) => series.map((x) => d[x.clave]))
  const max = Math.max(...valores, 0)
  const min = Math.min(...valores, 0)
  const rango = max - min || 1
  const escala = ALTO / rango
  const cero = -min * escala
  const marcas = [0, 0.25, 0.5, 0.75, 1].map((f) => min + rango * f)
  const cadaN = Math.ceil(datos.length / 12)
  const esPct = series.length === 1 && series[0].clave === 'pct'

  return (
    <View style={s.bloque} wrap={false}>
      <Titulo titulo={titulo} sub={sub} />
      {series.length > 1 && (
        <View style={s.leyenda}>
          {series.map((x) => (
            <View key={x.clave} style={s.leyendaItem}><View style={[s.leyendaColor, { backgroundColor: x.color }]} /><Text>{x.nombre}</Text></View>
          ))}
        </View>
      )}
      <View style={{ flexDirection: 'row' }}>
        <View style={{ width: 40, height: ALTO, position: 'relative' }}>
          {marcas.map((m) => (
            <Text key={m} style={{ position: 'absolute', right: 6, bottom: (m - min) * escala - 4, fontSize: 6.5, color: C.suave }}>
              {esPct ? `${m.toFixed(1)}%` : dineroCorto(m)}
            </Text>
          ))}
        </View>
        <View style={{ flex: 1 }}>
          <View style={{ height: ALTO, position: 'relative', flexDirection: 'row' }}>
            {marcas.map((m) => (
              <View key={m} style={{ position: 'absolute', left: 0, right: 0, bottom: (m - min) * escala, borderTopWidth: 0.5, borderTopColor: Math.abs(m) < 1e-9 ? C.suave : C.linea }} />
            ))}
            {datos.map((d, i) => (
              <View key={i} style={{ flex: 1, flexDirection: 'row', justifyContent: 'center', paddingHorizontal: datos.length > 15 ? 1 : 4 }}>
                {series.map((x) => {
                  const v = d[x.clave]
                  const h = Math.max(Math.abs(v) * escala, v ? 0.8 : 0)
                  return (
                    <View key={x.clave} style={{ flex: 1, maxWidth: 22, marginHorizontal: 0.6, position: 'relative', height: ALTO }}>
                      <View style={{ position: 'absolute', left: 0, right: 0, bottom: v >= 0 ? cero : cero - h, height: h, backgroundColor: x.color, borderRadius: 2 }} />
                    </View>
                  )
                })}
              </View>
            ))}
          </View>
          <View style={{ flexDirection: 'row', marginTop: 4 }}>
            {datos.map((d, i) => (
              <Text key={i} style={{ flex: 1, fontSize: 6.5, color: C.suave, textAlign: 'center' }}>{i % cadaN === 0 ? d.label : ''}</Text>
            ))}
          </View>
        </View>
      </View>
    </View>
  )
}

function Ranking({ titulo, items, total, color }) {
  const max = Math.max(...items.map((i) => i.valor), 1)
  return (
    <View style={s.bloque} wrap={false}>
      <Titulo titulo={titulo} />
      {items.map((i) => (
        <View key={i.nombre} style={s.rankingFila}>
          <View style={s.rankingTop}>
            <Text style={{ flex: 1 }}>
              {i.nombre}
              {total ? <Text style={{ color: C.suave }}>{`  ${Math.round((i.valor / total) * 100)}%`}</Text> : null}
              {i.extra ? <Text style={{ color: C.suave }}>{`  ·  ${i.extra}`}</Text> : null}
            </Text>
            <Text style={{ fontWeight: 600 }}>{dinero(i.valor)}</Text>
          </View>
          <View style={s.barraFondo}><View style={[s.barra, { width: `${(i.valor / max) * 100}%`, backgroundColor: color }]} /></View>
        </View>
      ))}
      {items.length === 0 && <Text style={{ color: C.suave }}>Sin datos en el período.</Text>}
    </View>
  )
}

function Tabla({ titulo, columnas, filas, total, nota }) {
  const celda = (c, extra) => [s.tablaCelda, { width: `${c.w}%`, textAlign: c.num ? 'right' : 'left' }, extra]
  const fila = (f, i) => (
    <View key={i} style={[s.tablaFila, i % 2 === 1 && { backgroundColor: C.crema2 }]} wrap={false}>
      {f.map((v, j) => <Text key={j} style={celda(columnas[j], j === 1 && { fontWeight: 500 })}>{String(v)}</Text>)}
    </View>
  )
  return (
    <View style={s.bloque}>
      {/* Título, cabecera y primera fila siempre juntos: no quedan solos al final de una página */}
      <View wrap={false}>
        <Titulo titulo={titulo} sub={`${filas.length} ${filas.length === 1 ? 'fila' : 'filas'}`} />
        <View style={s.tablaCabecera}>
          {columnas.map((c, j) => <Text key={j} style={celda(c, { fontSize: 7.5, fontWeight: 600, color: C.suave })}>{c.t}</Text>)}
        </View>
        {filas.length > 0 && fila(filas[0], 0)}
      </View>
      {filas.slice(1).map((f, i) => fila(f, i + 1))}
      {filas.length === 0 && <Text style={{ color: C.suave, paddingVertical: 8 }}>Sin registros en el período.</Text>}
      {total && (
        <View style={s.tablaTotal} wrap={false}>
          {total.map((v, j) => <Text key={j} style={celda(columnas[j], { fontWeight: 700 })}>{v}</Text>)}
        </View>
      )}
      {nota && <Text style={{ fontSize: 7, color: C.suave, marginTop: 6 }}>{nota}</Text>}
    </View>
  )
}

function Bloque({ b }) {
  switch (b.tipo) {
    case 'seccion':
      return (
        <View style={s.seccion}>
          <Text style={s.seccionTitulo}>{b.titulo}</Text>
          <Text style={s.seccionSub}>{b.sub}</Text>
        </View>
      )
    case 'kpis': return <Kpis {...b} />
    case 'puntos':
      return (
        <View style={s.puntos} wrap={false}>
          <Text style={{ fontSize: 11, fontWeight: 600, marginBottom: 2 }}>{b.titulo}</Text>
          {b.items.map((t) => <View key={t} style={s.punto}><Text style={s.vineta}>•</Text><Text style={{ flex: 1 }}>{t}</Text></View>)}
        </View>
      )
    case 'barras': return <Barras {...b} />
    case 'ranking': return <Ranking {...b} />
    case 'tabla': return <Tabla {...b} />
    case 'dos':
      return (
        <View style={{ flexDirection: 'row', marginHorizontal: -10 }} wrap={false}>
          {b.bloques.map((x, i) => <View key={i} style={{ flex: 1, marginHorizontal: 10 }}><Bloque b={x} /></View>)}
        </View>
      )
    default: return null
  }
}

export function Documento({ reporte }) {
  return (
    <Document title={`${reporte.titulo} · Panema`} author="Panema" creator="Panema · Control del negocio">
      {reporte.partes.map((bloques, i) => (
        <Page key={i} size="A4" style={s.pagina}>
          <View style={s.encabezado} fixed>
            <View style={s.logo}><Text style={s.logoLetra}>P</Text></View>
            <View>
              <Text style={s.marcaNombre}>Panema</Text>
              <Text style={s.marcaSub}>Control del negocio</Text>
            </View>
            <View style={s.encabezadoDer}>
              <Text style={{ fontWeight: 600, color: C.tinta }}>{reporte.titulo}</Text>
              <Text>{reporte.periodo}</Text>
            </View>
          </View>

          {i === 0 && (
            <View style={s.portada}>
              <Text style={s.portadaEtiqueta}>Informe</Text>
              <Text style={s.portadaTitulo}>{reporte.titulo}</Text>
              <Text style={s.portadaPeriodo}>{reporte.periodo}</Text>
              <Text style={s.portadaGenerado}>Generado el {reporte.generado}</Text>
            </View>
          )}

          {bloques.map((b, j) => <Bloque key={j} b={b} />)}

          <View style={s.pie} fixed>
            <Text>Panema · {reporte.titulo}</Text>
            <Text render={({ pageNumber, totalPages }) => `Página ${pageNumber} de ${totalPages}`} />
          </View>
        </Page>
      ))}
    </Document>
  )
}
