// Informe de evolución en PDF (A4, 2 páginas). Componente puro: no importa
// recursos del navegador, para poder renderizarlo también en Node (tests).
import { Circle, Defs, Document, Ellipse, Line, LinearGradient, Page, Path, Rect, Stop, StyleSheet, Svg, Text, View } from '@react-pdf/renderer'
import type { ReactNode } from 'react'
import { lineGeometry, type Box } from '@/lib/chart'
import { fmtDate, fmtDateRange, fmtDateShort, fmtDelta, fmtHeight, fmtNum, fmtPct } from '@/lib/format'
import {
  BMI_BANDS,
  METRICS,
  PERIMETERS,
  WHR_RISK,
  bmiSeries,
  series,
  sortMeasurements,
  summarize,
  weeksBetween,
  whrBands,
  whrSeries,
  type Band,
  type Point,
} from '@/lib/metrics'
import { AMPLIFY, BODY_H, BODY_W, LEVEL_Y, amplified, bodyShape, perimetersFrom, type PerimeterKey } from '@/lib/silhouette'
import type { ProgressData } from '@/lib/types'

const C = {
  ink: '#10291d',
  soft: '#3e5a4b',
  faint: '#6b8277',
  line: '#dce8e0',
  canvas: '#f3f8f4',
  brand: '#1f7449',
  brandDark: '#175c39',
  brand50: '#eaf4ee',
  body: '#c9ddd0',
  danger: '#c0392b',
}

const BAND: Record<Band['tone'], string> = { low: '#e7eef7', ok: '#e6f3ea', warn: '#fcf0de', risk: '#fbe3e3' }

const PAGE_W = 595.28
const PAD = 46
const CONTENT_W = PAGE_W - PAD * 2

const s = StyleSheet.create({
  page: { paddingTop: 40, paddingHorizontal: PAD, paddingBottom: 64, fontFamily: 'Figtree', fontSize: 10, color: C.ink },
  display: { fontFamily: 'Schibsted Grotesk', fontWeight: 700, letterSpacing: -0.4 },
  row: { flexDirection: 'row' },
  rule: { height: 2, backgroundColor: C.brand, marginTop: 14 },
  eyebrow: { fontSize: 8, fontWeight: 600, letterSpacing: 1, color: C.soft, textTransform: 'uppercase' },
  h2: { fontFamily: 'Schibsted Grotesk', fontWeight: 700, fontSize: 16, letterSpacing: -0.3 },
  card: { borderWidth: 1, borderColor: C.line, borderRadius: 10, padding: 12 },
  footer: {
    position: 'absolute',
    bottom: 28,
    left: PAD,
    right: PAD,
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: C.line,
    paddingTop: 10,
    fontSize: 8.5,
    color: C.soft,
  },
  pill: { backgroundColor: C.brand50, color: C.brandDark, borderRadius: 10, paddingHorizontal: 7, paddingVertical: 3, fontWeight: 700, fontSize: 10 },
})

export interface ReportOptions {
  appName: string
  portalUrl: string | null
  issuedOn: string // YYYY-MM-DD
}

// --- Piezas ------------------------------------------------------------------

function LogoMark({ size = 22 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 32 32">
      <Rect width={32} height={32} rx={8} ry={8} fill={C.brand} />
      <Path d="M10 23c0-7 4-12 13-13 0 8-4 12-10 12.5M10 23c2.5-3.5 5-5.5 8-7" fill="none" stroke="#ffffff" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  )
}

function Arrow({ color = C.soft }: { color?: string }) {
  return (
    <Svg width={10} height={8} viewBox="0 0 10 8" style={{ marginHorizontal: 4 }}>
      <Path d="M0 4h8M5.5 1.2 8.5 4 5.5 6.8" fill="none" stroke={color} strokeWidth={1.1} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  )
}

function Footer({ left }: { left: ReactNode }) {
  return (
    <View style={s.footer} fixed>
      <Text style={{ maxWidth: '80%' }}>{left}</Text>
      <Text render={({ pageNumber, totalPages }) => `Página ${pageNumber} de ${totalPages}`} />
    </View>
  )
}

