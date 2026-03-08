import React, { useEffect, useState, useCallback } from 'react'
import {
  BookOpen, Plus, Trash2, ChevronRight, Brain, RotateCcw,
  Sparkles, Languages, PenLine, X, Check
} from 'lucide-react'
import { listDecks, createDeck, deleteDeck, listDeckCards, getDueCards, saveDeckCard, deleteDeckCard, reviewCard } from '@/lib/api'
import { aiChat } from '@/lib/api'
import { useAppStore } from '@/store/app'
import type { FlashDeck, FlashCard, FlashCardType } from '@/lib/types'

// ── Study Mode ────────────────────────────────────────────────────────────────

function StudyMode({ deck, onExit }: { deck: string; onExit: () => void }) {
  const [queue, setQueue] = useState<FlashCard[]>([])
  const [idx, setIdx] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [done, setDone] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getDueCards(deck).then((cards) => {
      setQueue(cards.sort(() => Math.random() - 0.5))
      setLoading(false)
    })
  }, [deck])

  const card = queue[idx]

  const handleRating = async (rating: 'again' | 'hard' | 'good' | 'easy') => {
    if (!card) return
    await reviewCard(deck, card.id, rating)
    const next = idx + 1
    if (next >= queue.length) {
      setDone(true)
    } else {
      setIdx(next)
      setFlipped(false)
    }
  }

  if (loading) return (
    <div className="flex-1 flex items-center justify-center" style={{ color: 'var(--text3)', fontSize: 13 }}>
      Cargando cartas…
    </div>
  )

  if (done || queue.length === 0) return (
    <div className="flex-1 flex flex-col items-center justify-center gap-4">
      <div style={{ fontSize: 40 }}>🎉</div>
      <p className="text-sm font-medium" style={{ color: 'var(--text)' }}>
        {queue.length === 0 ? 'No hay cartas pendientes' : '¡Sesión completada!'}
      </p>
      <p className="text-xs" style={{ color: 'var(--text3)' }}>
        {queue.length > 0 ? `${queue.length} cartas repasadas` : 'Vuelve más tarde'}
      </p>
      <button onClick={onExit}
        className="px-4 py-1.5 rounded text-xs"
        style={{ background: 'var(--indigo-dim)', color: 'var(--indigo)', border: '1px solid rgba(129,140,248,.25)' }}>
        Volver al mazo
      </button>
    </div>
  )

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-2 flex-shrink-0"
        style={{ background: 'var(--bg2)', borderBottom: '1px solid var(--border)' }}>
        <button onClick={onExit} className="p-1 rounded hover:opacity-70" style={{ color: 'var(--text3)' }}>
          <X size={13} />
        </button>
        <span className="text-xs font-medium flex-1" style={{ color: 'var(--text2)' }}>
          {deck} — Estudiando
        </span>
        <span className="text-[10px] tabular-nums" style={{ color: 'var(--text3)' }}>
          {idx + 1} / {queue.length}
        </span>
      </div>

      {/* Progress bar */}
      <div className="h-[2px] flex-shrink-0" style={{ background: 'var(--border)' }}>
        <div className="h-full transition-all"
          style={{ width: `${((idx + 1) / queue.length) * 100}%`, background: 'linear-gradient(90deg, var(--indigo), var(--teal))' }} />
      </div>

      {/* Card */}
      <div className="flex-1 flex flex-col items-center justify-center p-8 gap-6">
        <div
          onClick={() => setFlipped(true)}
          className="w-full cursor-pointer rounded-xl p-8 flex flex-col gap-4 transition-all"
          style={{
            maxWidth: 560,
            background: 'var(--bg2)',
            border: '1px solid var(--border)',
            minHeight: 200,
            boxShadow: '0 4px 24px rgba(0,0,0,0.25)',
          }}
        >
          <div className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--text3)' }}>
            {flipped ? 'Respuesta' : 'Pregunta'}
          </div>
          <div className="text-lg font-medium" style={{ color: 'var(--text)', lineHeight: 1.5 }}>
            {flipped ? card.back : card.front}
          </div>
          {!flipped && (
            <div className="text-[11px] mt-2" style={{ color: 'var(--text3)' }}>
              Haz clic para ver la respuesta
            </div>
          )}
        </div>

        {/* Rating buttons */}
        {flipped ? (
          <div className="flex gap-2">
            {([
              ['again', 'Otra vez', 'var(--red)', 'rgba(248,81,73,0.12)'],
              ['hard',  'Difícil',  'var(--orange)', 'rgba(227,179,65,0.12)'],
              ['good',  'Bien',     'var(--teal)',   'rgba(45,212,191,0.12)'],
              ['easy',  'Fácil',    'var(--green)',  'rgba(63,185,80,0.12)'],
            ] as const).map(([r, label, color, bg]) => (
              <button key={r}
                onClick={() => handleRating(r)}
                className="px-4 py-2 rounded-lg text-xs font-medium transition-opacity hover:opacity-80"
                style={{ color, background: bg, border: `1px solid ${color}33` }}>
                {label}
              </button>
            ))}
          </div>
        ) : (
          <button
            onClick={() => setFlipped(true)}
            className="px-6 py-2 rounded-lg text-sm"
            style={{ background: 'var(--indigo-dim)', color: 'var(--indigo)', border: '1px solid rgba(129,140,248,.25)' }}>
            Mostrar respuesta
          </button>
        )}
      </div>
    </div>
  )
}

