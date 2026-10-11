import type { ReactNode } from 'react'
import { fmtDelta, fmtNum } from '@/lib/format'
import { BMI_BANDS, WHR_RISK, bmiCategory, bmiSeries, summarize, whrBands, whrSeries, type Point } from '@/lib/metrics'
import type { Measurement, Sex } from '@/lib/types'
import { LineChart } from './charts'
import { Card, cx } from './ui'

export function bmiDomain(points: Point[]): [number, number] {
  const vals = points.map((p) => p.value)
  return [Math.min(...vals) - 1.5, Math.max(...vals) + 1.5]
}

export function whrDomain(points: Point[], sex: Sex): [number, number] {
  const vals = points.map((p) => p.value)
  return [Math.min(...vals, WHR_RISK[sex]) - 0.03, Math.max(...vals, WHR_RISK[sex]) + 0.04]
}

function IndicatorCard({
  title,
  points,
  decimals,
  unitLabel,
  children,
  footnote,
  status,
}: {
  title: string
  points: Point[]
  decimals: 1 | 2
  unitLabel: string
  children: ReactNode
  footnote: string
  status?: { label: string; tone: 'ok' | 'warn' | 'risk' | 'low' }
}) {
  const s = summarize(points)
  return (
    <Card className="p-5 sm:p-7">
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-lg font-bold sm:text-xl">{title}</h3>
        {status && (
          <span
            className={cx(
              'rounded-full px-2.5 py-1 text-xs font-semibold whitespace-nowrap',
              status.tone === 'ok' && 'bg-brand-50 text-brand-dark',
              status.tone === 'warn' && 'bg-warn-bg text-warn',
              status.tone === 'risk' && 'bg-danger-bg text-danger',
              status.tone === 'low' && 'bg-[#e7eef7] text-[#3b5b8c]',
            )}
          >
            {status.label}
          </span>
        )}
      </div>
      {s ? (
        <>
          <div className="mt-2 flex flex-wrap items-baseline gap-x-3">
            <span className="text-4xl font-extrabold tracking-tight">{fmtNum(s.last.value, decimals)}</span>
            {points.length > 1 && (
              <>
                <span className="text-ink-soft">desde {fmtNum(s.first.value, decimals)}</span>
                <span className="ml-auto font-semibold text-brand-dark">
                  {fmtDelta(s.last.value - s.first.value, decimals)} {unitLabel}
                </span>
              </>
            )}
          </div>
          <div className="mt-4">{children}</div>
        </>
      ) : (
        <p className="mt-4 text-ink-soft">Faltan datos para calcularlo.</p>
      )}
      <p className="mt-3 text-sm text-ink-soft">{footnote}</p>
    </Card>
  )
}

export function Indicators({ measurements, heightCm, sex }: { measurements: Measurement[]; heightCm: number | null; sex: Sex }) {
  const bmi = bmiSeries(measurements, heightCm)
  const whr = whrSeries(measurements)
  const lastBmi = bmi[bmi.length - 1]
  const lastWhr = whr[whr.length - 1]

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <IndicatorCard
        title="Índice de masa corporal (IMC)"
        points={bmi}
        decimals={1}
        unitLabel="puntos"
        status={lastBmi ? bmiCategory(lastBmi.value) : undefined}
        footnote={heightCm ? 'Peso (kg) / altura² (m). Referencia OMS: 18,5–24,9 normopeso.' : 'Añade la altura en la ficha para calcular el IMC.'}
      >
        <LineChart data={bmi} unit="" label="IMC" height={210} bands={BMI_BANDS} domain={bmi.length ? bmiDomain(bmi) : undefined} compact />
      </IndicatorCard>
      <IndicatorCard
        title="Índice cintura-cadera (ICC)"
        points={whr}
        decimals={2}
        unitLabel=""
        status={
          lastWhr
            ? lastWhr.value >= WHR_RISK[sex]
              ? { label: 'Riesgo aumentado', tone: 'risk' }
              : { label: 'Riesgo bajo', tone: 'ok' }
            : undefined
        }
        footnote={`Cintura estrecha / cadera. Riesgo cardiometabólico aumentado según OMS: ${sex === 'female' ? 'mujeres ≥ 0,85' : 'hombres ≥ 0,90'}.`}
      >
        <LineChart
          data={whr}
          unit=""
          decimals={2}
          label="ICC"
          height={210}
          bands={whrBands(sex)}
          threshold={WHR_RISK[sex]}
          domain={whr.length ? whrDomain(whr, sex) : undefined}
          minSpan={0.05}
          compact
        />
      </IndicatorCard>
    </div>
  )
}
