import React, { useEffect, useState, useRef } from 'react'
import { Plus, Pin, Trash2, Check, X, StickyNote, ListChecks, BookMarked, Pencil } from 'lucide-react'
import {
  listCards, createCard, updateCard, deleteCard,
  toggleItem, addItem, deleteItem as apiDeleteItem
} from '@/lib/api'
import type { KeepCard, CardType, KeepItem } from '@/lib/types'

// ─── Color palette ────────────────────────────────────────────────────────

const COLORS = [
  { label: 'Default', value: '#21262d' },
  { label: 'Indigo', value: '#1e1b4b' },
  { label: 'Teal', value: '#042f2e' },
  { label: 'Red', value: '#2d1515' },
  { label: 'Orange', value: '#2d1f08' },
  { label: 'Purple', value: '#2d1b4e' },
]

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
    <div
      className="fixed inset-0 flex items-center justify-center z-50"
      style={{ background: 'rgba(0,0,0,0.7)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="flex flex-col gap-4 p-6 rounded-2xl w-full max-w-md"
        style={{ background: 'var(--bg2)', border: '1px solid var(--border2)', boxShadow: '0 30px 80px rgba(0,0,0,0.8)' }}
      >
        <div className="flex items-center justify-between">
          <span className="text-sm font-bold" style={{ color: 'var(--text)' }}>New Card</span>
          <button onClick={onClose}><X size={16} style={{ color: 'var(--text3)' }} /></button>
        </div>

        {/* Type selector */}
        <div className="flex gap-2">
          {([
            { id: 'text', label: 'Note', icon: <StickyNote size={13} /> },
            { id: 'checklist', label: 'Checklist', icon: <ListChecks size={13} /> },
            { id: 'course', label: 'Course', icon: <BookMarked size={13} /> },
          ] as { id: CardType; label: string; icon: React.ReactNode }[]).map(t => (
            <button
              key={t.id}
              onClick={() => setType(t.id)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium"
              style={{
                background: type === t.id ? 'var(--indigo-dim)' : 'var(--bg3)',
                color: type === t.id ? 'var(--indigo)' : 'var(--text3)',
                border: `1px solid ${type === t.id ? 'rgba(129,140,248,.3)' : 'var(--border)'}`,
              }}
            >
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        {/* Title */}
        <input
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="Title (optional)"
          className="px-3 py-2 rounded-lg text-sm outline-none"
          style={{ background: 'var(--bg3)', border: '1px solid var(--border)', color: 'var(--text)' }}
        />

        {/* Content or items */}
        {type === 'text' ? (
          <textarea
            value={content}
            onChange={e => setContent(e.target.value)}
            placeholder="Write your note…"
            rows={4}
            className="px-3 py-2 rounded-lg text-sm outline-none resize-none"
            style={{ background: 'var(--bg3)', border: '1px solid var(--border)', color: 'var(--text)' }}
          />
        ) : (
          <div className="flex flex-col gap-1.5">
            {items.map((item, i) => (
              <div key={i} className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ border: '1.5px solid var(--border2)' }} />
                <input
                  value={item}
                  onChange={e => {
                    const next = [...items]
                    next[i] = e.target.value
                    setItems(next)
                  }}
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      setItems(prev => [...prev.slice(0, i + 1), '', ...prev.slice(i + 1)])
                    } else if (e.key === 'Backspace' && item === '' && items.length > 1) {
                      e.preventDefault()
                      setItems(prev => prev.filter((_, idx) => idx !== i))
                    }
                  }}
                  placeholder={type === 'course' ? `Topic ${i + 1}` : `Item ${i + 1}`}
                  className="flex-1 bg-transparent text-sm outline-none"
                  style={{ color: 'var(--text)' }}
                />
                {items.length > 1 && (
                  <button onClick={() => setItems(prev => prev.filter((_, idx) => idx !== i))}>
                    <X size={12} style={{ color: 'var(--text3)' }} />
                  </button>
                )}
              </div>
            ))}
            <button
              onClick={() => setItems(prev => [...prev, ''])}
              className="text-xs self-start mt-1"
              style={{ color: 'var(--indigo)' }}
            >
              + Add item
            </button>
          </div>
        )}

        {/* Color & pin row */}
        <div className="flex items-center gap-3">
          <div className="flex gap-1.5">
            {COLORS.map(c => (
              <button
                key={c.value}
                title={c.label}
                onClick={() => setColor(c.value)}
                className="w-5 h-5 rounded-full"
                style={{
                  background: c.value,
                  border: color === c.value ? '2px solid var(--indigo)' : '1.5px solid var(--border2)',
                }}
              />
            ))}
          </div>
          <button
            onClick={() => setPinned(p => !p)}
            className="flex items-center gap-1 text-xs ml-auto"
            style={{ color: pinned ? 'var(--indigo)' : 'var(--text3)' }}
          >
            <Pin size={12} /> {pinned ? 'Pinned' : 'Pin'}
          </button>
        </div>

        <button
          onClick={handleCreate}
          disabled={saving}
          className="py-2.5 rounded-lg text-sm font-bold"
          style={{
            background: 'linear-gradient(135deg, var(--indigo), var(--teal))',
            color: '#fff',
            opacity: saving ? 0.6 : 1,
          }}
        >
          {saving ? 'Creating…' : 'Create Card'}
        </button>
      </div>
    </div>
  )
}

