import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react'
import { Search, Star, BookOpen, Library, ChevronUp, ChevronDown } from 'lucide-react'
import { listDocuments, updateBookMeta } from '@/lib/api'
import { useAppStore } from '@/store/app'
import type { DocMeta, DocStatus } from '@/lib/types'

type Filter = 'all' | 'reading' | 'toread' | 'read' | 'favorites'
type SortKey = 'name' | 'author' | 'year' | 'pages' | 'language' | 'publisher' | 'status' | 'progress' | 'ext' | 'last_opened' | 'total_read_seconds'
type SortDir = 'asc' | 'desc'

const FILTERS: { id: Filter; label: string }[] = [
  { id: 'all', label: 'Todo' },
  { id: 'reading', label: 'Leyendo' },
  { id: 'toread', label: 'Por leer' },
  { id: 'read', label: 'Leído' },
  { id: 'favorites', label: '★ Favoritos' },
]

const STATUS_LABEL: Record<DocStatus, string> = {
  unread: 'Sin leer', reading: 'Leyendo', read: 'Leído', toread: 'Por leer',
}
const STATUS_COLOR: Record<DocStatus, string> = {
  unread: 'var(--text3)', reading: 'var(--indigo)', read: 'var(--green)', toread: 'var(--orange)',
}
const EXT_COLOR: Record<string, string> = {
  pdf: '#e05252', epub: '#38a3c4', txt: '#d97706',
}
const STATUS_ORDER: Record<DocStatus, number> = {
  reading: 0, toread: 1, unread: 2, read: 3,
}

const ROW_HEIGHT = 33   // px — must match actual row height
const BUFFER     = 15   // extra rows rendered above/below viewport

function parseStem(stem: string): { title: string; author: string; year: string } {
  let s = stem
  let year = ''
  let author = ''
  const yearMatch = s.match(/\s*\((\d{4})\)\s*$/)
  if (yearMatch) {
    year = yearMatch[1]
    s = s.slice(0, yearMatch.index!).trim()
  }
  const dashIdx = s.indexOf(' - ')
  if (dashIdx > 0) {
    author = s.slice(0, dashIdx).trim()
    s = s.slice(dashIdx + 3).trim()
  }
  return { title: s, author, year }
}

function fmtTime(seconds: number): string {
  if (!seconds) return ''
  if (seconds < 60) return `${seconds}s`
  const m = Math.floor(seconds / 60)
  if (m < 60) return `${m}m`
  const h = Math.floor(m / 60)
  const rm = m % 60
  return rm > 0 ? `${h}h ${rm}m` : `${h}h`
}

function fmtDate(iso: string): string {
  if (!iso) return ''
  try {
    const d = new Date(iso)
    const now = new Date()
    const diffDays = Math.floor((now.getTime() - d.getTime()) / 86400000)
    if (diffDays === 0) return 'Hoy'
    if (diffDays === 1) return 'Ayer'
    if (diffDays < 7) return `Hace ${diffDays}d`
    return d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: diffDays > 365 ? '2-digit' : undefined })
  } catch { return '' }
}

