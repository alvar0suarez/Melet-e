import React, { useEffect, useState } from 'react'
import { Trash2, Plus } from 'lucide-react'
import { useReaderStore } from '@/store/reader'
import { loadAnnotations, saveAnnotations } from '@/lib/api'
import type { Annotation, HighlightColor } from '@/lib/types'

interface Props {
  stem: string
}

const colorStyles: Record<HighlightColor, string> = {
  red:    'rgba(239,68,68,0.18)',
  yellow: 'rgba(245,158,11,0.18)',
  green:  'rgba(34,197,94,0.18)',
  grey:   'rgba(156,163,175,0.15)',
}

export default function AnnotationsPanel({ stem }: Props) {
  const { annotations, setAnnotations, removeAnnotation } = useReaderStore()
  const [newNote, setNewNote] = useState('')
  const anns = annotations[stem] ?? []

  useEffect(() => {
    loadAnnotations(stem).then((a) => setAnnotations(stem, a))
  }, [stem])

  const handleRemove = async (id: string) => {
    removeAnnotation(stem, id)
    const updated = anns.filter((a) => a.id !== id)
    await saveAnnotations(stem, updated)
  }

  return (
    <div
      className="flex flex-col flex-shrink-0 overflow-hidden"
      style={{ width: 220, borderLeft: '1px solid var(--border)', background: 'var(--bg2)' }}
    >
      {/* Header */}
      <div
        className="px-3 py-2 text-[10px] font-bold uppercase tracking-[1.2px] flex-shrink-0"
        style={{ color: 'var(--text3)', borderBottom: '1px solid var(--border)' }}
      >
        Annotations ({anns.length})
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto p-2 flex flex-col gap-2">
        {anns.length === 0 ? (
          <div className="text-[10px] text-center mt-4" style={{ color: 'var(--text3)' }}>
            Select text to annotate
          </div>
        ) : (
          anns.map((ann) => (
            <div
              key={ann.id}
              className="rounded p-2 text-[10px]"
              style={{
                background: colorStyles[ann.color] ?? colorStyles.yellow,
                border: '1px solid var(--border)',
              }}
            >
              <div className="flex items-start justify-between gap-1 mb-1">
                <span className="italic leading-[1.5]" style={{ color: 'var(--text2)' }}>
                  "{ann.text}"
                </span>
                <button onClick={() => handleRemove(ann.id)} style={{ color: 'var(--text3)', flexShrink: 0 }}>
                  <Trash2 size={10} />
                </button>
              </div>
              {ann.note && (
                <div style={{ color: 'var(--text3)', marginTop: 4 }}>{ann.note}</div>
              )}
              <div className="mt-1" style={{ color: 'var(--text3)', fontSize: 9 }}>
                {new Date(ann.createdAt).toLocaleDateString()}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