/** Gráfica de línea con rejilla, área, puntos, bandas y etiquetas de ejes. */
function PdfLineChart({
  data,
  width,
  height,
  decimals = 1,
  bands,
  threshold,
  domain,
  minSpan,
  area = true,
  axis = true,
}: {
  data: Point[]
  width: number
  height: number
  decimals?: 1 | 2
  bands?: Band[]
  threshold?: number
  domain?: [number, number]
  minSpan?: number
  area?: boolean
  axis?: boolean
}) {
  const box: Box = { width, height, top: 8, right: 8, bottom: axis ? 18 : 4, left: axis ? 30 : 4 }
  const g = lineGeometry(data, box, { domain, minSpan })
  const top = g.yTicks[g.yTicks.length - 1]?.value
  const bottom = g.yTicks[0]?.value
  return (
    <View style={{ width, height, position: 'relative' }}>
      <Svg width={width} height={height}>
        <Defs>
          <LinearGradient id="area" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor={C.brand} stopOpacity={0.14} />
            <Stop offset="100%" stopColor={C.brand} stopOpacity={0} />
          </LinearGradient>
        </Defs>
        {bands?.map((b) => {
          const y0 = g.y(Math.min(b.to, top))
          const y1 = g.y(Math.max(b.from, bottom))
          return y1 > y0 ? <Rect key={b.label} x={g.plot.x0} y={y0} width={g.plot.x1 - g.plot.x0} height={y1 - y0} fill={BAND[b.tone]} /> : null
        })}
        {g.yTicks.map((t) => (
          <Line key={t.value} x1={g.plot.x0} x2={g.plot.x1} y1={t.y} y2={t.y} stroke={C.line} strokeWidth={0.7} />
        ))}
        {threshold != null && (
          <Line x1={g.plot.x0} x2={g.plot.x1} y1={g.y(threshold)} y2={g.y(threshold)} stroke={C.danger} strokeWidth={1} strokeDasharray="4 3" />
        )}
        {area && !bands && g.area ? <Path d={g.area} fill="url(#area)" /> : null}
        <Path d={g.line} fill="none" stroke={C.brand} strokeWidth={1.8} strokeLinejoin="round" strokeLinecap="round" />
        {g.points.map((p, i) => (
          <Circle key={i} cx={p.x} cy={p.y} r={3} fill="#ffffff" stroke={C.brand} strokeWidth={1.4} />
        ))}
      </Svg>
      {axis &&
        g.yTicks.map((t) => (
          <Text key={t.value} style={{ position: 'absolute', left: 0, top: t.y - 4.5, width: g.plot.x0 - 5, textAlign: 'right', fontSize: 7, color: C.faint }}>
            {fmtNum(t.value, decimals).replace(/,0+$/, '')}
          </Text>
        ))}
      {axis &&
        g.xTicks.map((t) => (
          <Text key={t.label + t.x} style={{ position: 'absolute', left: t.x - 20, width: 40, top: height - 12, textAlign: 'center', fontSize: 7, color: C.faint }}>
            {t.label}
          </Text>
        ))}
    </View>
  )
}

function Sparkline({ data, width, height }: { data: Point[]; width: number; height: number }) {
  if (data.length < 2) return <View style={{ width, height }} />
  const g = lineGeometry(data, { width, height, top: 3, right: 2, bottom: 1, left: 2 }, { xTicks: false, tickCount: 2, minSpan: 0.5 })
  return (
    <Svg width={width} height={height}>
      <Path d={g.area} fill={C.brand50} />
      <Path d={g.line} fill="none" stroke={C.brand} strokeWidth={1.4} strokeLinejoin="round" />
    </Svg>
  )
}

// --- Documento -----------------------------------------------------------------

