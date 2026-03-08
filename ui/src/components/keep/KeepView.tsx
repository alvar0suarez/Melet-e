import React, { useEffect, useState, useRef } from 'react'
import { Plus, Pin, Trash2, Check, X, StickyNote, ListChecks, BookMarked, Pencil, Upload, FolderOpen, BookOpen, FileText, ChevronDown, ChevronRight, Link2Off } from 'lucide-react'
import {
  listCards, createCard, updateCard, deleteCard,
  toggleItem, addItem, deleteItem as apiDeleteItem,
  importPlanText, scanPlans, saveNote,
} from '@/lib/api'
import type { KeepCard, CardType, KeepItem } from '@/lib/types'
import { useAppStore } from '@/store/app'

// ─── Color palette ────────────────────────────────────────────────────────

const COLORS = [
  { label: 'Default', value: '#21262d' },
  { label: 'Indigo', value: '#1e1b4b' },
  { label: 'Teal', value: '#042f2e' },
  { label: 'Red', value: '#2d1515' },
  { label: 'Orange', value: '#2d1f08' },
  { label: 'Purple', value: '#2d1b4e' },
]

// ─── Import Plan Dialog ───────────────────────────────────────────────────

function ImportDialog({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(false)
  const [preview, setPreview] = useState(0)
  const fileRef = useRef<HTMLInputElement>(null)

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (!f) return
    f.text().then(setText).catch(() => {})
  }

  const handleImport = async () => {
    if (!text.trim()) return
    setLoading(true)
    try {
      const { count } = await importPlanText(text)
      setPreview(count)
      setTimeout(() => { onDone(); onClose() }, 800)
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50"
      style={{ background: 'rgba(0,0,0,0.7)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="flex flex-col gap-4 p-6 rounded-2xl w-full max-w-xl"
        style={{ background: 'var(--bg2)', border: '1px solid var(--border2)', boxShadow: '0 30px 80px rgba(0,0,0,0.8)', maxHeight: '80vh' }}>

        <div className="flex items-center justify-between">
          <span className="text-sm font-bold" style={{ color: 'var(--text)' }}>Importar plan</span>
          <button onClick={onClose}><X size={16} style={{ color: 'var(--text3)' }} /></button>
        </div>

        <p className="text-xs leading-relaxed" style={{ color: 'var(--text3)' }}>
          Pega el texto de tu plan de estudio o selecciona un fichero <code style={{ color: 'var(--teal)' }}>.txt</code>/<code style={{ color: 'var(--teal)' }}>.md</code>.
          Los módulos/fases se convertirán automáticamente en tarjetas con checklists.
          <br />
          <span style={{ color: 'var(--text3)', opacity: 0.7 }}>
            También puedes dejar ficheros en <code style={{ color: 'var(--indigo)' }}>vault/Plans/</code> y usar "Escanear carpeta".
          </span>
        </p>

        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="Pega aquí el texto del plan…"
          rows={10}
          className="rounded-lg px-3 py-2 text-xs outline-none resize-none"
          style={{ background: 'var(--bg3)', border: '1px solid var(--border)', color: 'var(--text)', fontFamily: 'monospace' }}
        />

        {preview > 0 && (
          <p className="text-xs text-center font-semibold" style={{ color: 'var(--green)' }}>
            ✓ {preview} tarjeta{preview !== 1 ? 's' : ''} creada{preview !== 1 ? 's' : ''}
          </p>
        )}

        <div className="flex gap-2">
          <button onClick={() => fileRef.current?.click()}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs"
            style={{ background: 'var(--bg3)', color: 'var(--text3)', border: '1px solid var(--border)' }}>
            <FolderOpen size={12} /> Abrir fichero
          </button>
          <input ref={fileRef} type="file" accept=".txt,.md" className="hidden" onChange={handleFile} />
          <button onClick={handleImport} disabled={loading || !text.trim()}
            className="flex-1 py-2 rounded-lg text-sm font-bold"
            style={{
              background: 'linear-gradient(135deg, var(--indigo), var(--teal))',
              color: '#fff',
              opacity: loading || !text.trim() ? 0.5 : 1,
            }}>
            {loading ? 'Importando…' : 'Importar'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── New Card Dialog ───────────────────────────────────────────────────────

function NewCardDialog({ onClose, onCreated }: { onClose: () => void; onCreated: (card: KeepCard) => void }) {
  const [type, setType] = useState<CardType>('text')
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [items, setItems] = useState<string[]>([''])
  const [color, setColor] = useState('#21262d')
  const [pinned, setPinned] = useState(false)
  const [saving, setSaving] = useState(false)

  const handleCreate = async () => {
    setSaving(true)
    try {
      const parsedItems = type !== 'text'
        ? items.filter(t => t.trim()).map(t => ({ id: crypto.randomUUID(), text: t, done: false, indent: 0 }))
        : []
      const card = await createCard({ type_: type, title, content, items: parsedItems, color, pinned })
      onCreated(card)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50"
      style={{ background: 'rgba(0,0,0,0.7)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="flex flex-col gap-4 p-6 rounded-2xl w-full max-w-md"
        style={{ background: 'var(--bg2)', border: '1px solid var(--border2)', boxShadow: '0 30px 80px rgba(0,0,0,0.8)' }}>

        <div className="flex items-center justify-between">
          <span className="text-sm font-bold" style={{ color: 'var(--text)' }}>Nueva tarjeta</span>
          <button onClick={onClose}><X size={16} style={{ color: 'var(--text3)' }} /></button>
        </div>

        <div className="flex gap-2">
          {([
            { id: 'text', label: 'Nota', icon: <StickyNote size={13} /> },
            { id: 'checklist', label: 'Lista', icon: <ListChecks size={13} /> },
            { id: 'course', label: 'Curso', icon: <BookMarked size={13} /> },
          ] as { id: CardType; label: string; icon: React.ReactNode }[]).map(t => (
            <button key={t.id} onClick={() => setType(t.id)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium"
              style={{
                background: type === t.id ? 'var(--indigo-dim)' : 'var(--bg3)',
                color: type === t.id ? 'var(--indigo)' : 'var(--text3)',
                border: `1px solid ${type === t.id ? 'rgba(129,140,248,.3)' : 'var(--border)'}`,
              }}>
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        <input value={title} onChange={e => setTitle(e.target.value)}
          placeholder="Título (opcional)"
          className="px-3 py-2 rounded-lg text-sm outline-none"
          style={{ background: 'var(--bg3)', border: '1px solid var(--border)', color: 'var(--text)' }} />

        {type === 'text' ? (
          <textarea value={content} onChange={e => setContent(e.target.value)}
            placeholder="Escribe tu nota…" rows={4}
            className="px-3 py-2 rounded-lg text-sm outline-none resize-none"
            style={{ background: 'var(--bg3)', border: '1px solid var(--border)', color: 'var(--text)' }} />
        ) : (
          <div className="flex flex-col gap-1.5">
            {items.map((item, i) => (
              <div key={i} className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ border: '1.5px solid var(--border2)' }} />
                <input value={item} onChange={e => { const n = [...items]; n[i] = e.target.value; setItems(n) }}
                  onKeyDown={e => {
                    if (e.key === 'Enter') { e.preventDefault(); setItems(p => [...p.slice(0, i + 1), '', ...p.slice(i + 1)]) }
                    else if (e.key === 'Backspace' && item === '' && items.length > 1) { e.preventDefault(); setItems(p => p.filter((_, idx) => idx !== i)) }
                  }}
                  placeholder={type === 'course' ? `Tema ${i + 1}` : `Ítem ${i + 1}`}
                  className="flex-1 bg-transparent text-sm outline-none"
                  style={{ color: 'var(--text)' }} />
                {items.length > 1 && (
                  <button onClick={() => setItems(p => p.filter((_, idx) => idx !== i))}>
                    <X size={12} style={{ color: 'var(--text3)' }} />
                  </button>
                )}
              </div>
            ))}
            <button onClick={() => setItems(p => [...p, ''])} className="text-xs self-start mt-1" style={{ color: 'var(--indigo)' }}>
              + Añadir ítem
            </button>
          </div>
        )}

        <div className="flex items-center gap-3">
          <div className="flex gap-1.5">
            {COLORS.map(c => (
              <button key={c.value} title={c.label} onClick={() => setColor(c.value)} className="w-5 h-5 rounded-full"
                style={{ background: c.value, border: color === c.value ? '2px solid var(--indigo)' : '1.5px solid var(--border2)' }} />
            ))}
          </div>
          <button onClick={() => setPinned(p => !p)} className="flex items-center gap-1 text-xs ml-auto"
            style={{ color: pinned ? 'var(--indigo)' : 'var(--text3)' }}>
            <Pin size={12} /> {pinned ? 'Fijada' : 'Fijar'}
          </button>
        </div>

        <button onClick={handleCreate} disabled={saving} className="py-2.5 rounded-lg text-sm font-bold"
          style={{ background: 'linear-gradient(135deg, var(--indigo), var(--teal))', color: '#fff', opacity: saving ? 0.6 : 1 }}>
          {saving ? 'Creando…' : 'Crear tarjeta'}
        </button>
      </div>
    </div>
  )
}

// ─── Card Component ────────────────────────────────────────────────────────

function Card({ card, onRefresh }: { card: KeepCard; onRefresh: () => void }) {
  const { openTab, setActivity } = useAppStore()
  const [editing, setEditing] = useState(false)
  const [editTitle, setEditTitle] = useState(card.title)
  const [editContent, setEditContent] = useState(card.content)
  const [newItemText, setNewItemText] = useState('')
  const [hovered, setHovered] = useState(false)
  const [notebookOpen, setNotebookOpen] = useState(false)
  const [noteRefs, setNoteRefs] = useState<string[]>(card.note_refs ?? [])
  const [addingPage, setAddingPage] = useState(false)
  const [newPageName, setNewPageName] = useState('')
  const pageInputRef = useRef<HTMLInputElement>(null)

  // Only count checkable items for progress
  const checkable = card.items.filter(i => i.indent !== -1)
  const doneCount = checkable.filter(i => i.done).length
  const totalCount = checkable.length

  const handleToggle = async (itemId: string) => { await toggleItem(card.id, itemId); onRefresh() }
  const handleAddItem = async () => {
    const text = newItemText.trim()
    if (!text) return
    await addItem(card.id, text); setNewItemText(''); onRefresh()
  }
  const handleDeleteItem = async (itemId: string) => { await apiDeleteItem(card.id, itemId); onRefresh() }
  const handleSaveEdit = async () => { await updateCard(card.id, { title: editTitle, content: editContent }); setEditing(false); onRefresh() }
  const handlePin = async () => { await updateCard(card.id, { pinned: !card.pinned }); onRefresh() }
  const handleDelete = async () => { await deleteCard(card.id); onRefresh() }

  const openNote = (name: string) => {
    openTab({ id: `note:${name}`, name: `${name}.md`, type: 'note' })
    setActivity('explorer')
  }

  const handleCreatePage = async () => {
    const name = newPageName.trim()
    if (!name) return
    // Build a simple template for the new page
    const template = `# ${name}\n\n> Apuntes para **${card.title || 'este módulo'}**.\n\n`
    await saveNote(name, template)
    const updated = [...noteRefs, name]
    await updateCard(card.id, { note_refs: updated })
    setNoteRefs(updated)
    setNewPageName('')
    setAddingPage(false)
    openNote(name)
  }

  const handleUnlinkPage = async (name: string, e: React.MouseEvent) => {
    e.stopPropagation()
    const updated = noteRefs.filter(n => n !== name)
    await updateCard(card.id, { note_refs: updated })
    setNoteRefs(updated)
  }

  const startAddingPage = () => {
    setNotebookOpen(true)
    setAddingPage(true)
    setTimeout(() => pageInputRef.current?.focus(), 60)
  }

  return (
    <div className="flex flex-col rounded-xl p-3 gap-2 relative group"
      style={{ background: card.color, border: `1px solid ${hovered ? 'var(--border2)' : 'var(--border)'}`, transition: 'border-color 0.15s', breakInside: 'avoid' }}
      onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}>

      {card.pinned && <Pin size={11} className="absolute top-2 right-2" style={{ color: 'var(--indigo)', opacity: 0.7 }} />}

      {/* Type badge + progress */}
      <div className="flex items-center gap-1.5">
        {card.type === 'text' && <StickyNote size={11} style={{ color: 'var(--text3)' }} />}
        {card.type === 'checklist' && <ListChecks size={11} style={{ color: 'var(--text3)' }} />}
        {card.type === 'course' && <BookMarked size={11} style={{ color: 'var(--teal)' }} />}
        {card.type !== 'text' && totalCount > 0 && (
          <span className="text-[10px] tabular-nums" style={{ color: 'var(--text3)' }}>{doneCount}/{totalCount}</span>
        )}
        {(card.type === 'checklist' || card.type === 'course') && totalCount > 0 && (
          <div className="flex-1 h-1 rounded-full overflow-hidden ml-1" style={{ background: 'rgba(255,255,255,0.08)' }}>
            <div className="h-full rounded-full transition-all"
              style={{ width: `${(doneCount / totalCount) * 100}%`, background: 'linear-gradient(90deg, var(--indigo), var(--teal))' }} />
          </div>
        )}
      </div>

      {/* Title */}
      {editing ? (
        <input value={editTitle} onChange={e => setEditTitle(e.target.value)} autoFocus
          className="text-sm font-bold bg-transparent outline-none border-b"
          style={{ color: 'var(--text)', borderColor: 'var(--border2)' }} />
      ) : (
        card.title && <span className="text-sm font-bold leading-tight" style={{ color: 'var(--text)' }}>{card.title}</span>
      )}

      {/* Text content */}
      {card.type === 'text' && (
        editing ? (
          <textarea value={editContent} onChange={e => setEditContent(e.target.value)} rows={4}
            className="text-xs bg-transparent outline-none resize-none"
            style={{ color: 'var(--text2)' }} />
        ) : (
          card.content && <p className="text-xs leading-[1.6] whitespace-pre-wrap" style={{ color: 'var(--text2)' }}>{card.content}</p>
        )
      )}

      {/* Checklist / Course items */}
      {(card.type === 'checklist' || card.type === 'course') && (
        <div className="flex flex-col gap-0.5">
          {card.items.map((item) => {
            // indent === -1: section label (non-checkable)
            if (item.indent === -1) return (
              <div key={item.id} className="flex items-center gap-1.5 mt-2 mb-0.5">
                <div className="h-px flex-1" style={{ background: 'rgba(255,255,255,0.1)' }} />
                <span className="text-[9px] uppercase tracking-wider font-bold px-1" style={{ color: 'var(--text3)' }}>
                  {item.text.replace(/:$/, '')}
                </span>
                <div className="h-px flex-1" style={{ background: 'rgba(255,255,255,0.1)' }} />
              </div>
            )
            return (
              <div key={item.id} className="flex items-start gap-2 group/item py-0.5"
                style={{ paddingLeft: item.indent === 1 ? 12 : 0 }}>
                <button onClick={() => handleToggle(item.id)}
                  className="flex-shrink-0 w-3.5 h-3.5 rounded flex items-center justify-center mt-0.5"
                  style={{ background: item.done ? 'var(--indigo)' : 'transparent', border: `1.5px solid ${item.done ? 'var(--indigo)' : 'rgba(255,255,255,0.2)'}` }}>
                  {item.done && <Check size={9} style={{ color: '#fff' }} />}
                </button>
                <span className="flex-1 text-[11px] leading-[1.5]"
                  style={{ color: item.done ? 'var(--text3)' : item.indent === 1 ? 'var(--text3)' : 'var(--text2)', textDecoration: item.done ? 'line-through' : 'none' }}>
                  {item.text}
                </span>
                <button onClick={() => handleDeleteItem(item.id)} className="opacity-0 group-hover/item:opacity-60 transition-opacity flex-shrink-0">
                  <X size={9} style={{ color: 'var(--text3)' }} />
                </button>
              </div>
            )
          })}
          <div className="flex items-center gap-2 mt-1.5">
            <div className="w-3.5 h-3.5 flex-shrink-0 rounded" style={{ border: '1.5px solid rgba(255,255,255,0.12)' }} />
            <input value={newItemText} onChange={e => setNewItemText(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleAddItem() }}
              placeholder="Añadir ítem…" className="flex-1 bg-transparent text-[11px] outline-none"
              style={{ color: 'var(--text3)' }} />
          </div>
        </div>
      )}

      {/* Notebook / pages */}
      <div className="mt-1" style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 6 }}>
        <button
          onClick={() => setNotebookOpen(v => !v)}
          className="flex items-center gap-1.5 w-full text-left"
          style={{ color: noteRefs.length > 0 ? 'var(--teal)' : 'var(--text3)' }}
        >
          {notebookOpen ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
          <BookOpen size={10} />
          <span className="text-[10px]">
            {noteRefs.length > 0 ? `Cuaderno (${noteRefs.length} página${noteRefs.length !== 1 ? 's' : ''})` : 'Cuaderno'}
          </span>
        </button>

        {notebookOpen && (
          <div className="mt-1.5 flex flex-col gap-0.5 pl-4">
            {noteRefs.map(name => (
              <div key={name} className="flex items-center gap-1 group/page">
                <button
                  onClick={() => openNote(name)}
                  className="flex items-center gap-1.5 flex-1 text-left py-0.5 rounded px-1 hover:opacity-80"
                  style={{ background: 'rgba(255,255,255,0.04)' }}
                >
                  <FileText size={9} style={{ color: 'var(--text3)', flexShrink: 0 }} />
                  <span className="text-[11px] truncate" style={{ color: 'var(--text2)' }}>{name}</span>
                </button>
                <button
                  onClick={e => handleUnlinkPage(name, e)}
                  title="Desconectar página"
                  className="opacity-0 group-hover/page:opacity-60 transition-opacity flex-shrink-0"
                >
                  <Link2Off size={9} style={{ color: 'var(--text3)' }} />
                </button>
              </div>
            ))}

            {addingPage ? (
              <div className="flex items-center gap-1 mt-0.5">
                <FileText size={9} style={{ color: 'var(--text3)', flexShrink: 0 }} />
                <input
                  ref={pageInputRef}
                  value={newPageName}
                  onChange={e => setNewPageName(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') handleCreatePage()
                    if (e.key === 'Escape') { setAddingPage(false); setNewPageName('') }
                  }}
                  placeholder="Nombre de la página…"
                  className="flex-1 text-[11px] bg-transparent outline-none border-b"
                  style={{ color: 'var(--text)', borderColor: 'var(--border2)' }}
                />
                <button onClick={handleCreatePage}><Check size={9} style={{ color: 'var(--green)' }} /></button>
                <button onClick={() => { setAddingPage(false); setNewPageName('') }}><X size={9} style={{ color: 'var(--text3)' }} /></button>
              </div>
            ) : (
              <button onClick={startAddingPage} className="text-[10px] mt-0.5 self-start"
                style={{ color: 'var(--indigo)' }}>
                + Nueva página
              </button>
            )}
          </div>
        )}
      </div>

      {/* Action row */}
      <div className="flex items-center gap-1 mt-1 transition-opacity" style={{ opacity: hovered ? 1 : 0 }}>
        {card.type === 'text' && (
          editing ? (
            <>
              <button onClick={handleSaveEdit} className="flex items-center gap-1 text-[10px] px-2 py-1 rounded"
                style={{ background: 'var(--indigo-dim)', color: 'var(--indigo)' }}>
                <Check size={10} /> Guardar
              </button>
              <button onClick={() => { setEditing(false); setEditTitle(card.title); setEditContent(card.content) }}
                className="flex items-center gap-1 text-[10px] px-2 py-1 rounded"
                style={{ background: 'var(--bg3)', color: 'var(--text3)' }}>
                <X size={10} /> Cancelar
              </button>
            </>
          ) : (
            <button onClick={() => setEditing(true)} className="flex items-center gap-1 text-[10px] px-2 py-1 rounded"
              style={{ background: 'var(--bg3)', color: 'var(--text3)' }}>
              <Pencil size={10} /> Editar
            </button>
          )
        )}
        <button onClick={handlePin} className="flex items-center gap-1 text-[10px] px-2 py-1 rounded ml-auto"
          style={{ background: card.pinned ? 'var(--indigo-dim)' : 'var(--bg3)', color: card.pinned ? 'var(--indigo)' : 'var(--text3)' }}>
          <Pin size={10} />
        </button>
        <button onClick={handleDelete} className="flex items-center gap-1 text-[10px] px-2 py-1 rounded"
          style={{ background: 'var(--bg3)', color: 'var(--danger)' }}>
          <Trash2 size={10} />
        </button>
      </div>
    </div>
  )
}

// ─── Main Tablero View ────────────────────────────────────────────────────

export default function KeepView() {
  const [cards, setCards] = useState<KeepCard[]>([])
  const [showNew, setShowNew] = useState(false)
  const [showImport, setShowImport] = useState(false)
  const [filterType, setFilterType] = useState<CardType | 'all'>('all')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(false)
  const [scanning, setScanning] = useState(false)

  const load = async () => {
    setLoading(true)
    try { setCards(await listCards()) } finally { setLoading(false) }
  }

  const handleScan = async () => {
    setScanning(true)
    try { await scanPlans(); await load() } finally { setScanning(false) }
  }

  useEffect(() => { load() }, [])

  const filtered = cards.filter(c => {
    if (filterType !== 'all' && c.type !== filterType) return false
    if (search) {
      const q = search.toLowerCase()
      if (!c.title.toLowerCase().includes(q) && !c.content.toLowerCase().includes(q) && !c.items.some(i => i.text.toLowerCase().includes(q))) return false
    }
    return true
  })

  const pinned = filtered.filter(c => c.pinned)
  const unpinned = filtered.filter(c => !c.pinned)

  const Grid = ({ items }: { items: KeepCard[] }) => (
    <div style={{ columnCount: 'auto' as unknown as number, columnWidth: 260, columnGap: 12 }}>
      {items.map(card => <div key={card.id} style={{ marginBottom: 12 }}><Card card={card} onRefresh={load} /></div>)}
    </div>
  )

  return (
    <div className="flex flex-col h-full overflow-hidden" style={{ background: 'var(--bg)' }}>
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-2.5 flex-shrink-0 flex-wrap"
        style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg2)', rowGap: 6 }}>

        <BookMarked size={14} style={{ color: 'var(--indigo)', flexShrink: 0 }} />
        <span className="text-xs font-bold flex-shrink-0" style={{ color: 'var(--text)' }}>Tablero</span>

        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded flex-1"
          style={{ background: 'var(--bg3)', border: '1px solid var(--border)', minWidth: 120, maxWidth: 240 }}>
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Buscar…" className="flex-1 bg-transparent outline-none text-xs"
            style={{ color: 'var(--text2)' }} />
          {search && <button onClick={() => setSearch('')}><X size={10} style={{ color: 'var(--text3)' }} /></button>}
        </div>

        <div className="flex gap-1 flex-shrink-0">
          {(['all', 'text', 'checklist', 'course'] as const).map(t => (
            <button key={t} onClick={() => setFilterType(t)} className="px-2 py-1 rounded text-[10px] font-medium"
              style={{
                background: filterType === t ? 'var(--indigo-dim)' : 'transparent',
                color: filterType === t ? 'var(--indigo)' : 'var(--text3)',
                border: `1px solid ${filterType === t ? 'rgba(129,140,248,.25)' : 'transparent'}`,
              }}>
              {t === 'all' ? 'Todo' : t === 'text' ? 'Notas' : t === 'checklist' ? 'Listas' : 'Cursos'}
            </button>
          ))}
        </div>

        <span className="text-[10px] flex-shrink-0" style={{ color: 'var(--text3)' }}>{filtered.length}</span>

        {/* Import/scan buttons */}
        <button onClick={handleScan} disabled={scanning} title="Escanear vault/Plans/ e importar nuevos ficheros"
          className="flex items-center gap-1 px-2 py-1 rounded text-[10px] flex-shrink-0"
          style={{ background: 'var(--bg3)', color: 'var(--text3)', border: '1px solid var(--border)' }}>
          <FolderOpen size={11} /> {scanning ? '…' : 'Escanear'}
        </button>
        <button onClick={() => setShowImport(true)}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium flex-shrink-0"
          style={{ background: 'var(--teal-dim)', color: 'var(--teal)', border: '1px solid rgba(45,212,191,.2)' }}>
          <Upload size={12} /> Importar plan
        </button>
        <button onClick={() => setShowNew(true)}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium flex-shrink-0"
          style={{ background: 'linear-gradient(135deg, var(--indigo), var(--teal))', color: '#fff' }}>
          <Plus size={12} /> Nueva
        </button>
      </div>

      {/* Cards grid */}
      <div className="flex-1 overflow-y-auto p-4">
        {loading ? (
          <div className="flex items-center justify-center h-40 text-sm" style={{ color: 'var(--text3)' }}>Cargando…</div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 gap-3">
            <BookMarked size={32} style={{ color: 'var(--border2)' }} />
            <p className="text-xs text-center" style={{ color: 'var(--text3)' }}>
              {search ? 'Sin resultados.' : 'Sin tarjetas. Usa "Importar plan" para añadir tu planificación de estudio,\no "Nueva" para crear una manualmente.'}
            </p>
          </div>
        ) : (
          <>
            {pinned.length > 0 && (
              <div className="mb-5">
                <p className="text-[9px] uppercase font-bold mb-2 tracking-wider" style={{ color: 'var(--text3)' }}>Fijadas</p>
                <Grid items={pinned} />
              </div>
            )}
            {unpinned.length > 0 && (
              <div>
                {pinned.length > 0 && <p className="text-[9px] uppercase font-bold mb-2 tracking-wider" style={{ color: 'var(--text3)' }}>Tarjetas</p>}
                <Grid items={unpinned} />
              </div>
            )}
          </>
        )}
      </div>

      {showNew && <NewCardDialog onClose={() => setShowNew(false)} onCreated={(card) => { setCards(p => [card, ...p]); setShowNew(false) }} />}
      {showImport && <ImportDialog onClose={() => setShowImport(false)} onDone={load} />}
    </div>
  )
}
