import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react'
import { useReaderStore } from '@/store/reader'
import { useAppStore } from '@/store/app'
import { loadEpub, aiChat, listVocabWords, loadAnnotations } from '@/lib/api'
import ReaderToolbar from './ReaderToolbar'
import AnnotationsPanel from './AnnotationsPanel'
import ReaderNotePanel from './ReaderNotePanel'
import WordPopup from './WordPopup'
import type { EpubChapter, EpubBlock, Annotation } from '@/lib/types'

interface Props {
  path: string
}

// ── Typography ────────────────────────────────────────────────────────────────
const FONT_SIZES = [12, 14, 16, 18, 20, 22]

const BG: Record<string, string> = {
  default: '#0f1319', night: '#0a0a0a', sepia: '#17130a',
}
const FG: Record<string, string> = {
  default: '#c8d3e8', night: '#d8d8d8', sepia: '#c5aa80',
}
const HEADING_FG: Record<string, string> = {
  default: '#e6edf3', night: '#f0f0f0', sepia: '#d4bc96',
}

// ── Highlight colors ──────────────────────────────────────────────────────────
const HIGHLIGHT_BG: Record<string, string> = {
  red:    'rgba(239,68,68,0.45)',
  yellow: 'rgba(245,158,11,0.55)',
  green:  'rgba(34,197,94,0.42)',
  grey:   'rgba(156,163,175,0.38)',
}
const HIGHLIGHT_COLOR: Record<string, string> = {
  red:    '#1a0505',
  yellow: '#1a1200',
  green:  '#03170a',
  grey:   '#111214',
}

// ── Text segmentation ─────────────────────────────────────────────────────────
type Segment =
  | { kind: 'text'; text: string }
  | { kind: 'highlight'; text: string; color: string }
  | { kind: 'vocab'; text: string; back: string; vtype: string }

