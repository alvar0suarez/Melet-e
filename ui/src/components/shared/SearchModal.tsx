import React, { useEffect, useRef, useState, useCallback } from 'react'
import { Search, FileText, BookOpen, X, ChevronDown, ChevronUp } from 'lucide-react'
import { searchNotes, globalSearch, listDocuments } from '@/lib/api'
import { useAppStore } from '@/store/app'
import type { DocMeta } from '@/lib/types'

interface SearchResult {
  kind: 'note' | 'doc'
  name?: string    // note name
  path?: string    // doc path
  type?: string    // pdf | epub
  page?: number
  chapter?: number
  title?: string
  ctx: string
}

interface Props {
  onClose: () => void
}

export default function SearchModal({ onClose }: Props) {
  const { openTab, setActivity } = useAppStore()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [docs, setDocs] = useState<DocMeta[]>([])
  const [selectedPaths, setSelectedPaths] = useState<Set<string>>(new Set())
  const [showFilePicker, setShowFilePicker] = useState(false)
  const [fileSearch, setFileSearch] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    inputRef.current?.focus()
    listDocuments().then(setDocs).catch(() => {})
  }, [])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  const runSearch = useCallback((q: string, paths: string[]) => {
    if (!q.trim()) { setResults([]); return }
    setLoading(true)
    globalSearch(q, paths)
      .then(({ notes, docs: docResults }) => {
        const mapped: SearchResult[] = [
          ...notes.map(n => ({ kind: 'note' as const, name: n.name, ctx: n.ctx })),
          ...docResults.map(d => ({ kind: 'doc' as const, ...d })),
        ]
        setResults(mapped)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const handleQueryChange = (q: string) => {
    setQuery(q)
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => runSearch(q, Array.from(selectedPaths)), 400)
  }

  const handleSearch = () => runSearch(query, Array.from(selectedPaths))

  const openResult = (r: SearchResult) => {
    if (r.kind === 'note' && r.name) {
      openTab({ id: `note:${r.name}`, name: `${r.name}.md`, type: 'note' })
      setActivity('explorer')
    } else if (r.kind === 'doc' && r.path) {
      const doc = docs.find(d => d.path === r.path)
      if (doc) {
        openTab({ id: `doc:${doc.path}`, name: doc.name, type: doc.ext, path: doc.path })
        setActivity('explorer')
      }
    }
    onClose()
  }

  const togglePath = (path: string) => {
    setSelectedPaths(prev => {
      const next = new Set(prev)
      if (next.has(path)) next.delete(path)
      else next.add(path)
      return next
    })
  }

  const filteredDocs = fileSearch
    ? docs.filter(d => d.name.toLowerCase().includes(fileSearch.toLowerCase()) || (d.title || '').toLowerCase().includes(fileSearch.toLowerCase()))
    : docs

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-16 px-4"
      style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="flex flex-col rounded-xl overflow-hidden w-full max-w-2xl"
        style={{ background: 'var(--bg2)', border: '1px solid var(--border2)', boxShadow: '0 24px 80px rgba(0,0,0,.8)', maxHeight: '70vh' }}>

        {/* Search bar */}
        <div className="flex items-center gap-2 px-3 py-2.5 flex-shrink-0"
          style={{ borderBottom: '1px solid var(--border)' }}>
          <Search size={14} style={{ color: 'var(--text3)', flexShrink: 0 }} />
          <input
            ref={inputRef}
            value={query}
            onChange={e => handleQueryChange(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleSearch() }}
            placeholder="Buscar en notas y documentos…"
            className="flex-1 bg-transparent outline-none text-sm"
            style={{ color: 'var(--text)' }}
          />
          {loading && <div className="text-[10px]" style={{ color: 'var(--text3)' }}>Buscando…</div>}
          <button onClick={onClose} className="p-0.5 rounded hover:opacity-70">
            <X size={13} style={{ color: 'var(--text3)' }} />
          </button>
        </div>

        {/* File picker toggle */}
        <div className="flex-shrink-0" style={{ borderBottom: '1px solid var(--border)' }}>
          <button
            onClick={() => setShowFilePicker(v => !v)}
            className="w-full flex items-center gap-2 px-3 py-1.5 text-left"
            style={{ color: selectedPaths.size > 0 ? 'var(--indigo)' : 'var(--text3)', fontSize: 11 }}
          >
            {showFilePicker ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
            {selectedPaths.size > 0
              ? `Buscar también en ${selectedPaths.size} documento${selectedPaths.size !== 1 ? 's' : ''}`
              : 'Buscar en documentos (opcional)'}
          </button>

          {showFilePicker && (
            <div style={{ borderTop: '1px solid var(--border)', maxHeight: 200, overflowY: 'auto', background: 'var(--bg)' }}>
              <div className="px-2 pt-2 pb-1">
                <input
                  value={fileSearch}
                  onChange={e => setFileSearch(e.target.value)}
                  placeholder="Filtrar archivos…"
                  className="w-full px-2 py-1 rounded text-xs outline-none"
                  style={{ background: 'var(--bg3)', border: '1px solid var(--border)', color: 'var(--text)' }}
                />
              </div>
              {filteredDocs.slice(0, 150).map(d => (
                <label key={d.path} className="flex items-center gap-2 px-3 py-1 cursor-pointer hover:opacity-80 text-xs"
                  style={{ color: selectedPaths.has(d.path) ? 'var(--indigo)' : 'var(--text2)' }}>
                  <input type="checkbox" checked={selectedPaths.has(d.path)}
                    onChange={() => togglePath(d.path)} className="accent-indigo-500" />
                  <div className="min-w-0 flex-1">
                    <span className="block truncate">{d.title || d.name}</span>
                    {d.author && <span className="text-[9px]" style={{ color: 'var(--text3)' }}>{d.author}</span>}
                  </div>
                  <span className="flex-shrink-0 text-[9px] uppercase" style={{ color: 'var(--text3)' }}>{d.ext}</span>
                </label>
              ))}
            </div>
          )}
        </div>

        {/* Results */}
        <div className="flex-1 overflow-y-auto">
          {results.length === 0 && !loading && query.trim() ? (
            <div className="flex items-center justify-center h-20 text-xs" style={{ color: 'var(--text3)' }}>
              Sin resultados
            </div>
          ) : (
            results.map((r, i) => (
              <button key={i} onClick={() => openResult(r)}
                className="w-full text-left flex items-start gap-3 px-3 py-2.5 hover:opacity-80 transition-opacity"
                style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                {r.kind === 'note'
                  ? <FileText size={13} style={{ color: 'var(--indigo)', flexShrink: 0, marginTop: 1 }} />
                  : <BookOpen size={13} style={{ color: 'var(--teal)', flexShrink: 0, marginTop: 1 }} />
                }
                <div className="min-w-0">
                  <div className="text-xs font-medium truncate" style={{ color: 'var(--text)' }}>
                    {r.kind === 'note' ? r.name : (r.title || r.path?.split('/').pop())}
                    {r.kind === 'doc' && r.page !== undefined && (
                      <span className="ml-2 text-[10px]" style={{ color: 'var(--text3)' }}>p. {r.page + 1}</span>
                    )}
                    {r.kind === 'doc' && r.chapter !== undefined && (
                      <span className="ml-2 text-[10px]" style={{ color: 'var(--text3)' }}>cap. {r.chapter + 1}</span>
                    )}
                  </div>
                  {r.ctx && (
                    <div className="text-[11px] mt-0.5 truncate" style={{ color: 'var(--text3)' }}>{r.ctx}</div>
                  )}
                </div>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
