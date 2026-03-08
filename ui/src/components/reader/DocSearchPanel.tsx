/**
 * DocSearchPanel — in-document word/phrase search for PDF and EPUB.
 *
 * PDF:  uses backend /api/pdf/search to search all pages.
 * EPUB: searches loaded chapters in memory (no backend call needed).
 */
import React, { useRef, useState, useCallback } from 'react'
import { Search, X } from 'lucide-react'
import { searchPdfText } from '@/lib/api'
import type { EpubChapter } from '@/lib/types'

interface PdfResult { page: number; ctx: string }
interface EpubResult { chapter: number; title: string; ctx: string }

// ── PDF variant ───────────────────────────────────────────────────────────────
interface PdfProps {
  path: string
  onJump: (page: number) => void
}

export function PdfDocSearch({ path, onJump }: PdfProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<PdfResult[]>([])
  const [loading, setLoading] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const run = useCallback((q: string) => {
    if (!q.trim()) { setResults([]); return }
    setLoading(true)
    searchPdfText(path, q)
      .then(setResults)
      .catch(() => setResults([]))
      .finally(() => setLoading(false))
  }, [path])

  const onChange = (q: string) => {
    setQuery(q)
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => run(q), 500)
  }

  return (
    <SearchShell
      query={query}
      onChange={onChange}
      onSearch={() => run(query)}
      loading={loading}
      count={results.length}
      placeholder="Buscar en el PDF…"
    >
      {results.map((r, i) => (
        <ResultRow
          key={i}
          label={`p. ${r.page + 1}`}
          ctx={r.ctx}
          query={query}
          onClick={() => onJump(r.page)}
        />
      ))}
    </SearchShell>
  )
}

// ── EPUB variant ──────────────────────────────────────────────────────────────
interface EpubProps {
  chapters: EpubChapter[]
  onJump: (chapter: number) => void
}

export function EpubDocSearch({ chapters, onJump }: EpubProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<EpubResult[]>([])

  const run = useCallback((q: string) => {
    if (!q.trim()) { setResults([]); return }
    const ql = q.toLowerCase()
    const found: EpubResult[] = []
    for (let ci = 0; ci < chapters.length; ci++) {
      const ch = chapters[ci]
      const text = ch.blocks.map(b => b.text).join(' ')
      let start = 0
      while (found.length < 200) {
        const idx = text.toLowerCase().indexOf(ql, start)
        if (idx === -1) break
        const ctx = text.slice(Math.max(0, idx - 60), idx + 120)
        found.push({ chapter: ci, title: ch.title || `Cap. ${ci + 1}`, ctx })
        start = idx + 1
      }
    }
    setResults(found)
  }, [chapters])

  const onChange = (q: string) => { setQuery(q); run(q) }

  return (
    <SearchShell
      query={query}
      onChange={onChange}
      onSearch={() => run(query)}
      loading={false}
      count={results.length}
      placeholder="Buscar en el EPUB…"
    >
      {results.map((r, i) => (
        <ResultRow
          key={i}
          label={r.title}
          ctx={r.ctx}
          query={query}
          onClick={() => onJump(r.chapter)}
        />
      ))}
    </SearchShell>
  )
}

// ── Shared shell ──────────────────────────────────────────────────────────────
function SearchShell({ query, onChange, onSearch, loading, count, placeholder, children }: {
  query: string; onChange: (q: string) => void; onSearch: () => void
  loading: boolean; count: number; placeholder: string
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col flex-shrink-0"
      style={{ width: 280, borderLeft: '1px solid var(--border)', background: 'var(--bg2)', height: '100%' }}>
      {/* Input */}
      <div className="flex items-center gap-1.5 px-2 py-2 flex-shrink-0"
        style={{ borderBottom: '1px solid var(--border)' }}>
        <Search size={11} style={{ color: 'var(--text3)', flexShrink: 0 }} />
        <input
          autoFocus
          value={query}
          onChange={e => onChange(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') onSearch() }}
          placeholder={placeholder}
          className="flex-1 bg-transparent outline-none text-xs"
          style={{ color: 'var(--text)' }}
        />
        {query && (
          <button onClick={() => onChange('')} style={{ color: 'var(--text3)' }}>
            <X size={10} />
          </button>
        )}
      </div>

      {/* Stats */}
      {query.trim() && (
        <div className="px-3 py-1 text-[9px] flex-shrink-0" style={{ color: 'var(--text3)', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
          {loading ? 'Buscando…' : `${count} resultado${count !== 1 ? 's' : ''}`}
        </div>
      )}

      {/* Results */}
      <div className="flex-1 overflow-y-auto">
        {children}
      </div>
    </div>
  )
}

function ResultRow({ label, ctx, query, onClick }: {
  label: string; ctx: string; query: string; onClick: () => void
}) {
  // Highlight the match in the context snippet
  const ql = query.toLowerCase()
  const ci = ctx.toLowerCase().indexOf(ql)
  const highlighted = ci === -1 ? ctx : (
    <>
      {ctx.slice(0, ci)}
      <mark style={{ background: 'rgba(245,158,11,0.45)', color: 'inherit', borderRadius: 2 }}>
        {ctx.slice(ci, ci + query.length)}
      </mark>
      {ctx.slice(ci + query.length)}
    </>
  )

  return (
    <button onClick={onClick}
      className="w-full text-left px-3 py-2 hover:opacity-80 transition-opacity"
      style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
      <div className="text-[10px] font-bold mb-0.5" style={{ color: 'var(--indigo)' }}>{label}</div>
      <div className="text-[10px] leading-relaxed" style={{ color: 'var(--text3)' }}>…{highlighted}…</div>
    </button>
  )
}
