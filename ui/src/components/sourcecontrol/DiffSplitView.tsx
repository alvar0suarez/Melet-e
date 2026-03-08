import React from 'react'
import type { DiffLine } from '@/lib/types'

interface Props {
  diff: DiffLine[]
}

export default function DiffSplitView({ diff }: Props) {
  const oldLines = diff.filter((l) => l.type !== 'ins')
  const newLines = diff.filter((l) => l.type !== 'del')

  const rowStyle = (type: string) => {
    if (type === 'del') return { background: 'rgba(248,81,73,.13)' }
    if (type === 'ins') return { background: 'rgba(63,185,80,.11)' }
    return {}
  }

  const codeColor = (type: string) => {
    if (type === 'del') return '#fca5a5'
    if (type === 'ins') return '#86efac'
    return 'var(--text3)'
  }

  return (
    <div className="flex flex-1 overflow-hidden text-[11.5px]" style={{ fontFamily: "'SF Mono', Consolas, monospace" }}>
      {/* Left — deletions */}
      <div
        className="flex-1 overflow-auto py-1"
        style={{ background: 'rgba(248,81,73,.025)', borderRight: '1px solid var(--border)' }}
      >
        {oldLines.map((line, i) => (
          <div key={i} className="flex px-3 leading-[1.65]" style={rowStyle(line.type)}>
            <span className="min-w-[28px] text-[9.5px] select-none mr-1.5" style={{ color: 'var(--text3)' }}>
              {line.old_n ?? ''}
            </span>
            <span style={{ color: codeColor(line.type), whiteSpace: 'pre' }}>{line.text}</span>
          </div>
        ))}
      </div>

      {/* Right — insertions */}
      <div
        className="flex-1 overflow-auto py-1"
        style={{ background: 'rgba(63,185,80,.025)' }}
      >
        {newLines.map((line, i) => (
          <div key={i} className="flex px-3 leading-[1.65]" style={rowStyle(line.type)}>
            <span className="min-w-[28px] text-[9.5px] select-none mr-1.5" style={{ color: 'var(--text3)' }}>
              {line.new_n ?? ''}
            </span>
            <span style={{ color: codeColor(line.type), whiteSpace: 'pre' }}>{line.text}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
