'use client'

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'

export type ChartPoint = { date: string; entrada: number; saida: number }

export function MovementsChart({ data }: { data: ChartPoint[] }) {
  const hasData = data.some((d) => d.entrada > 0 || d.saida > 0)

  if (!hasData) {
    return (
      <div className="flex h-[300px] items-center justify-center text-sm text-muted-foreground">
        Nenhuma movimentação nos últimos 14 dias
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" vertical={false} />
        <XAxis
          dataKey="date"
          tick={{ fontSize: 11, fill: '#a1a1aa' }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={{ fontSize: 11, fill: '#a1a1aa' }}
          axisLine={false}
          tickLine={false}
          allowDecimals={false}
        />
        <Tooltip
          cursor={{ fill: 'rgba(255,255,255,0.04)' }}
          contentStyle={{
            backgroundColor: '#1c1c1e',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '8px',
            fontSize: '12px',
          }}
          labelStyle={{ color: '#f4f4f5', fontWeight: 500, marginBottom: 4 }}
          itemStyle={{ color: '#a1a1aa' }}
        />
        <Legend
          iconType="circle"
          iconSize={8}
          wrapperStyle={{ fontSize: '12px', paddingTop: '12px', color: '#a1a1aa' }}
        />
        <Bar dataKey="entrada" name="Entrada" fill="#818cf8" radius={[4, 4, 0, 0]} maxBarSize={32} />
        <Bar dataKey="saida" name="Saída" fill="#f87171" radius={[4, 4, 0, 0]} maxBarSize={32} />
      </BarChart>
    </ResponsiveContainer>
  )
}
