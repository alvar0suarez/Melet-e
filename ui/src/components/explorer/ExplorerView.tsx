import React, { useRef, useState, useCallback, Component, type ReactNode } from 'react'
import { useAppStore } from '@/store/app'
import { useReaderStore } from '@/store/reader'
import { useEditorStore } from '@/store/editor'
import { trackReadingSession } from '@/lib/api'
import MonacoEditor from '../editor/MonacoEditor'
import EditorToolbar from '../editor/EditorToolbar'
import BacklinksPanel from '../editor/BacklinksPanel'
import ReaderEPUB from '../reader/ReaderEPUB'
import ReaderPDF from '../reader/ReaderPDF'
import TabBar from './TabBar'

export default function ExplorerView() {
  const { tabs, activeTabId, closeTab, setActivity } = useAppStore()
  const { setDoc } = useReaderStore()
  const activeTab = tabs.find((t) => t.id === activeTabId)

  // Panel sizes
  const [editorWidth, setEditorWidth] = useState(50) // percent
  const [bottomHeight, setBottomHeight] = useState(200)
  const containerRef = useRef<HTMLDivElement>(null)
  const isDragging = useRef(false)

  const handleVerticalDrag = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    isDragging.current = true
    const startX = e.clientX
    const startWidth = editorWidth
    const containerW = containerRef.current?.clientWidth ?? 1200

    const onMove = (ev: MouseEvent) => {
      const delta = ev.clientX - startX
      const newPct = Math.min(80, Math.max(20, startWidth + (delta / containerW) * 100))
      setEditorWidth(newPct)
    }
    const onUp = () => {
      isDragging.current = false
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
    }
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
  }, [editorWidth])

  // Determine what to show in each pane
  const noteTab = activeTab?.type === 'note' ? activeTab : tabs.find((t) => t.type === 'note')
  const docTab = activeTab?.type !== 'note' ? activeTab : tabs.find((t) => t.type !== 'note')

  const isActiveDoc = activeTab && activeTab.type !== 'note'
  const isActiveNote = activeTab && activeTab.type === 'note'

  if (tabs.length === 0) {
    return (
      <WelcomePane />
    )
  }

  // If only docs open (no notes), show reader fullscreen
  if (!noteTab && docTab) {
    return (
      <div className="flex flex-col h-full overflow-hidden">
        <TabBar />
        <DocErrorBoundary key={docTab.path ?? docTab.name}><DocPane tab={docTab} /></DocErrorBoundary>
      </div>
    )
  }

  // If only notes open, show editor fullscreen
  if (noteTab && !docTab) {
    return (
      <div className="flex flex-col h-full overflow-hidden">
        <TabBar />
        <div className="flex-1 flex flex-col overflow-hidden">
          <EditorToolbar noteName={noteTab.name.replace(/\.md$/, '')} onDelete={() => closeTab(noteTab.id)} />
          <div className="flex-1 overflow-hidden">
            <MonacoEditor noteName={noteTab.name.replace(/\.md$/, '')} />
          </div>
          <BacklinksPanel noteName={noteTab.name.replace(/\.md$/, '')} />
        </div>
      </div>
    )
  }

  // Split view — note + document
  return (
    <div className="flex flex-col h-full overflow-hidden">
      <TabBar />
      <div ref={containerRef} className="flex flex-1 overflow-hidden">
        {/* Editor pane */}
        <div
          className="flex flex-col overflow-hidden"
          style={{
            width: `${editorWidth}%`,
            borderRight: '1px solid var(--border)',
            minWidth: 200,
          }}
        >
          {noteTab && (
            <>
              <EditorToolbar
                noteName={noteTab.name.replace(/\.md$/, '')}
                onDelete={() => closeTab(noteTab.id)}
              />
              <div className="flex-1 overflow-hidden">
                <MonacoEditor noteName={noteTab.name.replace(/\.md$/, '')} />
              </div>
              <BacklinksPanel noteName={noteTab.name.replace(/\.md$/, '')} />
            </>
          )}
        </div>

        {/* Resize handle */}
        <div
          className="resize-handle"
          onMouseDown={handleVerticalDrag}
        />

        {/* Reader pane */}
        <div className="flex-1 flex flex-col overflow-hidden" style={{ minWidth: 200 }}>
          {docTab ? (
            <DocErrorBoundary key={docTab.path ?? docTab.name}><DocPane tab={docTab} /></DocErrorBoundary>
          ) : (
            <div className="flex items-center justify-center flex-1 text-sm" style={{ color: 'var(--text3)' }}>
              Open a document from the library
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Error boundary so a PDF/EPUB crash can't take down the whole app ─────────
class DocErrorBoundary extends Component<{ children: ReactNode; key?: string }, { error: string | null }> {
  state = { error: null }
  static getDerivedStateFromError(e: Error) { return { error: e.message } }
  render() {
    if (this.state.error) return (
      <div className="flex flex-col items-center justify-center flex-1 gap-3 p-8">
        <div className="text-sm font-medium" style={{ color: 'var(--red)' }}>Error al cargar el documento</div>
        <div className="text-xs text-center max-w-sm" style={{ color: 'var(--text3)' }}>{this.state.error}</div>
        <button
          onClick={() => this.setState({ error: null })}
          className="px-3 py-1.5 rounded text-xs"
          style={{ background: 'var(--bg3)', color: 'var(--text2)', border: '1px solid var(--border)' }}>
          Reintentar
        </button>
      </div>
    )
    return this.props.children
  }
}

function DocPane({ tab }: { tab: { id: string; name: string; type: string; path?: string } }) {
  const { setDoc } = useReaderStore()
  const path = tab.path ?? tab.name
  const sessionStart = React.useRef(Date.now())

  React.useEffect(() => {
    setDoc(path, tab.type as 'pdf' | 'epub' | 'txt')
    sessionStart.current = Date.now()
    return () => {
      const seconds = Math.round((Date.now() - sessionStart.current) / 1000)
      if (seconds >= 5) trackReadingSession(path, seconds).catch(() => {})
    }
  }, [path])

  if (tab.type === 'epub') return <ReaderEPUB path={path} />
  if (tab.type === 'pdf') return <ReaderPDF path={path} />
  return (
    <div className="flex items-center justify-center flex-1 text-sm" style={{ color: 'var(--text3)' }}>
      Text reader coming soon
    </div>
  )
}

function WelcomePane() {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-4" style={{ background: 'var(--bg)' }}>
      <div
        className="text-3xl font-black"
        style={{
          background: 'linear-gradient(135deg, var(--indigo), var(--teal))',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
        }}
      >
        Melete
      </div>
      <p className="text-sm" style={{ color: 'var(--text3)' }}>
        Open a note or document from the sidebar to get started
      </p>
      <div className="flex gap-3 text-[10px] mt-2" style={{ color: 'var(--text3)' }}>
        <span>Ctrl+S — Guardar · Ctrl+Shift+S — Snapshot</span>
        <span>·</span>
        <span>Ctrl+K — Insert wikilink</span>
        <span>·</span>
        <span>Ctrl+B — Bold</span>
      </div>
    </div>
  )
}