// ── Add Card Panel ─────────────────────────────────────────────────────────────

function AddCardPanel({
  deck, onSaved, onClose
}: { deck: string; onSaved: () => void; onClose: () => void }) {
  const { aiConfig } = useAppStore()
  const [type, setType] = useState<FlashCardType>('dictionary')
  const [word, setWord] = useState('')
  const [front, setFront] = useState('')
  const [back, setBack] = useState('')
  const [generating, setGenerating] = useState(false)
  const [generated, setGenerated] = useState(false)
  const [saving, setSaving] = useState(false)

  const handleGenerate = async () => {
    if (!word.trim()) return
    setGenerating(true)
    setGenerated(false)
    try {
      const prompt = type === 'dictionary'
        ? `Dame la etimología y el significado de la palabra "${word.trim()}". Responde ÚNICAMENTE en este formato JSON exacto (sin markdown, sin explicaciones extra):
{"etimologia": "...", "significado": "..."}`
        : `Traduce "${word.trim()}" al español de forma concisa. Responde ÚNICAMENTE en este formato JSON exacto:
{"traduccion": "..."}`

      const { response } = await aiChat([{ role: 'user', content: prompt }], aiConfig ?? undefined)
      const clean = response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
      const data = JSON.parse(clean)

      if (type === 'dictionary') {
        setFront(word.trim())
        setBack(`Etimología: ${data.etimologia}\n\nSignificado: ${data.significado}`)
      } else {
        setFront(word.trim())
        setBack(data.traduccion ?? data.translation ?? '')
      }
      setGenerated(true)
    } catch {
      setFront(word.trim())
      setBack('Error al generar. Edita manualmente.')
      setGenerated(true)
    } finally {
      setGenerating(false)
    }
  }

  const handleSave = async () => {
    const f = type === 'custom' ? front : front || word
    const b = back
    if (!f.trim() || !b.trim()) return
    setSaving(true)
    await saveDeckCard(deck,{ type, front: f.trim(), back: b.trim() })
    setSaving(false)
    onSaved()
  }

  const typeLabels: Record<FlashCardType, string> = {
    dictionary: 'Diccionario',
    translation: 'Traducción',
    custom: 'Manual',
  }
  const typeIcons: Record<FlashCardType, React.ReactNode> = {
    dictionary: <BookOpen size={11} />,
    translation: <Languages size={11} />,
    custom: <PenLine size={11} />,
  }

  return (
    <div className="flex flex-col h-full overflow-hidden" style={{ background: 'var(--bg)' }}>
      <div className="flex items-center gap-2 px-4 py-2 flex-shrink-0"
        style={{ background: 'var(--bg2)', borderBottom: '1px solid var(--border)' }}>
        <span className="text-xs font-medium flex-1" style={{ color: 'var(--text)' }}>Nueva carta — {deck}</span>
        <button onClick={onClose} className="p-1 rounded hover:opacity-70" style={{ color: 'var(--text3)' }}>
          <X size={13} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-5">
        {/* Type selector */}
        <div>
          <div className="text-[10px] uppercase tracking-wider mb-2" style={{ color: 'var(--text3)' }}>Tipo</div>
          <div className="flex gap-1.5">
            {(['dictionary', 'translation', 'custom'] as FlashCardType[]).map((t) => (
              <button key={t} onClick={() => { setType(t); setGenerated(false); setFront(''); setBack('') }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded text-[11px]"
                style={{
                  background: type === t ? 'var(--indigo-dim)' : 'var(--bg3)',
                  color: type === t ? 'var(--indigo)' : 'var(--text2)',
                  border: `1px solid ${type === t ? 'rgba(129,140,248,.3)' : 'var(--border)'}`,
                }}>
                {typeIcons[t]} {typeLabels[t]}
              </button>
            ))}
          </div>
        </div>

        {/* AI-assisted types */}
        {(type === 'dictionary' || type === 'translation') && (
          <div>
            <div className="text-[10px] uppercase tracking-wider mb-2" style={{ color: 'var(--text3)' }}>
              {type === 'dictionary' ? 'Palabra' : 'Texto original'}
            </div>
            <div className="flex gap-2">
              <input
                value={word}
                onChange={(e) => setWord(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleGenerate() }}
                placeholder={type === 'dictionary' ? 'ej. ephemeral' : 'ej. serendipity'}
                className="flex-1 rounded px-3 py-1.5 text-xs outline-none"
                style={{ background: 'var(--bg3)', border: '1px solid var(--border)', color: 'var(--text)' }}
              />
              <button
                onClick={handleGenerate}
                disabled={generating || !word.trim()}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs disabled:opacity-40"
                style={{ background: 'var(--indigo-dim)', color: 'var(--indigo)', border: '1px solid rgba(129,140,248,.25)' }}>
                <Sparkles size={11} />
                {generating ? 'Generando…' : 'Generar con IA'}
              </button>
            </div>
          </div>
        )}

        {/* Front field */}
        {(type === 'custom' || generated) && (
          <div>
            <div className="text-[10px] uppercase tracking-wider mb-2" style={{ color: 'var(--text3)' }}>Frente</div>
            <input
              value={type === 'custom' ? front : (front || word)}
              onChange={(e) => setFront(e.target.value)}
              className="w-full rounded px-3 py-2 text-xs outline-none"
              style={{ background: 'var(--bg3)', border: '1px solid var(--border)', color: 'var(--text)' }}
              placeholder="Término o pregunta"
            />
          </div>
        )}

        {/* Back field */}
        {(type === 'custom' || generated) && (
          <div>
            <div className="text-[10px] uppercase tracking-wider mb-2" style={{ color: 'var(--text3)' }}>Reverso</div>
            <textarea
              value={back}
              onChange={(e) => setBack(e.target.value)}
              rows={5}
              className="w-full rounded px-3 py-2 text-xs outline-none resize-none"
              style={{ background: 'var(--bg3)', border: '1px solid var(--border)', color: 'var(--text)', lineHeight: 1.6 }}
              placeholder="Definición o respuesta"
            />
          </div>
        )}

        {/* Save */}
        {(type === 'custom' || generated) && (
          <button
            onClick={handleSave}
            disabled={saving || (!front.trim() && !word.trim()) || !back.trim()}
            className="flex items-center justify-center gap-1.5 py-2 rounded text-xs font-medium disabled:opacity-40"
            style={{ background: 'var(--indigo)', color: '#fff' }}>
            <Check size={12} />
            {saving ? 'Guardando…' : 'Guardar carta'}
          </button>
        )}
      </div>
    </div>
  )
}

// ── Deck View ─────────────────────────────────────────────────────────────────

function DeckView({
  deck,
  onStudy,
  onCardAdded,
}: { deck: FlashDeck; onStudy: () => void; onCardAdded: () => void }) {
  const [cards, setCards] = useState<FlashCard[]>([])
  const [adding, setAdding] = useState(false)
  const [loading, setLoading] = useState(true)

  const load = useCallback(() => {
    setLoading(true)
    listDeckCards(deck.name).then((c) => { setCards(c); setLoading(false) })
  }, [deck.name])

  useEffect(() => { load() }, [load])

  const handleDelete = async (card: FlashCard) => {
    if (!confirm(`¿Eliminar carta "${card.front}"?`)) return
    await deleteDeckCard(deck.name, card.id)
    load()
  }

  const handleSaved = () => {
    setAdding(false)
    load()
    onCardAdded()
  }

  const typeColor: Record<string, string> = {
    dictionary: 'var(--indigo)',
    translation: 'var(--teal)',
    custom: 'var(--text3)',
  }
  const typeLabel: Record<string, string> = {
    dictionary: 'Dic',
    translation: 'Trad',
    custom: 'Manual',
  }

  if (adding) {
    return <AddCardPanel deck={deck.name} onSaved={handleSaved} onClose={() => setAdding(false)} />
  }

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center gap-2 px-4 py-2 flex-shrink-0"
        style={{ background: 'var(--bg2)', borderBottom: '1px solid var(--border)' }}>
        <span className="text-sm font-bold flex-1" style={{ color: 'var(--text)' }}>{deck.name}</span>
        <span className="text-[10px]" style={{ color: 'var(--text3)' }}>
          {deck.card_count} cartas · {deck.due_count} pendientes
        </span>
        <button
          onClick={onStudy}
          disabled={deck.due_count === 0}
          className="flex items-center gap-1.5 px-3 py-1 rounded text-xs disabled:opacity-40"
          style={{ background: 'var(--indigo-dim)', color: 'var(--indigo)', border: '1px solid rgba(129,140,248,.25)' }}>
          <Brain size={11} /> Estudiar {deck.due_count > 0 ? `(${deck.due_count})` : ''}
        </button>
        <button
          onClick={() => setAdding(true)}
          className="flex items-center gap-1.5 px-3 py-1 rounded text-xs"
          style={{ background: 'var(--bg3)', color: 'var(--text2)', border: '1px solid var(--border)' }}>
          <Plus size={11} /> Carta
        </button>
      </div>

      {/* Cards list */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center h-32 text-xs" style={{ color: 'var(--text3)' }}>
            Cargando…
          </div>
        ) : cards.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 gap-3">
            <p className="text-sm" style={{ color: 'var(--text3)' }}>Mazo vacío</p>
            <button onClick={() => setAdding(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs"
              style={{ background: 'var(--indigo-dim)', color: 'var(--indigo)', border: '1px solid rgba(129,140,248,.25)' }}>
              <Plus size={11} /> Añadir primera carta
            </button>
          </div>
        ) : (
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                {['Tipo', 'Frente', 'Reverso', 'Repasos', ''].map((h) => (
                  <th key={h} className="text-left px-4 py-2 text-[10px] uppercase tracking-wider font-medium"
                    style={{ color: 'var(--text3)', background: 'var(--bg2)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {cards.map((card) => (
                <tr key={card.id}
                  className="group"
                  style={{ borderBottom: '1px solid var(--border)' }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg2)')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}>
                  <td className="px-4 py-2.5">
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-medium"
                      style={{ color: typeColor[card.type], background: `${typeColor[card.type]}18` }}>
                      {typeLabel[card.type]}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 max-w-[180px] truncate font-medium" style={{ color: 'var(--text)' }}>
                    {card.front}
                  </td>
                  <td className="px-4 py-2.5 max-w-[280px] truncate" style={{ color: 'var(--text2)' }}>
                    {card.back}
                  </td>
                  <td className="px-4 py-2.5 tabular-nums" style={{ color: 'var(--text3)' }}>
                    {card.reviews}
                  </td>
                  <td className="px-4 py-2.5">
                    <button onClick={() => handleDelete(card)}
                      className="opacity-0 group-hover:opacity-100 p-1 rounded transition-opacity"
                      style={{ color: 'var(--red)' }}>
                      <Trash2 size={11} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

// ── Main FlashcardsView ───────────────────────────────────────────────────────

export default function FlashcardsView() {
  const [decks, setDecks] = useState<FlashDeck[]>([])
  const [selectedDeck, setSelectedDeck] = useState<string | null>(null)
  const [studying, setStudying] = useState(false)
  const [addingDeck, setAddingDeck] = useState(false)
  const [newDeckName, setNewDeckName] = useState('')

  const loadDecks = useCallback(async () => {
    const d = await listDecks()
    setDecks(d)
    if (!selectedDeck && d.length > 0) setSelectedDeck(d[0].name)
  }, [selectedDeck])

  useEffect(() => { loadDecks() }, [])

  const handleCreateDeck = async () => {
    if (!newDeckName.trim()) return
    await createDeck(newDeckName.trim())
    setNewDeckName('')
    setAddingDeck(false)
    await loadDecks()
    setSelectedDeck(newDeckName.trim())
  }

  const handleDeleteDeck = async (name: string) => {
    if (!confirm(`¿Eliminar el mazo "${name}" y todas sus cartas?`)) return
    await deleteDeck(name)
    setSelectedDeck(null)
    loadDecks()
  }

  const activeDeck = decks.find((d) => d.name === selectedDeck)

  return (
    <div className="flex h-full overflow-hidden" style={{ background: 'var(--bg)' }}>
      {/* Decks sidebar */}
      <div className="flex flex-col flex-shrink-0 overflow-hidden"
        style={{ width: 200, borderRight: '1px solid var(--border)', background: 'var(--bg2)' }}>
        <div className="flex items-center gap-2 px-3 py-2 flex-shrink-0"
          style={{ borderBottom: '1px solid var(--border)' }}>
          <Brain size={13} style={{ color: 'var(--indigo)' }} />
          <span className="text-xs font-bold flex-1" style={{ color: 'var(--text)' }}>Flashcards</span>
          <button onClick={() => setAddingDeck(true)} className="p-1 rounded hover:opacity-70"
            style={{ color: 'var(--text3)' }} title="Nuevo mazo">
            <Plus size={13} />
          </button>
        </div>

        {addingDeck && (
          <div className="mx-2 my-2 p-2 rounded flex flex-col gap-2"
            style={{ background: 'var(--bg3)', border: '1px solid var(--border)' }}>
            <input
              value={newDeckName}
              onChange={(e) => setNewDeckName(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleCreateDeck(); if (e.key === 'Escape') setAddingDeck(false) }}
              placeholder="Nombre del mazo…"
              autoFocus
              className="bg-transparent outline-none text-xs w-full"
              style={{ color: 'var(--text)', borderBottom: '1px solid var(--border)', paddingBottom: 4 }}
            />
            <div className="flex gap-1">
              <button onClick={handleCreateDeck}
                className="flex-1 py-1 rounded text-[10px]"
                style={{ background: 'var(--indigo-dim)', color: 'var(--indigo)', border: '1px solid rgba(129,140,248,.25)' }}>
                Crear
              </button>
              <button onClick={() => { setAddingDeck(false); setNewDeckName('') }}
                className="flex-1 py-1 rounded text-[10px]"
                style={{ background: 'var(--bg3)', color: 'var(--text3)', border: '1px solid var(--border)' }}>
                Cancelar
              </button>
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto">
          {decks.length === 0 ? (
            <div className="text-center text-xs mt-6 px-3" style={{ color: 'var(--text3)' }}>
              Crea tu primer mazo
            </div>
          ) : (
            decks.map((deck) => (
              <div key={deck.name}
                className="group flex items-center gap-0 px-3 py-2 cursor-pointer"
                onClick={() => { setSelectedDeck(deck.name); setStudying(false) }}
                style={{
                  background: selectedDeck === deck.name ? 'var(--indigo-dim)' : 'transparent',
                  borderLeft: selectedDeck === deck.name ? '2px solid var(--indigo)' : '2px solid transparent',
                }}
                onMouseEnter={(e) => { if (selectedDeck !== deck.name) (e.currentTarget as HTMLElement).style.background = 'var(--bg3)' }}
                onMouseLeave={(e) => { if (selectedDeck !== deck.name) (e.currentTarget as HTMLElement).style.background = 'transparent' }}>
                <div className="flex flex-col flex-1 min-w-0">
                  <span className="text-xs truncate font-medium"
                    style={{ color: selectedDeck === deck.name ? 'var(--indigo)' : 'var(--text2)' }}>
                    {deck.name}
                  </span>
                  <span className="text-[9px]" style={{ color: 'var(--text3)' }}>
                    {deck.card_count} cartas
                    {deck.due_count > 0 && (
                      <span style={{ color: 'var(--indigo)' }}> · {deck.due_count} pendientes</span>
                    )}
                  </span>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); handleDeleteDeck(deck.name) }}
                  className="opacity-0 group-hover:opacity-100 p-1 rounded transition-opacity flex-shrink-0"
                  style={{ color: 'var(--text3)' }}>
                  <Trash2 size={10} />
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Main content */}
      <div className="flex flex-col flex-1 overflow-hidden">
        {activeDeck ? (
          studying ? (
            <StudyMode deck={activeDeck.name} onExit={() => { setStudying(false); loadDecks() }} />
          ) : (
            <DeckView
              deck={activeDeck}
              onStudy={() => setStudying(true)}
              onCardAdded={loadDecks}
            />
          )
        ) : (
          <div className="flex flex-col items-center justify-center flex-1 gap-3">
            <Brain size={40} style={{ color: 'var(--border)' }} />
            <p className="text-sm" style={{ color: 'var(--text3)' }}>
              {decks.length === 0
                ? 'Crea un mazo con el botón +'
                : 'Selecciona un mazo'}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
