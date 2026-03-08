import React, { useEffect, useState, useCallback } from 'react'
import { RefreshCw } from 'lucide-react'
import { getNote } from '@/lib/api'
import { useReaderStore } from '@/store/reader'

const COLOR_DOT: Record<string, string> = {
  red: '#ef4444', yellow: '#f59e0b', green: '#22c55e', grey: '#9ca3af',
}
const HIGHLIGHT_BG: Record<string, string> = {
  red: 'rgba(239,68,68,0.10)', yellow: 'rgba(245,158,11,0.10)',
  green: 'rgba(34,197,94,0.10)', grey: 'rgba(156,163,175,0.10)',
}
const HIGHLIGHT_BORDER: Record<string, string> = {
  red: 'rgba(239,68,68,0.30)', yellow: 'rgba(245,158,11,0.30)',
  green: 'rgba(34,197,94,0.30)', grey: 'rgba(156,163,175,0.30)',
}
const EMOJI_COLOR: Record<string, string> = {
  '🔴': 'red', '🟡': 'yellow', '🟢': 'green', '⚫': 'grey',
}

interface Entry {
  emoji: string
  color: string
  label: string
  source: string
  timestamp: string
  text: string
  page: number | null       // 0-indexed PDF page
  chapterIdx: number | null // 0-indexed EPUB chapter
}

function parseEntries(content: string): Entry[] {
  const entries: Entry[] = []
  // Matches: {emoji} **{label}** *— {source}* · `{timestamp}`\n> "{text}"
  const re = /(🔴|🟡|🟢|⚫)\s+\*\*(.+?)\*\*(?:\s+\*—\s+(.+?)\*)?\s+·\s+`(.+?)`\n>\s+"([\s\S]+?)"/g
  let m: RegExpExecArray | null
  while ((m = re.exec(content)) !== null) {
    const [, emoji, label, source = '', timestamp, text] = m
    const color = EMOJI_COLOR[emoji] ?? 'yellow'
    const pageMatch = source.match(/p\.\s*(\d+)/)
    const capMatch = source.match(/cap\.\s*(\d+)/)
    entries.push({
      emoji, color, label, source, timestamp,
      text,
      page: pageMatch ? parseInt(pageMatch[1], 10) - 1 : null,
      chapterIdx: capMatch ? parseInt(capMatch[1], 10) - 1 : null,
    })
  }
  return entries
}

interface Props {
  stem: string
  docType?: 'pdf' | 'epub' | 'txt'
}

export default function ReaderNotePanel({ stem, docType }: Props) {
  const { annotations, setPdfPage, setEpubChapter } = useReaderStore()
  const [entries, setEntries] = useState<Entry[]>([])
  const [loading, setLoading] = useState(false)
  const [noteExists, setNoteExists] = useState(true)

  const annCount = (annotations[stem] ?? []).length

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const { content } = await getNote(stem)
      setEntries(parseEntries(content))
      setNoteExists(true)
    } catch {
      setNoteExists(false)
      setEntries([])
    } finally {
      setLoading(false)
    }
  }, [stem])

  // Reload on open and whenever a new annotation is added
  useEffect(() => { load() }, [load, annCount])

  const handleClick = (entry: Entry) => {
    if (docType === 'epub' && entry.chapterIdx !== null) {
      setEpubChapter(entry.chapterIdx)
    } else if (entry.page !== null) {
      setPdfPage(entry.page)
    }
  }

  const navLabel = (entry: Entry) => {
    if (entry.page !== null) return `Ir a p. ${entry.page + 1}`
    if (entry.chapterIdx !== null) return `Ir al cap. ${entry.chapterIdx + 1}`
    return ''
  }

  return (
    <div className="flex flex-col h-full flex-shrink-0"
      style={{ width: 300, borderLeft: '1px solid var(--border)', background: 'var(--bg2)' }}>

      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 flex-shrink-0"
        style={{ borderBottom: '1px solid var(--border)' }}>
        <span className="text-[11px] font-bold" style={{ color: 'var(--text)' }}>
          Notas · <span style={{ color: 'var(--text3)', fontWeight: 400 }}>{stem}</span>
        </span>
        <button onClick={load} title="Recargar" className="p-1 rounded hover:opacity-80"
          style={{ color: 'var(--text3)' }}>
          <RefreshCw size={11} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Entries */}
      <div className="flex-1 overflow-y-auto p-3">
        {!noteExists ? (
          <div className="text-[11px] text-center mt-10" style={{ color: 'var(--text3)' }}>
            Sin notas aún.<br />
            <span style={{ opacity: 0.6 }}>Resalta texto para empezar.</span>
          </div>
        ) : entries.length === 0 ? (
          <div className="text-[11px] text-center mt-10" style={{ color: 'var(--text3)' }}>
            {loading ? 'Cargando…' : 'Sin extractos.\nUsa un color al resaltar texto.'}
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {entries.map((entry, i) => (
              <div
                key={i}
                onClick={() => handleClick(entry)}
                title={navLabel(entry)}
                className="rounded-lg p-2.5 cursor-pointer transition-opacity hover:opacity-75 select-none"
                style={{
                  background: HIGHLIGHT_BG[entry.color],
                  border: `1px solid ${HIGHLIGHT_BORDER[entry.color]}`,
                }}
              >
                {/* Color label + source */}
                <div className="flex items-center gap-1.5 mb-1.5">
                  <div className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ background: COLOR_DOT[entry.color] }} />
                  <span className="text-[9px] font-bold uppercase tracking-wider"
                    style={{ color: COLOR_DOT[entry.color] }}>
                    {entry.label}
                  </span>
                  {entry.source && (
                    <span className="ml-auto text-[9px] font-medium"
                      style={{ color: 'var(--indigo)' }}>
                      {entry.source} ↗
                    </span>
                  )}
                </div>

                {/* Quote */}
                <div className="text-[11px] leading-relaxed italic"
                  style={{ color: 'var(--text2)' }}>
                  "{entry.text}"
                </div>

                {/* Timestamp */}
                <div className="text-[9px] mt-1.5" style={{ color: 'var(--text3)' }}>
                  {entry.timestamp}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