function escapeRe(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function buildSegments(
  rawText: string,
  annotations: Annotation[],
  vocab: { front: string; back: string; type: string }[]
): Segment[] {
  // Normalize whitespace so multi-line browser selections match block text
  const text = rawText.replace(/\s+/g, ' ')

  type Range = {
    start: number; end: number
    kind: 'highlight' | 'vocab'
    color?: string; back?: string; vtype?: string
  }
  const ranges: Range[] = []

  // Highlight ranges (normalized, case-sensitive)
  for (const ann of annotations) {
    if (!ann.text) continue
    const needle = ann.text.replace(/\s+/g, ' ').trim()
    let idx = 0
    while (true) {
      const pos = text.indexOf(needle, idx)
      if (pos === -1) break
      ranges.push({ start: pos, end: pos + needle.length, kind: 'highlight', color: ann.color })
      idx = pos + 1
    }
  }

  // Vocab ranges (whole-word, case-insensitive)
  for (const w of vocab) {
    if (!w.front || w.front.length < 2) continue
    try {
      const re = new RegExp(`\\b${escapeRe(w.front)}\\b`, 'gi')
      let m: RegExpExecArray | null
      while ((m = re.exec(text)) !== null) {
        ranges.push({ start: m.index, end: m.index + m[0].length, kind: 'vocab', back: w.back, vtype: w.type })
      }
    } catch {}
  }

  // Sort: highlights first (priority), then by start pos
  ranges.sort((a, b) => {
    if (a.kind !== b.kind) return a.kind === 'highlight' ? -1 : 1
    return a.start - b.start
  })

  // Remove overlapping ranges (keep higher-priority first)
  const clean: Range[] = []
  for (const r of ranges) {
    if (clean.every(c => r.start >= c.end || r.end <= c.start)) clean.push(r)
  }
  clean.sort((a, b) => a.start - b.start)

  // Build segment array
  const segs: Segment[] = []
  let pos = 0
  for (const r of clean) {
    if (pos < r.start) segs.push({ kind: 'text', text: text.slice(pos, r.start) })
    const txt = text.slice(r.start, r.end)
    if (r.kind === 'highlight') {
      segs.push({ kind: 'highlight', text: txt, color: r.color! })
    } else {
      segs.push({ kind: 'vocab', text: txt, back: r.back!, vtype: r.vtype! })
    }
    pos = r.end
  }
  if (pos < text.length) segs.push({ kind: 'text', text: text.slice(pos) })
  return segs
}

// ── AI translation ────────────────────────────────────────────────────────────
async function translateBlocks(
  blocks: EpubBlock[],
  aiConfig: Parameters<typeof aiChat>[1]
): Promise<EpubBlock[]> {
  const combined = blocks.map((b, i) => `[${i}|${b.type}] ${b.text}`).join('\n')
  const prompt =
    `Translate the following ebook content to Spanish. Preserve the format tags exactly (e.g. [0|h1], [1|p]). ` +
    `Return ONLY the translated lines with the same tags, one per line:\n\n${combined}`
  const { response } = await aiChat([{ role: 'user', content: prompt }], aiConfig ?? undefined)
  const lines = response.split('\n').filter(Boolean)
  const result: EpubBlock[] = [...blocks]
  for (const line of lines) {
    const m = line.match(/^\[(\d+)\|(\w+)\]\s?(.*)$/)
    if (m) {
      const idx = parseInt(m[1])
      if (idx < result.length) result[idx] = { type: m[2] as EpubBlock['type'], text: m[3] }
    }
  }
  return result
}

// ── Vocab popup ───────────────────────────────────────────────────────────────
interface VocabPopupProps {
  front: string; back: string; vtype: string; x: number; y: number
  onClose: () => void
}
function VocabPopup({ front, back, vtype, x, y, onClose }: VocabPopupProps) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    const kh = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('mousedown', handler)
    document.addEventListener('keydown', kh)
    return () => {
      document.removeEventListener('mousedown', handler)
      document.removeEventListener('keydown', kh)
    }
  }, [onClose])

  const popupX = Math.max(8, Math.min(x - 110, window.innerWidth - 240))
  const popupY = Math.min(y + 8, window.innerHeight - 160)

  return (
    <div ref={ref} className="fixed z-50 rounded-xl p-3" style={{
      left: popupX, top: popupY, width: 220,
      background: '#1e2431',
      border: '1px solid rgba(255,255,255,0.08)',
      boxShadow: '0 8px 32px rgba(0,0,0,.7)',
    }}>
      <div className="text-[10px] uppercase tracking-wider mb-1.5"
        style={{ color: vtype === 'dictionary' ? 'var(--teal)' : 'var(--indigo)' }}>
        {vtype === 'dictionary' ? 'Diccionario' : 'Traducción'}
      </div>
      <div className="text-[11px] font-semibold mb-2" style={{ color: 'var(--text)' }}>{front}</div>
      <div className="text-[11px] leading-relaxed" style={{ color: 'var(--text2)', whiteSpace: 'pre-wrap' }}>{back}</div>
    </div>
  )
}