export function ReportDocument({ data, options }: { data: ProgressData; options: ReportOptions }) {
  const { client, professional } = data
  const ms = sortMeasurements(data.measurements)
  const firstDate = ms[0]?.measured_on
  const lastDate = ms[ms.length - 1]?.measured_on
  const weight = series(ms, 'weight_kg')
  const weightSum = summarize(weight)
  const bmi = bmiSeries(ms, client.height_cm)
  const whr = whrSeries(ms)
  const sexLabel = client.sex === 'female' ? 'Mujer' : 'Hombre'
  const proLine = [professional?.professional_title, professional?.license_number && `Nº col. ${professional.license_number}`]
    .filter(Boolean)
    .join(' · ')

  const footerLeft = options.portalUrl
    ? `Consulta tu progreso interactivo en ${options.portalUrl.replace(/^https?:\/\//, '')} (acceso con DNI)`
    : options.appName

  const perimeterCardW = (CONTENT_W - 3 * 10) / 4

  return (
    <Document title={`Informe de evolución · ${client.full_name}`} author={professional?.full_name || options.appName} creator={options.appName} language="es">
      {/* ------------------------------ Página 1 ------------------------------ */}
      <Page size="A4" style={s.page}>
        <View style={[s.row, { justifyContent: 'space-between' }]}>
          <View>
            <View style={[s.row, { alignItems: 'center', gap: 7 }]}>
              <LogoMark />
              <Text style={{ fontFamily: 'Schibsted Grotesk', fontWeight: 700, fontSize: 14 }}>{options.appName}</Text>
            </View>
            <Text style={[s.display, { fontSize: 27, marginTop: 10 }]}>Informe de evolución</Text>
          </View>
          <View style={{ alignItems: 'flex-end', paddingTop: 2 }}>
            {professional?.full_name ? <Text style={{ fontWeight: 700, fontSize: 10.5 }}>{professional.full_name}</Text> : null}
            {proLine ? <Text style={{ color: C.soft, marginTop: 3 }}>{proLine}</Text> : null}
            <Text style={{ color: C.soft, marginTop: 3 }}>Emitido el {fmtDate(options.issuedOn)}</Text>
          </View>
        </View>
        <View style={s.rule} />

        <View style={[s.row, { backgroundColor: C.canvas, borderRadius: 10, padding: 14, marginTop: 18 }]}>
          {[
            ['Cliente', client.full_name],
            ['DNI', client.dni],
            ['Periodo', firstDate && lastDate ? (firstDate === lastDate ? fmtDate(lastDate) : fmtDateRange(firstDate, lastDate)) : '—'],
            ['Mediciones', String(ms.length)],
          ].map(([label, value], i) => (
            <View key={label} style={{ flex: i === 0 ? 1.3 : 1 }}>
              <Text style={s.eyebrow}>{label}</Text>
              <Text style={{ fontWeight: 600, fontSize: 11, marginTop: 4 }}>{value}</Text>
            </View>
          ))}
        </View>

        {/* Peso */}
        <View style={[s.row, { justifyContent: 'space-between', alignItems: 'baseline', marginTop: 20 }]}>
          <Text style={s.h2}>Peso</Text>
          {weightSum && weight.length > 1 ? (
            <Text style={{ color: C.brandDark, fontWeight: 700, fontSize: 11 }}>
              {fmtDelta(weightSum.delta)} kg en {weeksBetween(weightSum.first.date, weightSum.last.date)} semanas
            </Text>
          ) : null}
        </View>
        <View style={{ marginTop: 8 }}>
          {weight.length ? (
            <PdfLineChart data={weight} width={CONTENT_W} height={175} />
          ) : (
            <Text style={{ color: C.soft }}>Sin registros de peso.</Text>
          )}
        </View>

        {/* Resumen */}
        <Text style={[s.h2, { marginTop: 18 }]}>Resumen de medidas</Text>
        <View style={{ marginTop: 8 }}>
          <View style={[s.row, { borderBottomWidth: 1, borderBottomColor: C.ink, paddingBottom: 6, paddingHorizontal: 6 }]}>
            <Text style={[s.eyebrow, { flex: 2.2 }]}>Medida</Text>
            <Text style={[s.eyebrow, { flex: 1.3, textAlign: 'right' }]}>Inicio{firstDate ? ` · ${fmtDateShort(firstDate)}` : ''}</Text>
            <Text style={[s.eyebrow, { flex: 1.3, textAlign: 'right' }]}>Actual{lastDate ? ` · ${fmtDateShort(lastDate)}` : ''}</Text>
            <Text style={[s.eyebrow, { flex: 1.2, textAlign: 'right' }]}>Variación</Text>
            <Text style={[s.eyebrow, { flex: 0.9, textAlign: 'right' }]}>%</Text>
          </View>
          {METRICS.map((m) => {
            const sum = summarize(series(ms, m.key))
            return (
              <View key={m.key} style={[s.row, { borderBottomWidth: 1, borderBottomColor: C.line, paddingVertical: 6.5, paddingHorizontal: 6 }]}>
                <Text style={{ flex: 2.2, fontWeight: 500 }}>
                  {m.label} ({m.unit})
                </Text>
                <Text style={{ flex: 1.3, textAlign: 'right' }}>{fmtNum(sum?.first.value)}</Text>
                <Text style={{ flex: 1.3, textAlign: 'right', fontWeight: 600 }}>{fmtNum(sum?.last.value)}</Text>
                <Text style={{ flex: 1.2, textAlign: 'right', fontWeight: 700, color: C.brandDark }}>
                  {sum ? `${fmtDelta(sum.delta)} ${m.unit}` : '—'}
                </Text>
                <Text style={{ flex: 0.9, textAlign: 'right', color: C.soft }}>{sum ? fmtPct(sum.pct) : '—'}</Text>
              </View>
            )
          })}
        </View>

        {/* Perímetros */}
        <Text style={[s.h2, { marginTop: 18 }]} minPresenceAhead={90}>Perímetros</Text>
        <View style={[s.row, { gap: 10, marginTop: 8 }]} wrap={false}>
          {PERIMETERS.map((m) => {
            const pts = series(ms, m.key)
            const sum = summarize(pts)
            return (
              <View key={m.key} style={[s.card, { width: perimeterCardW }]}>
                <Text style={{ fontWeight: 700, fontSize: 10 }}>{m.label}</Text>
                <View style={{ marginTop: 8 }}>
                  <Sparkline data={pts} width={perimeterCardW - 24} height={36} />
                </View>
                {sum ? (
                  <View style={{ marginTop: 6 }}>
                    <View style={[s.row, { alignItems: 'center' }]}>
                      <Text style={{ color: C.soft, fontSize: 8.5 }}>{fmtNum(sum.first.value)}</Text>
                      <Arrow />
                      <Text style={{ color: C.soft, fontSize: 8.5 }}>{fmtNum(sum.last.value)} cm</Text>
                    </View>
                    <Text style={{ color: C.brandDark, fontWeight: 700, fontSize: 10, marginTop: 2 }}>
                      {fmtDelta(sum.delta)} cm
                    </Text>
                  </View>
                ) : (
                  <Text style={{ color: C.soft, fontSize: 8.5, marginTop: 6 }}>Sin datos</Text>
                )}
              </View>
            )
          })}
        </View>

        <Footer left={footerLeft} />
      </Page>

      {/* ------------------------------ Página 2 ------------------------------ */}
      <Page size="A4" style={s.page}>
        <View style={[s.row, { justifyContent: 'space-between', alignItems: 'center' }]}>
          <View style={[s.row, { alignItems: 'center', gap: 7 }]}>
            <LogoMark />
            <Text style={{ fontFamily: 'Schibsted Grotesk', fontWeight: 700, fontSize: 13 }}>{options.appName}</Text>
            <Text style={{ color: C.soft }}>· Informe de evolución</Text>
          </View>
          <Text style={{ fontWeight: 600 }}>
            {[client.full_name, sexLabel, fmtHeight(client.height_cm)].filter(Boolean).join(' · ')}
          </Text>
        </View>
        <View style={s.rule} />

        <View style={[s.row, { gap: 14, marginTop: 18 }]}>
          <IndicatorCard
            title="Índice de masa corporal (IMC)"
            points={bmi}
            decimals={1}
            unitLabel="puntos"
            note={
              client.height_cm
                ? 'Peso (kg) / altura² (m). Referencia OMS: 18,5–24,9 normopeso.'
                : 'Falta la altura en la ficha para calcular el IMC.'
            }
            chart={(w) => (
              <PdfLineChart
                data={bmi}
                width={w}
                height={128}
                bands={BMI_BANDS}
                domain={[Math.min(...bmi.map((p) => p.value)) - 1.5, Math.max(...bmi.map((p) => p.value)) + 1.5]}
              />
            )}
          />
          <IndicatorCard
            title="Índice cintura-cadera (ICC)"
            points={whr}
            decimals={2}
            unitLabel=""
            note={`Cintura estrecha / cadera. Riesgo cardiometabólico aumentado según OMS: ${client.sex === 'female' ? 'mujeres desde 0,85' : 'hombres desde 0,90'}.`}
            chart={(w) => (
              <PdfLineChart
                data={whr}
                width={w}
                height={128}
                decimals={2}
                bands={whrBands(client.sex)}
                threshold={WHR_RISK[client.sex]}
                minSpan={0.05}
                domain={[
                  Math.min(...whr.map((p) => p.value), WHR_RISK[client.sex]) - 0.03,
                  Math.max(...whr.map((p) => p.value), WHR_RISK[client.sex]) + 0.04,
                ]}
              />
            )}
          />
        </View>

        <View style={[s.row, { justifyContent: 'space-between', alignItems: 'center', marginTop: 22 }]}>
          <Text style={s.h2}>Perímetros corporales</Text>
          {firstDate && lastDate && firstDate !== lastDate ? (
            <View style={[s.row, { gap: 14, alignItems: 'center', fontSize: 8.5 }]}>
              <View style={[s.row, { alignItems: 'center', gap: 5 }]}>
                <Svg width={16} height={4}>
                  <Line x1={0} x2={16} y1={2} y2={2} stroke={C.danger} strokeWidth={1.6} strokeDasharray="3 2" />
                </Svg>
                <Text>Primera medición · {fmtDate(firstDate)}</Text>
              </View>
              <View style={[s.row, { alignItems: 'center', gap: 5 }]}>
                <Svg width={16} height={4}>
                  <Line x1={0} x2={16} y1={2} y2={2} stroke={C.brand} strokeWidth={2.4} />
                </Svg>
                <Text>Última medición · {fmtDate(lastDate)}</Text>
              </View>
            </View>
          ) : null}
        </View>

        <BodyPanel data={data} />

        <Footer left={`Silueta orientativa a partir de los perímetros medidos; las diferencias del contorno se amplían ×${AMPLIFY} para que se aprecien.`} />
      </Page>
    </Document>
  )
}