// ─── Card Component ────────────────────────────────────────────────────────

function Card({ card, onRefresh }: { card: KeepCard; onRefresh: () => void }) {
  const [editing, setEditing] = useState(false)
  const [editTitle, setEditTitle] = useState(card.title)
  const [editContent, setEditContent] = useState(card.content)
  const [newItemText, setNewItemText] = useState('')
  const [hovered, setHovered] = useState(false)

  const doneCount = card.items.filter(i => i.done).length
  const totalCount = card.items.length

  const handleToggle = async (itemId: string) => {
    await toggleItem(card.id, itemId)
    onRefresh()
  }

  const handleAddItem = async () => {
    const text = newItemText.trim()
    if (!text) return
    await addItem(card.id, text)
    setNewItemText('')
    onRefresh()
  }

  const handleDeleteItem = async (itemId: string) => {
    await apiDeleteItem(card.id, itemId)
    onRefresh()
  }

  const handleSaveEdit = async () => {
    await updateCard(card.id, { title: editTitle, content: editContent })
    setEditing(false)
    onRefresh()
  }

  const handlePin = async () => {
    await updateCard(card.id, { pinned: !card.pinned })
    onRefresh()
  }

  const handleDelete = async () => {
    await deleteCard(card.id)
    onRefresh()
  }

  return (
    <div
      className="flex flex-col rounded-xl p-3 gap-2 relative group"
      style={{
        background: card.color,
        border: `1px solid ${hovered ? 'var(--border2)' : 'var(--border)'}`,
        transition: 'border-color 0.15s',
        breakInside: 'avoid',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Pin indicator */}
      {card.pinned && (
        <Pin size={11} className="absolute top-2 right-2" style={{ color: 'var(--indigo)', opacity: 0.7 }} />
      )}

      {/* Type badge */}
      <div className="flex items-center gap-1.5">
        {card.type === 'text' && <StickyNote size={11} style={{ color: 'var(--text3)' }} />}
        {card.type === 'checklist' && <ListChecks size={11} style={{ color: 'var(--text3)' }} />}
        {card.type === 'course' && <BookMarked size={11} style={{ color: 'var(--text3)' }} />}
        {card.type !== 'text' && totalCount > 0 && (
          <span className="text-[10px]" style={{ color: 'var(--text3)' }}>
            {doneCount}/{totalCount}
          </span>
        )}
        {/* Progress bar for course */}
        {card.type === 'course' && totalCount > 0 && (
          <div className="flex-1 h-1 rounded-full overflow-hidden ml-1" style={{ background: 'var(--bg3)' }}>
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${(doneCount / totalCount) * 100}%`,
                background: 'linear-gradient(90deg, var(--indigo), var(--teal))',
              }}
            />
          </div>
        )}
      </div>

      {/* Title */}
      {editing ? (
        <input
          value={editTitle}
          onChange={e => setEditTitle(e.target.value)}
          className="text-sm font-bold bg-transparent outline-none border-b"
          style={{ color: 'var(--text)', borderColor: 'var(--border2)' }}
          autoFocus
        />
      ) : (
        card.title && (
          <span className="text-sm font-bold leading-tight" style={{ color: 'var(--text)' }}>
            {card.title}
          </span>
        )
      )}

      {/* Text content */}
      {card.type === 'text' && (
        editing ? (
          <textarea
            value={editContent}
            onChange={e => setEditContent(e.target.value)}
            rows={4}
            className="text-xs bg-transparent outline-none resize-none"
            style={{ color: 'var(--text2)' }}
          />
        ) : (
          card.content && (
            <p className="text-xs leading-[1.6] whitespace-pre-wrap" style={{ color: 'var(--text2)' }}>
              {card.content}
            </p>
          )
        )
      )}

      {/* Checklist / Course items */}
      {(card.type === 'checklist' || card.type === 'course') && (
        <div className="flex flex-col gap-1">
          {card.items.map((item) => (
            <div key={item.id} className="flex items-center gap-2 group/item">
              <button
                onClick={() => handleToggle(item.id)}
                className="flex-shrink-0 w-4 h-4 rounded flex items-center justify-center"
                style={{
                  background: item.done ? 'var(--indigo)' : 'transparent',
                  border: `1.5px solid ${item.done ? 'var(--indigo)' : 'var(--border2)'}`,
                }}
              >
                {item.done && <Check size={10} style={{ color: '#fff' }} />}
              </button>
              <span
                className="flex-1 text-xs leading-[1.5]"
                style={{
                  color: item.done ? 'var(--text3)' : 'var(--text2)',
                  textDecoration: item.done ? 'line-through' : 'none',
                  marginLeft: item.indent * 16,
                }}
              >
                {item.text}
              </span>
              <button
                onClick={() => handleDeleteItem(item.id)}
                className="opacity-0 group-hover/item:opacity-100 transition-opacity"
              >
                <X size={10} style={{ color: 'var(--text3)' }} />
              </button>
            </div>
          ))}
          {/* Add item inline */}
          <div className="flex items-center gap-2 mt-1">
            <div className="w-4 h-4 flex-shrink-0 rounded" style={{ border: '1.5px solid var(--border)' }} />
            <input
              value={newItemText}
              onChange={e => setNewItemText(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleAddItem() }}
              placeholder="Add item…"
              className="flex-1 bg-transparent text-xs outline-none"
              style={{ color: 'var(--text3)' }}
            />
          </div>
        </div>
      )}

      {/* Action row (visible on hover) */}
      <div
        className="flex items-center gap-1 mt-1 transition-opacity"
        style={{ opacity: hovered ? 1 : 0 }}
      >
        {card.type === 'text' && (
          editing ? (
            <>
              <button
                onClick={handleSaveEdit}
                className="flex items-center gap-1 text-[10px] px-2 py-1 rounded"
                style={{ background: 'var(--indigo-dim)', color: 'var(--indigo)' }}
              >
                <Check size={10} /> Save
              </button>
              <button
                onClick={() => { setEditing(false); setEditTitle(card.title); setEditContent(card.content) }}
                className="flex items-center gap-1 text-[10px] px-2 py-1 rounded"
                style={{ background: 'var(--bg3)', color: 'var(--text3)' }}
              >
                <X size={10} /> Cancel
              </button>
            </>
          ) : (
            <button
              onClick={() => setEditing(true)}
              className="flex items-center gap-1 text-[10px] px-2 py-1 rounded"
              style={{ background: 'var(--bg3)', color: 'var(--text3)' }}
            >
              <Pencil size={10} /> Edit
            </button>
          )
        )}
        <button
          onClick={handlePin}
          className="flex items-center gap-1 text-[10px] px-2 py-1 rounded ml-auto"
          style={{
            background: card.pinned ? 'var(--indigo-dim)' : 'var(--bg3)',
            color: card.pinned ? 'var(--indigo)' : 'var(--text3)',
          }}
        >
          <Pin size={10} />
        </button>
        <button
          onClick={handleDelete}
          className="flex items-center gap-1 text-[10px] px-2 py-1 rounded"
          style={{ background: 'var(--bg3)', color: 'var(--danger)' }}
        >
          <Trash2 size={10} />
        </button>
      </div>
    </div>
  )
}

// ─── Main Keep View ────────────────────────────────────────────────────────

export default function KeepView() {
  const [cards, setCards] = useState<KeepCard[]>([])
  const [showNew, setShowNew] = useState(false)
  const [filterType, setFilterType] = useState<CardType | 'all'>('all')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const data = await listCards()
      setCards(data)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const filtered = cards.filter(c => {
    if (filterType !== 'all' && c.type !== filterType) return false
    if (search) {
      const q = search.toLowerCase()
      const inTitle = c.title.toLowerCase().includes(q)
      const inContent = c.content.toLowerCase().includes(q)
      const inItems = c.items.some(i => i.text.toLowerCase().includes(q))
      if (!inTitle && !inContent && !inItems) return false
    }
    return true
  })

  const pinned = filtered.filter(c => c.pinned)
  const unpinned = filtered.filter(c => !c.pinned)

  return (
    <div className="flex flex-col h-full overflow-hidden" style={{ background: 'var(--bg)' }}>
      {/* Header */}
      <div
        className="flex items-center gap-3 px-4 py-3 flex-shrink-0"
        style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg2)' }}
      >
        <StickyNote size={16} style={{ color: 'var(--indigo)' }} />
        <span className="text-sm font-bold" style={{ color: 'var(--text)' }}>Keep</span>

        {/* Search */}
        <div
          className="flex items-center gap-2 px-3 py-1.5 rounded-md flex-1 max-w-xs"
          style={{ background: 'var(--bg3)', border: '1px solid var(--border)' }}
        >
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search cards…"
            className="flex-1 bg-transparent outline-none text-xs"
            style={{ color: 'var(--text2)' }}
          />
          {search && <button onClick={() => setSearch('')}><X size={11} style={{ color: 'var(--text3)' }} /></button>}
        </div>

        {/* Type filters */}
        <div className="flex gap-1">
          {(['all', 'text', 'checklist', 'course'] as const).map(t => (
            <button
              key={t}
              onClick={() => setFilterType(t)}
              className="px-2 py-1 rounded text-[10px] font-medium capitalize"
              style={{
                background: filterType === t ? 'var(--indigo-dim)' : 'var(--bg3)',
                color: filterType === t ? 'var(--indigo)' : 'var(--text3)',
                border: `1px solid ${filterType === t ? 'rgba(129,140,248,.25)' : 'var(--border)'}`,
              }}
            >
              {t === 'all' ? 'All' : t === 'text' ? 'Notes' : t === 'checklist' ? 'Lists' : 'Courses'}
            </button>
          ))}
        </div>

        {/* New card button */}
        <button
          onClick={() => setShowNew(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium ml-auto"
          style={{
            background: 'linear-gradient(135deg, var(--indigo), var(--teal))',
            color: '#fff',
          }}
        >
          <Plus size={13} /> New
        </button>
      </div>

      {/* Cards grid */}
      <div className="flex-1 overflow-y-auto p-4">
        {loading ? (
          <div className="flex items-center justify-center h-40 text-sm" style={{ color: 'var(--text3)' }}>
            Loading…
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 gap-2">
            <StickyNote size={32} style={{ color: 'var(--border2)' }} />
            <p className="text-sm" style={{ color: 'var(--text3)' }}>
              {search ? 'No cards match your search.' : 'No cards yet. Click "+ New" to create one.'}
            </p>
          </div>
        ) : (
          <>
            {pinned.length > 0 && (
              <div className="mb-4">
                <p className="text-[10px] uppercase font-bold mb-2 tracking-wider" style={{ color: 'var(--text3)' }}>
                  Pinned
                </p>
                <div
                  style={{
                    columnCount: 'auto' as unknown as number,
                    columnWidth: 240,
                    columnGap: 12,
                  }}
                >
                  {pinned.map(card => (
                    <div key={card.id} style={{ marginBottom: 12 }}>
                      <Card card={card} onRefresh={load} />
                    </div>
                  ))}
                </div>
              </div>
            )}
            {unpinned.length > 0 && (
              <div>
                {pinned.length > 0 && (
                  <p className="text-[10px] uppercase font-bold mb-2 tracking-wider" style={{ color: 'var(--text3)' }}>
                    Others
                  </p>
                )}
                <div
                  style={{
                    columnCount: 'auto' as unknown as number,
                    columnWidth: 240,
                    columnGap: 12,
                  }}
                >
                  {unpinned.map(card => (
                    <div key={card.id} style={{ marginBottom: 12 }}>
                      <Card card={card} onRefresh={load} />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {showNew && (
        <NewCardDialog
          onClose={() => setShowNew(false)}
          onCreated={(card) => {
            setCards(prev => [card, ...prev])
            setShowNew(false)
          }}
        />
      )}
    </div>
  )
}
