import React, { useCallback, useEffect, useRef, useState } from 'react'
import { Viewer, Worker } from '@react-pdf-viewer/core'
import type { RenderPageProps } from '@react-pdf-viewer/core'
import { zoomPlugin } from '@react-pdf-viewer/zoom'
import { pageNavigationPlugin } from '@react-pdf-viewer/page-navigation'
import '@react-pdf-viewer/core/lib/styles/index.css'
import '@react-pdf-viewer/default-layout/lib/styles/index.css'
import { useReaderStore } from '@/store/reader'
import { useAppStore } from '@/store/app'
import { vaultFileUrl, loadAnnotations, getPdfOutline, getPdfText, aiChat } from '@/lib/api'
import type { PdfArea, PdfOutlineItem } from '@/lib/types'
import ReaderToolbar from './ReaderToolbar'
import AnnotationsPanel from './AnnotationsPanel'
import ReaderNotePanel from './ReaderNotePanel'
import WordPopup from './WordPopup'
import { PdfDocSearch } from './DocSearchPanel'

const HIGHLIGHT_BG: Record<string, string> = {
  red:    'rgba(239,68,68,0.45)',
  yellow: 'rgba(245,158,11,0.55)',
  green:  'rgba(34,197,94,0.42)',
  grey:   'rgba(156,163,175,0.35)',
}

interface Props {
  path: string
}

const THEME_FILTER: Record<string, string> = {
  default: 'none',
  night: 'invert(1) hue-rotate(180deg)',
  sepia: 'sepia(0.55) brightness(0.9) contrast(0.95)',
}

const STEP = 0.2