function IndicatorCard({
  title,
  points,
  decimals,
  unitLabel,
  note,
  chart,
}: {
  title: string
  points: Point[]
  decimals: 1 | 2
  unitLabel: string
  note: string
  chart: (width: number) => ReactNode
}) {
  const w = (CONTENT_W - 14) / 2
  const sum = summarize(points)
  return (
    <View style={[s.card, { width: w, padding: 14 }]}>
      <Text style={[s.h2, { fontSize: 13 }]}>{title}</Text>
      {sum ? (
        <>
          <View style={[s.row, { alignItems: 'baseline', marginTop: 8 }]}>
            <Text style={[s.display, { fontSize: 24 }]}>{fmtNum(sum.last.value, decimals)}</Text>
            {points.length > 1 ? <Text style={{ color: C.soft, marginLeft: 6 }}>desde {fmtNum(sum.first.value, decimals)}</Text> : null}
            {points.length > 1 ? (
              <Text style={{ marginLeft: 'auto', color: C.brandDark, fontWeight: 700 }}>
                {fmtDelta(sum.last.value - sum.first.value, decimals)} {unitLabel}
              </Text>
            ) : null}
          </View>
          <View style={{ marginTop: 10 }}>{chart(w - 28)}</View>
        </>
      ) : (
        <Text style={{ color: C.soft, marginTop: 10 }}>Faltan datos para calcularlo.</Text>
      )}
      <Text style={{ color: C.soft, fontSize: 8.5, marginTop: 10, lineHeight: 1.4 }}>{note}</Text>
    </View>
  )
}

