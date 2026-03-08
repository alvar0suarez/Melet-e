import React, { useEffect, useState, useCallback, useRef } from 'react'
import { FolderOpen, Search, Plus, RefreshCw, AlertCircle } from 'lucide-react'
import { useAppStore } from '@/store/app'
import { useEditorStore } from '@/store/editor'
import { listNotes, listDocuments, newNote, getNote, deleteNote, renameNote } from '@/lib/api'
import type { DocMeta } from '@/lib/types'

const extColor: Record<string, string> = {
  md: '#7c3aed',
  epub: '#0891b2',
  pdf: '#dc2626',
  txt: '#d97706',
}

interface ContextMenu {
  x: number
  y: number
  type: 'note' | 'doc'
  name: string
}

export default function Sidebar() {
  const { activity, openTab, activeTabId, vaultPath, closeTab } = useAppStore()
  const { setNotes, setNoteContent } = useEditorStore()
  const [notes, setLocalNotes] = useState<string[]>([])
  const [docs, setDocs] = useState<DocMeta[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [contextMenu, setContextMenu] = useState<ContextMenu | null>(null)
  const [renamingNote, setRenamingNote] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const renameInputRef = useRef<HTMLInputElement>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [n, d] = await Promise.all([listNotes(), listDocuments()])
      setLocalNotes(n)
      setNotes(n)
      setDocs(d)
    } catch {
      setError('Error loading vault. Check the server is running.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (vaultPath) load()
  }, [vaultPath])

  // Close context menu on outside click
  useEffect(() => {
    if (!contextMenu) return
    const handler = () => setContextMenu(null)
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [contextMenu])

  // Focus rename input when it appears
  useEffect(() => {
    if (renamingNote) renameInputRef.current?.focus()
  }, [renamingNote])

  const filteredNotes = notes.filter((n) =>
    n.toLowerCase().includes(search.toLowerCase())
  )
  const filteredDocs = docs.filter((d) =>
    d.name.toLowerCase().includes(search.toLowerCase())
  )

  const openNote = async (name: string) => {
    const { content } = await getNote(name)
    setNoteContent(name, content)
    openTab({ id: `note:${name}`, name: `${name}.md`, type: 'note' })
  }

  const openDoc = (doc: DocMeta) => {
    const type = doc.ext as 'pdf' | 'epub' | 'txt'
    openTab({ id: `doc:${doc.path}`, name: doc.name, type, path: doc.path })
  }

  const handleNewNote = async () => {
    const { name } = await newNote()
    await load()
    openNote(name)
  }

  const handleContextMenu = (e: React.MouseEvent, type: 'note' | 'doc', name: string) => {
    e.preventDefault()
    e.stopPropagation()
    setContextMenu({ x: e.clientX, y: e.clientY, type, name })
  }

  const handleRenameStart = (name: string) => {
    setContextMenu(null)
    setRenamingNote(name)
    setRenameValue(name)
  }

  const handleRenameCommit = async () => {
    if (!renamingNote || !renameValue.trim() || renameValue === renamingNote) {
      setRenamingNote(null)
      return
    }
    const newName = renameValue.trim()
    await renameNote(renamingNote, newName)
    // Update open tab if it was open
    closeTab(`note:${renamingNote}`)
    await load()
    openNote(newName)
    setRenamingNote(null)
  }

  const handleDeleteNote = async (name: string) => {
    setContextMenu(null)
    if (!confirm(`Eliminar "${name}.md"? Esta acción no se puede deshacer.`)) return
    await deleteNote(name)
    closeTab(`note:${name}`)
    await load()
  }

  const title =
    activity === 'explorer' ? 'Explorer'
    : activity === 'library' ? 'Library'
    : activity === 'calendar' ? 'Calendar'
    : activity === 'sourcecontrol' ? 'Source Control'
    : activity === 'flashcards' ? 'Flashcards'
    : activity === 'graph' ? 'Graph'
    : 'Settings'

  return (
    <div
      className="flex flex-col h-full overflow-hidden"
      style={{ background: 'var(--bg2)', borderRight: '1px solid var(--border)' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-[14px] pt-3 pb-[6px] flex-shrink-0">
        <span className="text-[10px] font-bold uppercase tracking-[1.5px]" style={{ color: 'var(--text3)' }}>
          {title}
        </span>
        <div className="flex gap-[2px]">
          <button
            onClick={handleNewNote}
            title="New note"
            className="w-[22px] h-[22px] rounded flex items-center justify-center"
            style={{ color: 'var(--text3)' }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--bg3)'; (e.currentTarget as HTMLElement).style.color = 'var(--text2)' }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = 'var(--text3)' }}
          >
            <Plus size={13} strokeWidth={1.8} />
          </button>
          <button
            onClick={load}
            title="Refresh"
            className="w-[22px] h-[22px] rounded flex items-center justify-center"
            style={{ color: 'var(--text3)' }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--bg3)'; (e.currentTarget as HTMLElement).style.color = 'var(--text2)' }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = 'var(--text3)' }}
          >
            <RefreshCw size={13} strokeWidth={1.8} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Search */}
      <div
        className="mx-[10px] mb-2 rounded-md px-[10px] py-[5px] flex items-center gap-[6px] text-xs flex-shrink-0"
        style={{ background: 'var(--bg3)', border: '1px solid var(--border)' }}
      >
        <Search size={11} strokeWidth={1.8} style={{ color: 'var(--text3)', flexShrink: 0 }} />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search…"
          className="flex-1 bg-transparent outline-none text-xs"
          style={{ color: 'var(--text3)' }}
        />
      </div>

      {/* Vault path hint */}
      {vaultPath && (
        <div className="px-3 pb-1 flex-shrink-0 truncate text-[9px]" style={{ color: 'var(--text3)' }} title={vaultPath}>
          📁 {vaultPath}
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="mx-2 mb-2 px-2 py-1 rounded text-[10px] flex items-center gap-1"
          style={{ background: 'rgba(248,81,73,.1)', color: 'var(--danger)', border: '1px solid rgba(248,81,73,.2)' }}>
          <AlertCircle size={10} />
          {error}
        </div>
      )}

      {/* Tree */}
      <div className="flex-1 overflow-y-auto">
        {/* Notes */}
        {(activity === 'explorer' || activity === 'graph') && (
          <div className="mb-1">
            <div
              className="flex items-center gap-[5px] px-[14px] py-[5px] text-[10px] font-bold uppercase tracking-[1px]"
              style={{ color: 'var(--text3)' }}
            >
              <FolderOpen size={12} strokeWidth={2} />
              Notes ({filteredNotes.length})
            </div>
            {filteredNotes.map((name) => {
              const isActive = activeTabId === `note:${name}`
              const isRenaming = renamingNote === name
              return (
                <div
                  key={name}
                  onClick={() => !isRenaming && openNote(name)}
                  onContextMenu={(e) => handleContextMenu(e, 'note', name)}
                  className="flex items-center gap-[7px] py-[3px] mx-1 rounded text-sm cursor-pointer"
                  style={{
                    paddingLeft: 26, paddingRight: 8,
                    color: isActive ? 'var(--indigo)' : 'var(--text2)',
                    background: isActive ? 'var(--indigo-dim)' : 'transparent',
                  }}
                  onMouseEnter={(e) => { if (!isActive) { (e.currentTarget as HTMLElement).style.background = 'var(--bg3)'; (e.currentTarget as HTMLElement).style.color = 'var(--text)' } }}
                  onMouseLeave={(e) => { if (!isActive) { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = 'var(--text2)' } }}
                >
                  <span className="w-2 h-2 rounded-[2px] flex-shrink-0" style={{ background: extColor.md }} />
                  {isRenaming ? (
                    <input
                      ref={renameInputRef}
                      value={renameValue}
                      onChange={(e) => setRenameValue(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleRenameCommit()
                        if (e.key === 'Escape') setRenamingNote(null)
                        e.stopPropagation()
                      }}
                      onBlur={handleRenameCommit}
                      onClick={(e) => e.stopPropagation()}
                      className="flex-1 bg-transparent outline-none border-b text-xs"
                      style={{ color: 'var(--text)', borderColor: 'var(--indigo)' }}
                    />
                  ) : (
                    <span className="truncate">{name}.md</span>
                  )}
                </div>
              )
            })}
            {filteredNotes.length === 0 && !loading && (
              <div className="px-7 py-1 text-[10px]" style={{ color: 'var(--text3)' }}>No notes yet</div>
            )}
          </div>
        )}

        {/* Library */}
        {(activity === 'explorer' || activity === 'library') && (
          <div>
            <div
              className="flex items-center gap-[5px] px-[14px] py-[5px] text-[10px] font-bold uppercase tracking-[1px]"
              style={{ color: 'var(--text3)' }}
            >
              <FolderOpen size={12} strokeWidth={2} />
              Library ({filteredDocs.length})
            </div>
            {filteredDocs.map((doc) => {
              const isActive = activeTabId === `doc:${doc.path}`
              return (
                <div
                  key={doc.path}
                  onClick={() => openDoc(doc)}
                  onContextMenu={(e) => handleContextMenu(e, 'doc', doc.name)}
                  className="flex items-center gap-[7px] py-[3px] mx-1 rounded text-sm cursor-pointer"
                  style={{
                    paddingLeft: 26, paddingRight: 8,
                    color: isActive ? 'var(--indigo)' : 'var(--text2)',
                    background: isActive ? 'var(--indigo-dim)' : 'transparent',
                  }}
                  onMouseEnter={(e) => { if (!isActive) { (e.currentTarget as HTMLElement).style.background = 'var(--bg3)'; (e.currentTarget as HTMLElement).style.color = 'var(--text)' } }}
                  onMouseLeave={(e) => { if (!isActive) { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = 'var(--text2)' } }}
                >
                  <span className="w-2 h-2 rounded-[2px] flex-shrink-0" style={{ background: extColor[doc.ext] ?? '#666' }} />
                  <span className="truncate">{doc.name}.{doc.ext}</span>
                </div>
              )
            })}
            {filteredDocs.length === 0 && !loading && (
              <div className="px-7 py-1 text-[10px]" style={{ color: 'var(--text3)' }}>
                No books found — add PDFs/EPUBs to Files/
              </div>
            )}
          </div>
        )}
      </div>

      {/* Context menu */}
      {contextMenu && (
        <div
          className="fixed z-50 py-1 rounded shadow-xl"
          style={{
            left: contextMenu.x,
            top: contextMenu.y,
            background: '#1e2431',
            border: '1px solid var(--border2)',
            minWidth: 160,
            boxShadow: '0 8px 32px rgba(0,0,0,.6)',
          }}
          onMouseDown={(e) => e.stopPropagation()}
        >
          {contextMenu.type === 'note' ? (
            <>
              <CtxItem onClick={() => { openNote(contextMenu.name); setContextMenu(null) }}>Abrir</CtxItem>
              <CtxItem onClick={() => handleRenameStart(contextMenu.name)}>Renombrar</CtxItem>
              <div style={{ height: 1, background: 'var(--border)', margin: '2px 0' }} />
              <CtxItem danger onClick={() => handleDeleteNote(contextMenu.name)}>Eliminar</CtxItem>
            </>
          ) : (
            <>
              <CtxItem onClick={() => {
                const doc = docs.find((d) => d.name === contextMenu.name)
                if (doc) openDoc(doc)
                setContextMenu(null)
              }}>Abrir</CtxItem>
            </>
          )}
        </div>
      )}
    </div>
  )
}

function CtxItem({ onClick, danger, children }: { onClick: () => void; danger?: boolean; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className="w-full text-left px-3 py-[5px] text-xs"
      style={{ color: danger ? 'var(--red)' : 'var(--text2)', display: 'block' }}
      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = danger ? 'rgba(248,81,73,.12)' : 'var(--bg3)' }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent' }}
    >
      {children}
    </button>
  )
}