// ── Block renderer ────────────────────────────────────────────────────────────
function EpubBlockView({
  type, text, fg, headingFg, fontSize, theme,
  annotations, vocab, onVocabClick, onHighlightClick,
}: {
  type: string; text: string; fg: string; headingFg: string
  fontSize: number; theme: string
  annotations: Annotation[]
  vocab: { front: string; back: string; type: string }[]
  onVocabClick: (front: string, back: string, vtype: string, x: number, y: number) => void
  onHighlightClick: () => void
}) {
  const quoteAccent = theme === 'sepia' ? '#8a7450' : theme === 'night' ? '#444' : 'var(--teal)'

  const segments = useMemo(
    () => buildSegments(text, annotations, vocab),
    [text, annotations, vocab]
  )

  const renderContent = () => segments.map((seg, i) => {
    if (seg.kind === 'text') return <React.Fragment key={i}>{seg.text}</React.Fragment>
    if (seg.kind === 'highlight') return (
      <span key={i}
        title="Ir a nota"
        onClick={onHighlightClick}
        style={{
          background: HIGHLIGHT_BG[seg.color] ?? HIGHLIGHT_BG.yellow,
          color: HIGHLIGHT_COLOR[seg.color] ?? HIGHLIGHT_COLOR.yellow,
          borderRadius: 3,
          padding: '1px 2px',
          fontWeight: 500,
          cursor: 'pointer',
          textDecoration: 'underline',
          textDecorationStyle: 'dotted',
          textUnderlineOffset: '2px',
        }}>
        {seg.text}
      </span>
    )
    // vocab
    return (
      <span key={i}
        style={{
          borderBottom: `1px dotted ${fg}`,
          cursor: 'pointer',
          opacity: 0.9,
        }}
        onClick={(e) => {
          e.stopPropagation()
          onVocabClick(seg.text, seg.back, seg.vtype, e.clientX, e.clientY)
        }}>
        {seg.text}
      </span>
    )
  })

  const sharedStyle = { color: fg, fontSize, lineHeight: 1.85 }

  switch (type) {
    case 'h1': return (
      <h1 style={{
        color: headingFg, fontSize: fontSize + 6, fontWeight: 700,
        margin: '2em 0 0.8em', lineHeight: 1.3, letterSpacing: '-0.01em',
        borderBottom: `1px solid rgba(255,255,255,0.06)`, paddingBottom: '0.4em',
      }}>{renderContent()}</h1>
    )
    case 'h2': return (
      <h2 style={{
        color: headingFg, fontSize: fontSize + 3, fontWeight: 600,
        margin: '1.8em 0 0.6em', lineHeight: 1.35,
      }}>{renderContent()}</h2>
    )
    case 'h3': return (
      <h3 style={{
        color: headingFg, fontSize: fontSize + 1, fontWeight: 600,
        margin: '1.5em 0 0.5em', lineHeight: 1.4,
      }}>{renderContent()}</h3>
    )
    case 'quote': return (
      <blockquote style={{
        ...sharedStyle, fontStyle: 'italic', lineHeight: 1.9,
        borderLeft: `3px solid ${quoteAccent}`,
        padding: '12px 18px', margin: '1.5em 0',
        background: 'rgba(255,255,255,0.025)', borderRadius: '0 6px 6px 0',
        opacity: 0.9,
      }}>{renderContent()}</blockquote>
    )
    case 'code': return (
      <pre style={{
        background: 'rgba(206,145,120,0.08)', color: '#ce9178',
        padding: '12px 16px', borderRadius: 6, fontSize: fontSize - 2,
        fontFamily: "'SF Mono', Consolas, monospace",
        margin: '1em 0', overflow: 'auto', lineHeight: 1.5,
      }}>{text}</pre>
    )
    default: return (
      <p style={{
        ...sharedStyle, margin: '0 0 1em',
        textAlign: 'justify', textIndent: '1.5em',
        hyphens: 'auto', WebkitHyphens: 'auto',
      } as React.CSSProperties}>{renderContent()}</p>
    )
  }
}