function BodyPanel({ data }: { data: ProgressData }) {
  const ms = sortMeasurements(data.measurements)
  const sums = PERIMETERS.map((m) => ({ key: m.key as PerimeterKey, sum: summarize(series(ms, m.key)) }))
  const firstOf = Object.fromEntries(sums.filter((x) => x.sum).map((x) => [x.key, x.sum!.first.value]))
  const lastOf = Object.fromEntries(sums.filter((x) => x.sum).map((x) => [x.key, x.sum!.last.value]))
  const compare = sums.some((x) => x.sum && x.sum.first.date !== x.sum.last.date)
  const lastP = perimetersFrom(data.client.sex, { ...firstOf, ...lastOf })
  const firstP = perimetersFrom(data.client.sex, { ...lastOf, ...firstOf })
  const before = bodyShape(data.client.sex, amplified(firstP, lastP, AMPLIFY))
  const after = bodyShape(data.client.sex, lastP)
  const figW = 150
  const figH = (figW / BODY_W) * BODY_H
  return (
    <View style={[s.row, { backgroundColor: C.canvas, borderRadius: 12, padding: 18, marginTop: 10, gap: 22, alignItems: 'center' }]} wrap={false}>
      <Svg width={figW} height={figH} viewBox={`0 0 ${BODY_W} ${BODY_H}`}>
        {compare ? <Path d={before.path} fill={C.danger} fillOpacity={0.1} /> : null}
        {after.arms.map((d) => (
          <Path key={d} d={d} fill="#d7e8dd" />
        ))}
        <Ellipse cx={after.head.cx} cy={after.head.cy} rx={after.head.rx} ry={after.head.ry} fill={C.body} />
        <Path d={after.path} fill={C.body} stroke={C.brand} strokeWidth={1.5} strokeOpacity={0.7} />
        {compare ? <Path d={before.path} fill="none" stroke={C.danger} strokeWidth={1.6} strokeDasharray="5 4" /> : null}
        {sums.map(({ key, sum }) =>
          sum ? (
            <Line
              key={key}
              x1={BODY_W / 2 - after.widths[key]}
              x2={BODY_W / 2 + after.widths[key]}
              y1={LEVEL_Y[key]}
              y2={LEVEL_Y[key]}
              stroke={C.brand}
              strokeWidth={2}
              strokeDasharray="1 4"
              strokeLinecap="round"
            />
          ) : null,
        )}
      </Svg>
      <View style={{ flex: 1, gap: 10 }}>
        {PERIMETERS.map((m) => {
          const sum = summarize(series(ms, m.key))
          return (
            <View key={m.key} style={{ backgroundColor: '#ffffff', borderWidth: 1, borderColor: C.line, borderRadius: 10, paddingVertical: 11, paddingHorizontal: 14 }}>
              <Text style={{ fontWeight: 700, fontSize: 11 }}>{m.label}</Text>
              {sum ? (
                <View style={[s.row, { alignItems: 'center', marginTop: 5 }]}>
                  <Text style={{ color: C.danger, fontSize: 11 }}>{fmtNum(sum.first.value)} cm</Text>
                  <Arrow color={C.ink} />
                  <Text style={{ color: C.brandDark, fontWeight: 700, fontSize: 12.5 }}>{fmtNum(sum.last.value)} cm</Text>
                  <Text style={[s.pill, { marginLeft: 'auto' }]}>{fmtDelta(sum.delta)} cm</Text>
                </View>
              ) : (
                <Text style={{ color: C.soft, marginTop: 5 }}>Sin datos</Text>
              )}
            </View>
          )
        })}
      </View>
    </View>
  )
}