export default function LibraryView() {
  const { openTab, setActivity } = useAppStore()
  const [docs, setDocs] = useState<DocMeta[]>([])
  const [filter, setFilter] = useState<Filter>('all')
  const [search, setSearch] = useState('')
  const [extFilter, setExtFilter] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [sortKey, setSortKey] = useState<SortKey>('name')
  const [sortDir, setSortDir] = useState<SortDir>('asc')
  const [scrollTop, setScrollTop] = useState(0)
  const [containerH, setContainerH] = useState(700)
  const scrollRef = useRef<HTMLDivElement>(null)

  const loadDocs = useCallback(() => {
    listDocuments().then(setDocs)
  }, [])

  useEffect(() => {
    setLoading(true)
    listDocuments().then(setDocs).finally(() => setLoading(false))
    const interval = setInterval(() => { if (document.hasFocus()) loadDocs() }, 8000)
    return () => clearInterval(interval)
  }, [])

  // Virtual scroll: track scroll position with rAF debounce
  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    setContainerH(el.clientHeight)
    let rafId: number
    const onScroll = () => {
      cancelAnimationFrame(rafId)
      rafId = requestAnimationFrame(() => setScrollTop(el.scrollTop))
    }
    el.addEventListener('scroll', onScroll, { passive: true })
    return () => { el.removeEventListener('scroll', onScroll); cancelAnimationFrame(rafId) }
  }, [])

  // Reset scroll to top whenever filters or sort change
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = 0
    setScrollTop(0)
  }, [filter, search, extFilter, sortKey, sortDir])

  const filtered = useMemo(() => {
    let result = docs.filter((d) => {
      if (filter === 'favorites' && !d.favorite) return false
      if (filter !== 'all' && filter !== 'favorites' && d.status !== filter) return false
      if (extFilter && d.ext !== extFilter) return false
      const q = search.toLowerCase()
      if (q && !d.name.toLowerCase().includes(q) && !d.author.toLowerCase().includes(q)
            && !(d.publisher || '').toLowerCase().includes(q)) return false
      return true
    })
    result = [...result].sort((a, b) => {
      let va: string | number
      let vb: string | number
      if (sortKey === 'status') {
        va = STATUS_ORDER[a.status] ?? 9
        vb = STATUS_ORDER[b.status] ?? 9
      } else {
        va = (a[sortKey] as string | number) ?? ''
        vb = (b[sortKey] as string | number) ?? ''
        if (typeof va === 'string') va = va.toLowerCase()
        if (typeof vb === 'string') vb = vb.toLowerCase()
      }
      if (va < vb) return sortDir === 'asc' ? -1 : 1
      if (va > vb) return sortDir === 'asc' ? 1 : -1
      return 0
    })
    return result
  }, [docs, filter, search, extFilter, sortKey, sortDir])

  // Virtual window: only render visible rows + buffer
  const startIdx = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - BUFFER)
  const endIdx   = Math.min(filtered.length, Math.ceil((scrollTop + containerH) / ROW_HEIGHT) + BUFFER)
  const topPad   = startIdx * ROW_HEIGHT
  const botPad   = (filtered.length - endIdx) * ROW_HEIGHT

  const openDoc = (doc: DocMeta) => {
    openTab({ id: `doc:${doc.path}`, name: doc.name, type: doc.ext as 'pdf' | 'epub' | 'txt', path: doc.path })
    setActivity('explorer')
  }

  const toggleFavorite = async (e: React.MouseEvent, doc: DocMeta) => {
    e.stopPropagation()
    await updateBookMeta(doc.path, { favorite: !doc.favorite })
    loadDocs()
  }
  const cycleStatus = async (e: React.MouseEvent, doc: DocMeta) => {
    e.stopPropagation()
    const order: DocStatus[] = ['unread', 'toread', 'reading', 'read']
    await updateBookMeta(doc.path, { status: order[(order.indexOf(doc.status) + 1) % order.length] })
    loadDocs()
  }
  const saveYear = async (doc: DocMeta, year: string) => {
    await updateBookMeta(doc.path, { year })
    loadDocs()
  }

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('asc') }
  }

  const SortIcon = ({ col }: { col: SortKey }) =>
    sortKey !== col
      ? <ChevronUp size={9} style={{ opacity: 0.2 }} />
      : sortDir === 'asc'
      ? <ChevronUp size={9} style={{ color: 'var(--indigo)' }} />
      : <ChevronDown size={9} style={{ color: 'var(--indigo)' }} />

  const Th = ({ col, label, style }: { col: SortKey; label: string; style?: React.CSSProperties }) => (
    <th onClick={() => handleSort(col)} className="cursor-pointer select-none text-left"
      style={{ padding: '7px 8px', color: sortKey === col ? 'var(--indigo)' : 'var(--text3)', fontSize: 10,
        fontWeight: 600, letterSpacing: '0.06em', borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap', ...style }}>
      <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>{label} <SortIcon col={col} /></span>
    </th>
  )

  return (
    <div className="flex flex-col h-full overflow-hidden" style={{ background: 'var(--bg)' }}>

      {/* ── Bar ─── */}
      <div className="flex items-center gap-2 px-4 py-2 flex-shrink-0 flex-wrap"
        style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg2)', rowGap: 6 }}>

        <Library size={14} style={{ color: 'var(--indigo)', flexShrink: 0 }} />
        <span className="text-xs font-bold flex-shrink-0" style={{ color: 'var(--text)' }}>Biblioteca</span>

        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded flex-1"
          style={{ background: 'var(--bg3)', border: '1px solid var(--border)', minWidth: 130, maxWidth: 260 }}>
          <Search size={11} style={{ color: 'var(--text3)', flexShrink: 0 }} />
          <input value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar título o autor…" className="flex-1 bg-transparent outline-none text-xs"
            style={{ color: 'var(--text2)' }} />
        </div>

        <div className="flex gap-1 flex-shrink-0">
          {FILTERS.map((f) => (
            <button key={f.id} onClick={() => setFilter(f.id)} className="px-2 py-1 rounded text-[10px] transition-colors"
              style={{ background: filter === f.id ? 'var(--indigo-dim)' : 'transparent',
                color: filter === f.id ? 'var(--indigo)' : 'var(--text3)',
                border: `1px solid ${filter === f.id ? 'rgba(129,140,248,.3)' : 'transparent'}` }}>
              {f.label}
            </button>
          ))}
        </div>

        <div className="flex gap-1 flex-shrink-0">
          {['pdf', 'epub', 'txt'].map((ext) => (
            <button key={ext} onClick={() => setExtFilter(extFilter === ext ? null : ext)}
              className="px-2 py-1 rounded text-[10px] uppercase font-bold"
              style={{ color: extFilter === ext ? EXT_COLOR[ext] : 'var(--text3)',
                border: `1px solid ${extFilter === ext ? EXT_COLOR[ext] + '55' : 'var(--border)'}`,
                background: extFilter === ext ? EXT_COLOR[ext] + '18' : 'transparent' }}>
              {ext}
            </button>
          ))}
        </div>

        <span className="ml-auto text-[10px] flex-shrink-0" style={{ color: 'var(--text3)' }}>
          {filtered.length}/{docs.length}
        </span>
      </div>

      {/* ── Table ─── */}
      <div ref={scrollRef} className="flex-1 overflow-auto">
        {loading && docs.length === 0 ? (
          <div className="flex items-center justify-center h-40 text-sm" style={{ color: 'var(--text3)' }}>Cargando…</div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 gap-2">
            <BookOpen size={28} style={{ color: 'var(--border2)' }} />
            <p className="text-xs" style={{ color: 'var(--text3)' }}>
              {docs.length === 0 ? 'Añade PDFs y EPUBs a la carpeta Files/ del vault.' : 'Sin resultados con los filtros actuales.'}
            </p>
          </div>
        ) : (
          <table className="w-full border-collapse" style={{ tableLayout: 'fixed' }}>
            <colgroup>
              <col style={{ width: 28 }} />   {/* ★ */}
              <col style={{ width: 50 }} />   {/* fmt */}
              <col />                          {/* title */}
              <col style={{ width: 140 }} />  {/* author */}
              <col style={{ width: 46 }} />   {/* year */}
              <col style={{ width: 44 }} />   {/* pages */}
              <col style={{ width: 58 }} />   {/* language */}
              <col style={{ width: 120 }} />  {/* publisher */}
              <col style={{ width: 86 }} />   {/* status */}
              <col style={{ width: 90 }} />   {/* progress */}
              <col style={{ width: 72 }} />   {/* last opened */}
              <col style={{ width: 54 }} />   {/* read time */}
            </colgroup>
            <thead>
              <tr style={{ position: 'sticky', top: 0, zIndex: 1, background: 'var(--bg2)' }}>
                <th style={{ borderBottom: '1px solid var(--border)', padding: '7px 4px' }} />
                <Th col="ext" label="FMT" />
                <Th col="name" label="TÍTULO" />
                <Th col="author" label="AUTOR" />
                <Th col="year" label="AÑO" />
                <Th col="pages" label="PÁG." />
                <Th col="language" label="IDIOMA" />
                <Th col="publisher" label="EDITORIAL" />
                <Th col="status" label="ESTADO" />
                <Th col="progress" label="PROGRESO" />
                <Th col="last_opened" label="ABIERTO" />
                <Th col="total_read_seconds" label="TIEMPO" />
              </tr>
            </thead>
            <tbody>
              {topPad > 0 && <tr style={{ height: topPad }}><td colSpan={12} /></tr>}
              {filtered.slice(startIdx, endIdx).map((doc, i) => (
                <BookRow key={doc.path} doc={doc} even={(startIdx + i) % 2 === 0}
                  onOpen={() => openDoc(doc)}
                  onToggleFavorite={(e) => toggleFavorite(e, doc)}
                  onCycleStatus={(e) => cycleStatus(e, doc)}
                  onSaveYear={(y) => saveYear(doc, y)}
                />
              ))}
              {botPad > 0 && <tr style={{ height: botPad }}><td colSpan={12} /></tr>}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

function BookRow({ doc, even, onOpen, onToggleFavorite, onCycleStatus, onSaveYear }: {
  doc: DocMeta; even: boolean
  onOpen: () => void
  onToggleFavorite: (e: React.MouseEvent) => void
  onCycleStatus: (e: React.MouseEvent) => void
  onSaveYear: (y: string) => void
}) {
  const [hovered, setHovered] = useState(false)
  const [editingYear, setEditingYear] = useState(false)
  const [yearDraft, setYearDraft] = useState(doc.year ?? '')
  const yearInputRef = useRef<HTMLInputElement>(null)

  const parsed = useMemo(() => parseStem(doc.name), [doc.name])
  const displayTitle = doc.title || parsed.title || doc.name
  const displayAuthor = doc.author || parsed.author
  const displayYear = doc.year || parsed.year

  const color = EXT_COLOR[doc.ext] ?? 'var(--text3)'
  const sColor = STATUS_COLOR[doc.status]
  const progressColor = doc.status === 'read' ? 'var(--green)' : doc.status === 'reading' ? 'var(--indigo)' : 'var(--border2)'

  const commitYear = () => {
    setEditingYear(false)
    if (yearDraft !== (doc.year ?? '')) onSaveYear(yearDraft)
  }

  return (
    <tr onClick={onOpen} onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
      className="cursor-pointer"
      style={{ height: ROW_HEIGHT, background: hovered ? 'var(--bg3)' : even ? 'transparent' : 'rgba(255,255,255,0.018)', borderBottom: '1px solid var(--border)' }}>

      {/* ★ */}
      <td style={{ padding: '4px 4px', textAlign: 'center' }}>
        <button onClick={onToggleFavorite}
          style={{ color: doc.favorite ? 'var(--orange)' : 'var(--border2)', lineHeight: 0, display: 'inline-flex' }}>
          <Star size={11} fill={doc.favorite ? 'currentColor' : 'none'} />
        </button>
      </td>

      {/* Format */}
      <td style={{ padding: '4px 6px' }}>
        <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded"
          style={{ background: color + '22', color }}>{doc.ext}</span>
      </td>

      {/* Title */}
      <td style={{ padding: '4px 8px', overflow: 'hidden' }}>
        <span className="block truncate text-xs font-medium" style={{ color: 'var(--text)' }} title={displayTitle}>
          {displayTitle}
        </span>
      </td>

      {/* Author */}
      <td style={{ padding: '4px 8px', overflow: 'hidden' }}>
        <span className="block truncate" style={{ color: 'var(--text3)', fontSize: 11 }} title={displayAuthor}>
          {displayAuthor || '—'}
        </span>
      </td>

      {/* Year — click to edit inline */}
      <td style={{ padding: '4px 6px' }} onClick={(e) => e.stopPropagation()}>
        {editingYear ? (
          <input
            ref={yearInputRef}
            value={yearDraft}
            onChange={(e) => setYearDraft(e.target.value)}
            onBlur={commitYear}
            onKeyDown={(e) => { if (e.key === 'Enter') commitYear(); if (e.key === 'Escape') setEditingYear(false) }}
            autoFocus
            className="w-full outline-none text-[10px] text-center rounded px-1"
            style={{ background: 'var(--bg3)', border: '1px solid var(--indigo)', color: 'var(--text)', width: 38 }}
          />
        ) : (
          <span
            onClick={() => { setYearDraft(doc.year ?? ''); setEditingYear(true) }}
            className="block text-center text-[10px] rounded cursor-text"
            style={{ color: displayYear ? 'var(--text2)' : 'var(--border2)', minWidth: 30 }}
            title="Clic para editar año"
          >
            {displayYear || '—'}
          </span>
        )}
      </td>

      {/* Pages */}
      <td style={{ padding: '4px 6px' }}>
        <span className="block text-center tabular-nums" style={{ color: 'var(--text3)', fontSize: 10 }}>
          {doc.pages ? doc.pages : '—'}
        </span>
      </td>

      {/* Language */}
      <td style={{ padding: '4px 6px' }}>
        <span className="block text-center text-[10px] uppercase" style={{ color: 'var(--text3)' }}>
          {doc.language || '—'}
        </span>
      </td>

      {/* Publisher */}
      <td style={{ padding: '4px 8px', overflow: 'hidden' }}>
        <span className="block truncate" style={{ color: 'var(--text3)', fontSize: 10 }} title={doc.publisher}>
          {doc.publisher || '—'}
        </span>
      </td>

      {/* Status */}
      <td style={{ padding: '4px 6px' }}>
        <button onClick={onCycleStatus} title="Clic para cambiar estado"
          className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded w-full text-center"
          style={{ color: sColor, background: sColor + '22', border: `1px solid ${sColor}44` }}>
          {STATUS_LABEL[doc.status]}
        </button>
      </td>

      {/* Progress */}
      <td style={{ padding: '4px 8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <div style={{ flex: 1, height: 4, borderRadius: 2, overflow: 'hidden', background: 'var(--bg3)' }}>
            <div style={{ height: '100%', width: `${doc.progress}%`, background: progressColor, borderRadius: 2 }} />
          </div>
          <span className="tabular-nums" style={{ color: 'var(--text3)', fontSize: 9, width: 24, textAlign: 'right', flexShrink: 0 }}>
            {doc.progress > 0 ? `${doc.progress}%` : ''}
          </span>
        </div>
      </td>

      {/* Last opened */}
      <td style={{ padding: '4px 8px' }}>
        <span className="block text-center" style={{ color: 'var(--text3)', fontSize: 9 }}
          title={doc.last_opened ? new Date(doc.last_opened).toLocaleString('es-ES') : ''}>
          {fmtDate(doc.last_opened)}
        </span>
      </td>

      {/* Read time */}
      <td style={{ padding: '4px 8px' }}>
        <span className="block text-center tabular-nums" style={{ color: 'var(--text3)', fontSize: 9 }}
          title={doc.total_read_seconds ? `${doc.total_read_seconds} segundos en total` : ''}>
          {fmtTime(doc.total_read_seconds)}
        </span>
      </td>
    </tr>
  )
}
