import React from 'react'
import { ChevronLeft, ChevronRight, Sun, Moon, Coffee, StickyNote, List, Bookmark, BookmarkCheck, ZoomIn, ZoomOut, Languages, NotebookPen, PanelRight } from 'lucide-react'
import { useReaderStore } from '@/store/reader'
import { useAppStore } from '@/store/app'

interface Props {
  title: string
  page: number
  pageCount: number
  progress: number
  onPrev: () => void
  onNext: () => void
  stem: string
  docType?: 'pdf' | 'epub' | 'txt'
  onZoomIn?: () => void
  onZoomOut?: () => void
  zoomLevel?: number
}

export default function ReaderToolbar({ title, page, pageCount, progress, onPrev, onNext, stem, docType, onZoomIn, onZoomOut, zoomLevel }: Props) {
  const { readerTheme, setReaderTheme, toggleAnnotationPanel, annotationPanelOpen, tocOpen, toggleToc, bookmarks, setBookmark, translationEnabled, toggleTranslation, notePanelOpen, toggleNotePanel } = useReaderStore()
  const { openTab, setActivity } = useAppStore()
  const isBookmarked = bookmarks[stem] !== undefined

  const handleOpenNote = () => {
    openTab({ id: `note:${stem}`, name: `${stem}.md`, type: 'note' })
    setActivity('explorer')
  }
  const currentVal = docType === 'epub' ? page - 1 : page - 1

  const handleBookmark = () => {
    if (isBookmarked) {
      // Remove bookmark
      const next = { ...bookmarks }
      delete next[stem]
      try { localStorage.setItem('melete_bookmarks', JSON.stringify(next)) } catch {}
      useReaderStore.setState({ bookmarks: next })
    } else {
      setBookmark(stem, currentVal)
    }
  }

  return (
    <div
      className="flex items-center gap-1 flex-shrink-0 h-[32px] px-2 text-[11px]"
      style={{ background: 'var(--bg2)', borderBottom: '1px solid var(--border)', color: 'var(--text3)' }}
    >
      {/* TOC toggle */}
      <button
        onClick={toggleToc}
        title="Table of contents"
        className="p-1 rounded"
        style={{
          color: tocOpen ? 'var(--teal)' : 'var(--text3)',
          background: tocOpen ? 'var(--teal-dim)' : 'transparent',
        }}
      >
        <List size={13} />
      </button>

      {/* Title */}
      <span className="font-medium truncate mx-1" style={{ color: 'var(--text2)', maxWidth: 180 }}>
        {title}
      </span>

      {/* Page navigation */}
      <div className="flex items-center gap-0.5">
        <button onClick={onPrev} className="p-0.5 hover:opacity-80">
          <ChevronLeft size={12} strokeWidth={1.8} />
        </button>
        <span className="tabular-nums text-[10px]">{page}/{pageCount || '?'}</span>
        <button onClick={onNext} className="p-0.5 hover:opacity-80">
          <ChevronRight size={12} strokeWidth={1.8} />
        </button>
      </div>

      <span className="flex-1" />

      {/* Zoom (PDF only) */}
      {docType === 'pdf' && (
        <div className="flex items-center gap-0.5">
          <button onClick={onZoomOut} className="p-1 rounded hover:opacity-80" title="Zoom out">
            <ZoomOut size={12} />
          </button>
          {zoomLevel !== undefined && (
            <span className="text-[10px] w-10 text-center tabular-nums" style={{ color: 'var(--text3)' }}>
              {Math.round(zoomLevel * 100)}%
            </span>
          )}
          <button onClick={onZoomIn} className="p-1 rounded hover:opacity-80" title="Zoom in">
            <ZoomIn size={12} />
          </button>
        </div>
      )}

      {/* Bookmark */}
      <button
        onClick={handleBookmark}
        title={isBookmarked ? 'Remove bookmark' : 'Bookmark current page'}
        className="p-1 rounded"
        style={{
          color: isBookmarked ? 'var(--orange)' : 'var(--text3)',
          background: isBookmarked ? 'rgba(227,179,65,0.12)' : 'transparent',
        }}
      >
        {isBookmarked ? <BookmarkCheck size={12} /> : <Bookmark size={12} />}
      </button>

      {/* Open book note */}
      <button
        onClick={handleOpenNote}
        title="Abrir notas del libro"
        className="p-1 rounded"
        style={{ color: 'var(--text3)' }}
      >
        <NotebookPen size={12} />
      </button>

      {/* Theme switcher */}
      <button onClick={() => setReaderTheme('default')} title="Default" className="p-1 rounded"
        style={{ color: readerTheme === 'default' ? 'var(--indigo)' : 'var(--text3)', background: readerTheme === 'default' ? 'var(--indigo-dim)' : 'transparent' }}>
        <Sun size={12} />
      </button>
      <button onClick={() => setReaderTheme('night')} title="Night" className="p-1 rounded"
        style={{ color: readerTheme === 'night' ? 'var(--indigo)' : 'var(--text3)', background: readerTheme === 'night' ? 'var(--indigo-dim)' : 'transparent' }}>
        <Moon size={12} />
      </button>
      <button onClick={() => setReaderTheme('sepia')} title="Sepia" className="p-1 rounded"
        style={{ color: readerTheme === 'sepia' ? 'var(--orange)' : 'var(--text3)', background: readerTheme === 'sepia' ? 'rgba(227,179,65,0.12)' : 'transparent' }}>
        <Coffee size={12} />
      </button>

      {/* Translation toggle (EPUB only) */}
      {docType === 'epub' && (
        <button onClick={toggleTranslation} title={translationEnabled ? 'Mostrar original' : 'Traducir al español (IA)'}
          className="p-1 rounded"
          style={{ color: translationEnabled ? 'var(--indigo)' : 'var(--text3)', background: translationEnabled ? 'var(--indigo-dim)' : 'transparent' }}>
          <Languages size={12} />
        </button>
      )}

      {/* Note panel toggle (split view) */}
      <button onClick={toggleNotePanel} title="Panel de notas del libro"
        className="p-1 rounded"
        style={{ color: notePanelOpen ? 'var(--indigo)' : 'var(--text3)', background: notePanelOpen ? 'var(--indigo-dim)' : 'transparent' }}>
        <PanelRight size={12} />
      </button>

      {/* Annotations toggle */}
      <button onClick={toggleAnnotationPanel} title="Anotaciones" className="p-1 rounded"
        style={{ color: annotationPanelOpen ? 'var(--teal)' : 'var(--text3)', background: annotationPanelOpen ? 'var(--teal-dim)' : 'transparent' }}>
        <StickyNote size={12} />
      </button>
    </div>
  )
}
