import React, { useState } from 'react'
import { RotateCcw } from 'lucide-react'
import { restoreVersion } from '@/lib/api'
import { useEditorStore } from '@/store/editor'
import type { Version } from '@/lib/types'

interface Props {
  versions: Version[]
  stem: string
  onRestore: () => void
}

export default function CommitTimeline({ versions, stem, onRestore }: Props) {
  const { setNoteContent } = useEditorStore()
  const [restoring, setRestoring] = useState<string | null>(null)

  const handleRestore = async (ts: string) => {
    if (!confirm('Restore this version? Current state will be auto-saved first.')) return
    setRestoring(ts)
    try {
      const { content } = await restoreVersion(stem, ts)
      setNoteContent(stem, content)
      onRestore()
    } finally {
      setRestoring(null)
    }
  }

  return (
    <div
      className="flex flex-col flex-shrink-0"
      style={{ height: 130, borderTop: '1px solid var(--border)', background: 'var(--bg2)' }}
    >
      <div
        className="flex items-center justify-between px-4 py-1.5 text-[10px] font-bold uppercase tracking-wider flex-shrink-0"
        style={{ color: 'var(--text3)', borderBottom: '1px solid var(--border)' }}
      >
        <span>History — {stem}.md</span>
        <span>{versions.length} snapshots</span>
      </div>

      <div className="flex-1 flex items-center px-5 gap-0 overflow-x-auto relative" style={{ position: 'relative' }}>
        {/* Horizontal line */}
        <div
          className="absolute top-1/2 left-5 right-5"
          style={{ height: 2, background: 'var(--border2)', zIndex: 0, transform: 'translateY(-50%)' }}
        />

        {versions.map((v, i) => (
          <div
            key={v.ts}
            className="flex flex-col items-center gap-[6px] relative z-10 px-5 min-w-[90px]"
          >
            <button
              onClick={() => handleRestore(v.ts)}
              disabled={restoring === v.ts}
              title="Restore this version"
              className="w-3 h-3 rounded-full transition-all hover:scale-125"
              style={{
                background: i === 0 ? 'var(--indigo)' : 'var(--bg)',
                border: `2px solid ${i === 0 ? 'var(--indigo)' : 'var(--border2)'}`,
                boxShadow: i === 0 ? '0 0 8px rgba(129,140,248,.5)' : 'none',
              }}
            />
            <div className="text-center">
              <div
                className="text-[9.5px] max-w-[80px] overflow-hidden text-ellipsis whitespace-nowrap"
                style={{ color: i === 0 ? 'var(--indigo)' : 'var(--text2)', fontWeight: i === 0 ? 600 : 400 }}
              >
                {v.msg || 'snapshot'}
              </div>
              <div className="text-[8.5px]" style={{ color: 'var(--text3)' }}>{v.label}</div>
              <div
                className="font-mono text-[8px] px-1 rounded"
                style={{ color: 'var(--indigo)', background: 'var(--indigo-dim)' }}
              >
                {v.hash}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