// ── Main component ────────────────────────────────────────────────────────────
export default function ReaderEPUB({ path }: Props) {
  const {
    epubChapters, epubChapterIdx, readerTheme,
    setEpubChapters, setEpubChapter,
    setWordPopup, annotationPanelOpen, tocOpen, notePanelOpen,
    setBookmark, getBookmarkVal,
    translationEnabled, annotations,
    setAnnotations,
  } = useReaderStore()
  const { aiConfig, openTab, setActivity } = useAppStore()

  const [loading, setLoading] = useState(false)
  const [fontSizeIdx, setFontSizeIdx] = useState(2)
  const [translating, setTranslating] = useState(false)
  const translationCache = useRef<Map<number, EpubBlock[]>>(new Map())
  const [translatedBlocks, setTranslatedBlocks] = useState<EpubBlock[] | null>(null)
  const [vocab, setVocab] = useState<{ front: string; back: string; type: string }[]>([])
  const [vocabPopup, setVocabPopup] = useState<{
    front: string; back: string; vtype: string; x: number; y: number
  } | null>(null)

  const containerRef = useRef<HTMLDivElement>(null)
  const stem = path.replace(/\.[^/.]+$/, '').split('/').pop() ?? path
  const fontSize = FONT_SIZES[fontSizeIdx]

  // Load EPUB + annotations
  useEffect(() => {
    translationCache.current.clear()
    setLoading(true)
    loadEpub(path)
      .then((chapters) => {
        setEpubChapters(chapters)
        const bm = getBookmarkVal(stem)
        setEpubChapter(bm !== null ? bm : 0)
      })
      .catch((err) => {
        setEpubChapters([{ title: 'Error', blocks: [{ type: 'p', text: String(err) }] }])
        setEpubChapter(0)
      })
      .finally(() => setLoading(false))
    // Load annotations so highlights render immediately (panel need not be open)
    loadAnnotations(stem).then((a) => setAnnotations(stem, a)).catch(() => {})
  }, [path])

  // Load vocabulary words for underline rendering
  useEffect(() => {
    listVocabWords().then(setVocab).catch(() => {})
  }, [path])

  // Track reading position + scroll to top on chapter change
  useEffect(() => {
    if (epubChapters.length > 0) setBookmark(stem, epubChapterIdx)
    setTranslatedBlocks(null)
    containerRef.current?.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior })
  }, [epubChapterIdx])

  // Auto-translate
  useEffect(() => {
    const chapter = epubChapters[epubChapterIdx]
    if (!chapter || !translationEnabled) { setTranslatedBlocks(null); return }
    const cached = translationCache.current.get(epubChapterIdx)
    if (cached) { setTranslatedBlocks(cached); return }
    setTranslating(true)
    translateBlocks(chapter.blocks, aiConfig ?? undefined)
      .then((blocks) => { translationCache.current.set(epubChapterIdx, blocks); setTranslatedBlocks(blocks) })
      .catch(() => setTranslatedBlocks(null))
      .finally(() => setTranslating(false))
  }, [translationEnabled, epubChapterIdx, epubChapters])

  // Keyboard chapter navigation
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName
      if (['INPUT', 'TEXTAREA'].includes(tag)) return
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        setEpubChapter(Math.min(epubChapters.length - 1, epubChapterIdx + 1))
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        setEpubChapter(Math.max(0, epubChapterIdx - 1))
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [epubChapterIdx, epubChapters.length, setEpubChapter])

  // Text selection
  const mousedownInReader = useRef(false)
  useEffect(() => {
    const container = containerRef.current
    const onDown = (e: MouseEvent) => {
      if (container?.contains(e.target as Node)) mousedownInReader.current = true
    }
    const onUp = () => {
      if (!mousedownInReader.current) return
      mousedownInReader.current = false
      requestAnimationFrame(() => {
        setTimeout(() => {
          const sel = window.getSelection()
          if (!sel || sel.isCollapsed || sel.rangeCount === 0) return
          const text = sel.toString().replace(/\s+/g, ' ').trim()
          if (!text || text.length > 2000) return
          const range = sel.getRangeAt(0)
          // getBoundingClientRect() returns zero for cross-block selections; use getClientRects() as fallback
          const clientRects = Array.from(range.getClientRects()).filter(r => r.width > 0 && r.height > 0)
          const rect = clientRects.length > 0 ? clientRects[clientRects.length - 1] : range.getBoundingClientRect()
          if (rect.height === 0) return
          const x = Math.max(8, rect.left + rect.width / 2 - 112)
          setWordPopup({ stem, text, x, y: rect.bottom, chapterIdx: epubChapterIdx })
        }, 10)
      })
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('mouseup', onUp)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('mouseup', onUp)
    }
  }, [epubChapterIdx, setWordPopup])

  const chapter = epubChapters[epubChapterIdx]
  const displayBlocks = (translationEnabled && translatedBlocks) ? translatedBlocks : chapter?.blocks
  const progress = epubChapters.length > 0 ? Math.round((epubChapterIdx / epubChapters.length) * 100) : 0
  const bg = BG[readerTheme], fg = FG[readerTheme], headingFg = HEADING_FG[readerTheme]

  // Annotations for current chapter only
  const chapterAnnotations = useMemo(
    () => (annotations[stem] ?? []).filter(a => a.chapterIdx === epubChapterIdx),
    [annotations, stem, epubChapterIdx]
  )

  const handleVocabClick = useCallback(
    (front: string, back: string, vtype: string, x: number, y: number) => {
      setVocabPopup({ front, back, vtype, x, y })
    }, []
  )

  if (loading) return (
    <div className="flex-1 flex items-center justify-center" style={{ background: bg }}>
      <div className="text-sm" style={{ color: 'var(--text3)' }}>Cargando EPUB…</div>
    </div>
  )

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <ReaderToolbar
        title={chapter?.title ?? path}
        page={epubChapterIdx + 1}
        pageCount={epubChapters.length}
        progress={progress}
        onPrev={() => setEpubChapter(Math.max(0, epubChapterIdx - 1))}
        onNext={() => setEpubChapter(Math.min(epubChapters.length - 1, epubChapterIdx + 1))}
        stem={stem}
        docType="epub"
      />

      {/* Progress bar */}
      <div className="h-[2px] flex-shrink-0" style={{ background: 'var(--border)', position: 'relative' }}>
        <div className="absolute left-0 top-0 h-full transition-all"
          style={{ width: `${progress}%`, background: 'linear-gradient(90deg, var(--indigo), var(--teal))' }} />
      </div>

      {/* Font size + translation status */}
      <div className="flex items-center justify-end gap-2 px-3 py-1 flex-shrink-0"
        style={{ background: bg, borderBottom: `1px solid rgba(255,255,255,0.04)` }}>
        {translationEnabled && (
          <span className="text-[9px] px-2 py-0.5 rounded-full"
            style={{ background: 'var(--indigo-dim)', color: 'var(--indigo)', border: '1px solid rgba(129,140,248,.25)' }}>
            {translating ? 'Traduciendo…' : '🌐 Traducido'}
          </span>
        )}
        <button onClick={() => setFontSizeIdx(i => Math.max(0, i - 1))}
          className="text-[10px] px-1.5 py-0.5 rounded"
          style={{ color: 'var(--text3)', background: 'rgba(255,255,255,0.04)' }}>A-</button>
        <span className="text-[9px] tabular-nums" style={{ color: 'var(--text3)' }}>{fontSize}px</span>
        <button onClick={() => setFontSizeIdx(i => Math.min(FONT_SIZES.length - 1, i + 1))}
          className="text-[10px] px-1.5 py-0.5 rounded"
          style={{ color: 'var(--text3)', background: 'rgba(255,255,255,0.04)' }}>A+</button>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* TOC sidebar */}
        {tocOpen && (
          <div className="flex-shrink-0 overflow-y-auto"
            style={{ width: 210, borderRight: '1px solid var(--border)', background: 'var(--bg2)' }}>
            <div className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider"
              style={{ color: 'var(--text3)', borderBottom: '1px solid var(--border)' }}>
              Contenido
            </div>
            {epubChapters.map((ch, i) => (
              <button key={i} onClick={() => setEpubChapter(i)}
                className="w-full text-left px-3 py-1.5 text-[11px] truncate transition-colors"
                style={{
                  background: i === epubChapterIdx ? 'var(--indigo-dim)' : 'transparent',
                  color: i === epubChapterIdx ? 'var(--indigo)' : 'var(--text2)',
                  borderLeft: i === epubChapterIdx ? '2px solid var(--indigo)' : '2px solid transparent',
                }}>
                {ch.title || `Capítulo ${i + 1}`}
              </button>
            ))}
          </div>
        )}

        {/* Reading area */}
        <div ref={containerRef} className="flex-1 overflow-y-auto melete-epub-content"
          style={{ background: bg }}>
          <div style={{
            maxWidth: 680, margin: '0 auto', padding: '48px 40px 80px',
            fontFamily: "'Georgia', 'Times New Roman', serif",
            fontSize, lineHeight: 1.85, color: fg,
          }}>
            {chapter ? (
              <>
                {translating && !translatedBlocks && (
                  <div style={{ color: 'var(--indigo)', fontSize: 13, marginBottom: 24, opacity: 0.7 }}>
                    Traduciendo capítulo…
                  </div>
                )}
                {displayBlocks?.map((block, i) => (
                  <EpubBlockView
                    key={i}
                    type={block.type}
                    text={block.text}
                    fg={fg}
                    headingFg={headingFg}
                    fontSize={fontSize}
                    theme={readerTheme}
                    annotations={chapterAnnotations}
                    vocab={vocab}
                    onVocabClick={handleVocabClick}
                    onHighlightClick={() => { openTab({ id: `note:${stem}`, name: `${stem}.md`, type: 'note' }); setActivity('explorer') }}
                  />
                ))}
              </>
            ) : (
              <div style={{ color: 'var(--text3)', fontSize: 13 }}>Sin capítulo seleccionado</div>
            )}
          </div>
        </div>

        {annotationPanelOpen && <AnnotationsPanel stem={stem} />}
        {notePanelOpen && <ReaderNotePanel stem={stem} docType="epub" />}
      </div>

      <WordPopup />

      {vocabPopup && (
        <VocabPopup
          front={vocabPopup.front}
          back={vocabPopup.back}
          vtype={vocabPopup.vtype}
          x={vocabPopup.x}
          y={vocabPopup.y}
          onClose={() => setVocabPopup(null)}
        />
      )}
    </div>
  )
}