export default function ReaderPDF({ path }: Props) {
  const {
    pdfPage, pdfPageCount, readerTheme,
    setPdfPage, setPdfPageCount,
    annotationPanelOpen, tocOpen, notePanelOpen,
    setWordPopup, bookmarks, setBookmark, removeBookmark, setPosition, getPosition,
    setAnnotations, annotations,
    translationEnabled, docSearchOpen, toggleDocSearch,
  } = useReaderStore()
  const { openTab, setActivity } = useAppStore()

  const [zoom, setZoom] = useState(1.0)
  const [outline, setOutline] = useState<PdfOutlineItem[]>([])
  const [translatedText, setTranslatedText] = useState<string | null>(null)
  const [translating, setTranslating] = useState(false)
  const translationCache = useRef<Map<string, string>>(new Map())
  const containerRef = useRef<HTMLDivElement>(null)
  const stem = path.replace(/\.[^/.]+$/, '').split('/').pop() ?? path
  const fileUrl = vaultFileUrl(path)
  const progress = pdfPageCount > 0 ? Math.round((pdfPage / pdfPageCount) * 100) : 0

  // Restore bookmark on open + load annotations + load PDF outline
  const restoredRef = useRef(false)
  const docLoadedRef = useRef(false)
  useEffect(() => {
    restoredRef.current = false
    docLoadedRef.current = false
    loadAnnotations(stem).then((a) => setAnnotations(stem, a)).catch(() => {})
    getPdfOutline(path).then(setOutline).catch(() => setOutline([]))
  }, [path])

  // Plugins — must be called at top level
  const zoomPluginInstance = zoomPlugin({ enableShortcuts: false })
  const pageNavPlugin = pageNavigationPlugin()
  const { jumpToPage } = pageNavPlugin

  // Propagate zoom changes via the plugin (keeps the text layer aligned)
  useEffect(() => {
    if (docLoadedRef.current) {
      try { zoomPluginInstance.zoomTo(zoom) } catch {}
    }
  }, [zoom])

  // Text selection — track mousedown inside the reader so we know the
  // selection originated here (more reliable than DOM containment checks).
  const mousedownInReader = useRef(false)
  useEffect(() => {
    const container = containerRef.current
    const onDown = () => { mousedownInReader.current = true }
    const onUp = () => {
      if (!mousedownInReader.current) return
      mousedownInReader.current = false
      setTimeout(() => {
        const sel = window.getSelection()
        if (!sel || sel.isCollapsed) return
        // Clean PDF text: remove hyphenation, normalize whitespace
        const text = sel.toString()
          .replace(/-\n/g, '')       // soft hyphens from PDF line breaks
          .replace(/\n/g, ' ')       // remaining newlines
          .replace(/\s+/g, ' ')
          .trim()
        if (!text || text.length > 2000) return
        const range = sel.getRangeAt(0)

        // Use individual rects to support cross-block selections
        const clientRects = Array.from(range.getClientRects()).filter(r => r.width > 1 && r.height > 1)
        if (clientRects.length === 0) return
        const lastRect = clientRects[clientRects.length - 1]

        // Map selection rects to page-relative percentage coordinates.
        // Use data-testid="core__page-layer-{N}" to get the real page index
        // (the viewer uses virtualization, so DOM order ≠ page index).
        const pageEls = Array.from(document.querySelectorAll('.rpv-core__page-layer'))
        const pdfAreas: PdfArea[] = clientRects.flatMap(r => {
          const pageEl = pageEls.find(el => {
            const pr = el.getBoundingClientRect()
            return r.top >= pr.top - 4 && r.bottom <= pr.bottom + 4
          })
          if (!pageEl) return []
          const testId = pageEl.getAttribute('data-testid') ?? ''
          const pageIndex = parseInt(testId.replace('core__page-layer-', ''), 10)
          if (isNaN(pageIndex)) return []
          const pr = pageEl.getBoundingClientRect()
          return [{
            pageIndex,
            top: ((r.top - pr.top) / pr.height) * 100,
            left: ((r.left - pr.left) / pr.width) * 100,
            width: (r.width / pr.width) * 100,
            height: (r.height / pr.height) * 100,
          }]
        })

        setWordPopup({
          stem,
          text,
          x: lastRect.left + lastRect.width / 2 - 112,
          y: lastRect.bottom,
          page: pdfPage,
          pdfAreas: pdfAreas.length > 0 ? pdfAreas : undefined,
        })
      }, 60)
    }
    container?.addEventListener('mousedown', onDown)
    document.addEventListener('mouseup', onUp)
    return () => {
      container?.removeEventListener('mousedown', onDown)
      document.removeEventListener('mouseup', onUp)
    }
  }, [pdfPage, setWordPopup])

  // Translation
  useEffect(() => {
    if (!translationEnabled) { setTranslatedText(null); return }
    const key = `${stem}:${pdfPage}`
    const cached = translationCache.current.get(key)
    if (cached) { setTranslatedText(cached); return }
    setTranslating(true)
    setTranslatedText(null)
    getPdfText(path, pdfPage)
      .then(({ text }) => {
        if (!text.trim()) { setTranslating(false); return }
        return aiChat([{ role: 'user', content: `Traduce al español el siguiente texto. Mantén el formato de párrafos:\n\n${text.slice(0, 4000)}` }])
          .then(r => { translationCache.current.set(key, r.response); setTranslatedText(r.response) })
      })
      .catch(() => setTranslatedText('Error al traducir. Verifica la configuración de IA.'))
      .finally(() => setTranslating(false))
  }, [translationEnabled, pdfPage, stem])

  const handleZoomIn = useCallback(() => setZoom((z) => Math.min(3, parseFloat((z + STEP).toFixed(1)))), [])
  const handleZoomOut = useCallback(() => setZoom((z) => Math.max(0.4, parseFloat((z - STEP).toFixed(1)))), [])

  // Keyboard navigation (page) + zoom
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName
      if (['INPUT', 'TEXTAREA'].includes(tag)) return
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') { e.preventDefault(); toggleDocSearch(); return }
      if ((e.ctrlKey || e.metaKey) && e.key === '=') { e.preventDefault(); handleZoomIn(); return }
      if ((e.ctrlKey || e.metaKey) && e.key === '-') { e.preventDefault(); handleZoomOut(); return }
      if (pdfPageCount > 0) {
        if (e.key === 'ArrowRight' || e.key === 'PageDown') {
          jumpToPage(Math.min(pdfPageCount - 1, pdfPage + 1))
        } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
          jumpToPage(Math.max(0, pdfPage - 1))
        }
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [handleZoomIn, handleZoomOut, pdfPage, pdfPageCount, setPdfPage, toggleDocSearch])

  const bookmarkPage = bookmarks[stem] ?? null

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <ReaderToolbar
        title={path.split('/').pop() ?? path}
        page={pdfPage + 1}
        pageCount={pdfPageCount}
        progress={progress}
        onPrev={() => pdfPageCount > 0 && jumpToPage(Math.max(0, pdfPage - 1))}
        onNext={() => pdfPageCount > 0 && jumpToPage(Math.min(pdfPageCount - 1, pdfPage + 1))}
        stem={stem}
        docType="pdf"
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        zoomLevel={zoom}
      />

      {/* Progress bar */}
      <div className="h-[2px] flex-shrink-0" style={{ background: 'var(--border)', position: 'relative' }}>
        <div className="absolute left-0 top-0 h-full transition-all"
          style={{ width: `${progress}%`, background: 'linear-gradient(90deg, var(--indigo), var(--teal))' }} />
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* TOC sidebar */}
        {tocOpen && (
          <div className="flex-shrink-0 overflow-y-auto"
            style={{ width: 220, borderRight: '1px solid var(--border)', background: 'var(--bg2)' }}>
            <div className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider"
              style={{ color: 'var(--text3)', borderBottom: '1px solid var(--border)' }}>
              Índice
            </div>
            {outline.length === 0 ? (
              <div className="p-4 text-[11px]" style={{ color: 'var(--text3)' }}>
                Sin índice
              </div>
            ) : (
              outline.map((item, i) => (
                <button key={i}
                  onClick={() => jumpToPage(item.page)}
                  className="w-full text-left py-1 pr-2 text-[11px] truncate hover:opacity-80 transition-opacity"
                  style={{
                    paddingLeft: (item.level - 1) * 12 + 10,
                    color: item.level === 1 ? 'var(--text2)' : 'var(--text3)',
                    fontWeight: item.level === 1 ? 500 : 400,
                    borderBottom: '1px solid rgba(255,255,255,0.03)',
                  }}
                  title={`${item.title} — p. ${item.page + 1}`}
                >
                  <span className="block truncate">{item.title}</span>
                </button>
              ))
            )}
          </div>
        )}

        {/* PDF viewer */}
        <div
          ref={containerRef}
          className="flex-1 overflow-auto"
          style={{ background: '#0f1319', position: 'relative' }}
        >
          {/* Bookmark indicator */}
          {bookmarkPage !== null && bookmarkPage !== pdfPage && (
            <div
              className="absolute top-2 right-4 z-10 flex items-center gap-1.5 px-2 py-1 rounded-full text-[10px] cursor-pointer"
              style={{ background: 'rgba(227,179,65,0.15)', color: 'var(--orange)', border: '1px solid rgba(227,179,65,0.3)' }}
              onClick={() => jumpToPage(bookmarkPage)}
              title={`Go to bookmarked page ${bookmarkPage + 1}`}
            >
              ↩ Go to bookmark (p. {bookmarkPage + 1})
            </div>
          )}

          {/* CSS filter wrapper for theme */}
          <div style={{ filter: THEME_FILTER[readerTheme], minHeight: '100%' }}>
            <Worker workerUrl="https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js">
              <Viewer
                fileUrl={fileUrl}
                plugins={[zoomPluginInstance, pageNavPlugin]}
                defaultScale={zoom}
                onDocumentLoad={(e) => {
                  setPdfPageCount(e.doc.numPages)
                  docLoadedRef.current = true
                  if (!restoredRef.current) {
                    restoredRef.current = true
                    const pos = getPosition(stem)
                    if (pos !== null && pos > 0) setTimeout(() => jumpToPage(pos), 100)
                  }
                }}
                onPageChange={(e) => {
                  setPdfPage(e.currentPage)
                  setPosition(stem, e.currentPage)
                }}
                initialPage={pdfPage}
                renderPage={(props: RenderPageProps) => {
                  const pageAnns = (annotations[stem] ?? []).filter(a =>
                    a.pdfAreas?.some(area => area.pageIndex === props.pageIndex)
                  )
                  return (
                    <>
                      {props.canvasLayer.children}
                      {/* Highlight overlays — rendered between canvas and text layer so text stays selectable */}
                      {pageAnns.length > 0 && (
                        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
                          {pageAnns.flatMap(ann => {
                            const areas = (ann.pdfAreas ?? []).filter(a => a.pageIndex === props.pageIndex)
                            return areas.map((area, i) => (
                              <div
                                key={`${ann.id}-${i}`}
                                title="Ir a nota"
                                onClick={() => { openTab({ id: `note:${stem}`, name: `${stem}.md`, type: 'note' }); setActivity('explorer') }}
                                style={{
                                  position: 'absolute',
                                  top: `${area.top}%`,
                                  left: `${area.left}%`,
                                  width: `${area.width}%`,
                                  height: `${area.height}%`,
                                  background: HIGHLIGHT_BG[ann.color] ?? HIGHLIGHT_BG.yellow,
                                  borderRadius: 2,
                                  pointerEvents: 'auto',
                                  cursor: 'pointer',
                                }}
                              >
                                {/* Link indicator on the first area of each annotation */}
                                {i === 0 && (
                                  <div style={{
                                    position: 'absolute',
                                    top: -7,
                                    right: 0,
                                    fontSize: 8,
                                    lineHeight: 1,
                                    background: 'rgba(0,0,0,0.55)',
                                    color: '#fff',
                                    borderRadius: 3,
                                    padding: '1px 3px',
                                    pointerEvents: 'none',
                                    userSelect: 'none',
                                  }}>↗</div>
                                )}
                              </div>
                            ))
                          })}
                        </div>
                      )}
                      {props.textLayer.children}
                      {props.annotationLayer.children}
                    </>
                  )
                }}
              />
            </Worker>
          </div>
        </div>

        {annotationPanelOpen && <AnnotationsPanel stem={stem} />}
        {notePanelOpen && <ReaderNotePanel stem={stem} docType="pdf" />}
        {docSearchOpen && <PdfDocSearch path={path} onJump={jumpToPage} />}
      </div>

      <WordPopup />

      {/* Translation panel */}
      {translationEnabled && (
        <div className="flex-shrink-0 overflow-y-auto" style={{
          maxHeight: 220, borderTop: '1px solid var(--border)',
          background: 'var(--bg2)', padding: '10px 16px',
        }}>
          <div className="text-[9px] uppercase tracking-wider mb-2" style={{ color: 'var(--teal)' }}>
            Traducción — p. {pdfPage + 1}
          </div>
          {translating ? (
            <div className="text-[11px]" style={{ color: 'var(--text3)' }}>Traduciendo…</div>
          ) : translatedText ? (
            <div className="text-[11px] leading-relaxed whitespace-pre-wrap" style={{ color: 'var(--text2)' }}>
              {translatedText}
            </div>
          ) : null}
        </div>
      )}
    </div>
  )
}
