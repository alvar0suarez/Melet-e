import React, { useEffect, useState } from 'react'
import { Bookmark, BookOpen } from 'lucide-react'
import { useReaderStore } from '@/store/reader'
import { useAppStore } from '@/store/app'
import { listDocuments } from '@/lib/api'
import type { DocMeta } from '@/lib/types'

export default function BookmarksView() {
  const { bookmarks, positions, setPosition } = useReaderStore()
  const { openTab, setActivity } = useAppStore()
  const [docs, setDocs] = useState<DocMeta[]>([])

  useEffect(() => { listDocuments().then(setDocs).catch(() => {}) }, [])

  const allStems = Array.from(new Set([
    ...Object.keys(bookmarks),
    ...Object.keys(positions),
  ])).sort()

  const openBook = (stem: string, page: number) => {
    const doc = docs.find(d => (d.path.split('/').pop() ?? '').replace(/\.[^/.]+$/, '') === stem)
    if (!doc) return
    setPosition(stem, page)
    openTab({ id: `doc:${doc.path}`, name: doc.name, type: doc.ext, path: doc.path })
    openTab({ id: `note:${stem}`, name: `${stem}.md`, type: 'note' })
    setActivity('explorer')
  }

  return (
    <div className="flex flex-col h-full" style={{ background: 'var(--bg)' }}>
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-2 flex-shrink-0"
        style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg2)' }}>
        <Bookmark size={14} style={{ color: 'var(--orange)' }} />
        <span className="text-xs font-bold" style={{ color: 'var(--text)' }}>Marcadores</span>
        <span className="ml-auto text-[10px]" style={{ color: 'var(--text3)' }}>
          {Object.keys(bookmarks).length} marcados · {Object.keys(positions).length} con progreso
        </span>
      </div>

      <div className="flex-1 overflow-auto">
        {allStems.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 gap-2">
            <Bookmark size={28} style={{ color: 'var(--border2)' }} />
            <p className="text-xs" style={{ color: 'var(--text3)' }}>
              Abre un libro y usa el icono de marcador para guardar tu posición.
            </p>
          </div>
        ) : (
          <table className="w-full border-collapse">
            <thead>
              <tr style={{ position: 'sticky', top: 0, background: 'var(--bg2)', zIndex: 1 }}>
                <th style={thStyle}>LIBRO</th>
                <th style={{ ...thStyle, width: 80, textAlign: 'center' }}>MARCADOR</th>
                <th style={{ ...thStyle, width: 80, textAlign: 'center' }}>POSICIÓN</th>
              </tr>
            </thead>
            <tbody>
              {allStems.map((stem, i) => {
                const bmPage  = bookmarks[stem]
                const posPage = positions[stem]
                const isBookmarked = bmPage !== undefined
                const targetPage = bmPage ?? posPage ?? 0
                return (
                  <tr key={stem}
                    onClick={() => openBook(stem, targetPage)}
                    className="cursor-pointer"
                    style={{
                      borderBottom: '1px solid var(--border)',
                      background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.018)',
                    }}
                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--bg3)'}
                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.018)'}
                  >
                    <td style={{ padding: '5px 12px', overflow: 'hidden', maxWidth: 0 }}>
                      <div className="flex items-center gap-2">
                        {isBookmarked && <Bookmark size={10} fill="currentColor" style={{ color: 'var(--orange)', flexShrink: 0 }} />}
                        <span className="block truncate text-xs" style={{ color: 'var(--text)' }} title={stem}>
                          {stem}
                        </span>
                      </div>
                    </td>
                    <td style={{ padding: '5px 8px', textAlign: 'center' }}>
                      {isBookmarked ? (
                        <span className="text-[10px] tabular-nums" style={{ color: 'var(--orange)' }}>
                          p. {bmPage + 1}
                        </span>
                      ) : (
                        <span style={{ color: 'var(--border2)' }}>—</span>
                      )}
                    </td>
                    <td style={{ padding: '5px 8px', textAlign: 'center' }}>
                      {posPage !== undefined ? (
                        <span className="text-[10px] tabular-nums" style={{ color: 'var(--text3)' }}>
                          p. {posPage + 1}
                        </span>
                      ) : (
                        <span style={{ color: 'var(--border2)' }}>—</span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

const thStyle: React.CSSProperties = {
  padding: '6px 12px',
  fontSize: 10,
  fontWeight: 600,
  letterSpacing: '0.06em',
  color: 'var(--text3)',
  borderBottom: '1px solid var(--border)',
  textAlign: 'left',
}
