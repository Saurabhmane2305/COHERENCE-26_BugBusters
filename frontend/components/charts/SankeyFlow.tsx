'use client'
import { Sankey, Tooltip, ResponsiveContainer } from 'recharts'
import { SankeyData } from '@/lib/api'

interface Props { data: SankeyData }

interface SankeyNodePayload { name: string; level: string }
interface SankeyLinkPayload { isLeakage: boolean }

interface CustomLinkProps {
  sourceX: number; sourceY: number; sourceControlX: number
  targetX: number; targetY: number; targetControlX: number
  linkWidth: number; payload: SankeyLinkPayload
}

interface CustomNodeProps {
  x: number; y: number; width: number; height: number
  payload: SankeyNodePayload
}

function CustomLink(props: CustomLinkProps) {
  const { sourceX, sourceY, sourceControlX, targetX, targetY, targetControlX, linkWidth, payload } = props
  const isLeakage = payload?.isLeakage
  const color = isLeakage ? 'rgba(239,68,68,0.35)' : 'rgba(0,212,255,0.15)'
  const stroke = isLeakage ? 'rgba(239,68,68,0.6)' : 'rgba(0,212,255,0.3)'
  return (
    <g>
      <path
        d={`M${sourceX},${sourceY + linkWidth / 2}
            C${sourceControlX},${sourceY + linkWidth / 2}
             ${targetControlX},${targetY + linkWidth / 2}
             ${targetX},${targetY + linkWidth / 2}
            L${targetX},${targetY - linkWidth / 2}
            C${targetControlX},${targetY - linkWidth / 2}
             ${sourceControlX},${sourceY - linkWidth / 2}
             ${sourceX},${sourceY - linkWidth / 2}
            Z`}
        fill={color} stroke={stroke} strokeWidth={1}
      />
    </g>
  )
}

function CustomNode(props: CustomNodeProps) {
  const { x, y, width, height, payload } = props
  const colorMap: Record<string, string> = {
    centre: 'var(--cyan)', state: 'var(--purple)',
    district: 'var(--amber)', department: 'var(--green)',
  }
  const color = colorMap[(payload?.level || '').toLowerCase()] || 'var(--cyan)'
  return (
    <g>
      <rect x={x} y={y} width={width} height={height} fill={color} rx={3} opacity={0.9} />
      <text
        x={x < 200 ? x + width + 6 : x - 6} y={y + height / 2}
        textAnchor={x < 200 ? 'start' : 'end'} dominantBaseline="middle"
        fill="var(--text-secondary)" fontSize={10} fontFamily="var(--font-mono)"
      >
        {payload?.name?.length > 18 ? payload.name.slice(0, 16) + '…' : payload?.name}
      </text>
    </g>
  )
}

export default function SankeyFlow({ data }: Props) {
  const nodeMap: Record<string, number> = {}
  data.nodes.forEach((n: { id: string | number; }, i: number) => { nodeMap[n.id] = i })

  const sankeyData = {
    nodes: data.nodes.map((n: { id: any; level: any; }) => ({ name: n.id, level: n.level })),
    links: data.links
      .filter((l: { source: string | number; target: string | number; }) => nodeMap[l.source] !== undefined && nodeMap[l.target] !== undefined)
      .map((l: { source: string | number; target: string | number; value: number; is_leakage: any; absorption_ratio: any; }) => ({
        source: nodeMap[l.source],
        target: nodeMap[l.target],
        value: Math.max(l.value / 1e6, 1),
        isLeakage: l.is_leakage,
        absorption: l.absorption_ratio,
      })),
  }

  return (
    <ResponsiveContainer width="100%" height={440}>
      <Sankey
        data={sankeyData}
        nodePadding={20} nodeWidth={12}
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        link={(p: any) => <CustomLink {...p} />}
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        node={(p: any) => <CustomNode {...p} />}
        margin={{ top: 10, right: 160, bottom: 10, left: 20 }}
      >
        <Tooltip
          contentStyle={{
            background: 'var(--bg-card)', border: '1px solid var(--border)',
            borderRadius: 8, fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-primary)',
          }}
          formatter={(value: number) => [`₹${value.toFixed(1)}M`, 'Flow']}
        />
      </Sankey>
    </ResponsiveContainer>
  )
}