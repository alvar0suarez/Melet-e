import React, { useEffect, useRef, useState } from 'react'
import { BookMarked, Sparkles, Send, X, Copy, Check, Highlighter, FileText, Languages, ExternalLink } from 'lucide-react'
import { useReaderStore } from '@/store/reader'
import { useAppStore } from '@/store/app'
import { aiChat, saveDeckCard, createDeck, saveAnnotations, loadAnnotations, appendBookHighlight } from '@/lib/api'
import type { HighlightColor } from '@/lib/types'

const HIGHLIGHT_COLORS: { color: HighlightColor; hex: string; label: string }[] = [
  { color: 'red',    hex: '#ef4444', label: 'En desacuerdo' },
  { color: 'yellow', hex: '#f59e0b', label: 'Interesante' },
  { color: 'green',  hex: '#22c55e', label: 'De acuerdo' },
  { color: 'grey',   hex: '#9ca3af', label: 'Neutral' },
]

const DEFINE_SYSTEM = `Eres un asistente de lectura. Responde SIEMPRE en español. Cuando el usuario pida definir un término, usa este formato exacto:

**Etimología:** [origen y raíz de la palabra, lengua de procedencia]
**Significado:** [significado actual, claro y conciso]

Sé breve (máximo 3-4 líneas en total). No añadas nada más fuera del formato indicado.`

const TRANSLATE_SYSTEM = `Eres un asistente de traducción. Responde SIEMPRE en español.
Si el texto está en inglés, tradúcelo al español. Si ya está en español, tradúcelo al inglés.
Devuelve SOLO la traducción, sin explicaciones adicionales.`

export default function WordPopup() {
  const { wordPopup, setWordPopup, addAnnotation } = useReaderStore()
  const { aiConfig, openTab, setActivity } = useAppStore()
  const [question, setQuestion] = useState('')
  const [aiResponse, setAiResponse] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [copied, setCopied] = useState(false)
  const [savedFlashcard, setSavedFlashcard] = useState(false)
  const [savedNote, setSavedNote] = useState(false)
  const [highlighted, setHighlighted] = useState<HighlightColor | null>(null)
  const [highlightedNoteName, setHighlightedNoteName] = useState<string | null>(null)
  const ref = useRef<HTMLDivElement>(null)
  const savingRef = useRef(false)

  useEffect(() => {
    if (!wordPopup) {
      setQuestion(''); setAiResponse(null)
      setCopied(false); setSavedFlashcard(false); setSavedNote(false)
      setHighlighted(null); setHighlightedNoteName(null)
      setSaving(false); savingRef.current = false
    }
  }, [wordPopup])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      // Don't close while a save is in progress
      if (savingRef.current) return
      if (ref.current && !ref.current.contains(e.target as Node)) setWordPopup(null)
    }
    const kh = (e: KeyboardEvent) => { if (e.key === 'Escape' && !savingRef.current) setWordPopup(null) }
    document.addEventListener('mousedown', handler)
    document.addEventListener('keydown', kh)
    return () => {
      document.removeEventListener('mousedown', handler)
      document.removeEventListener('keydown', kh)
    }
  }, [])

  if (!wordPopup) return null
  const { stem, text, x, y, page, chapterIdx, pdfAreas } = wordPopup

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  const source = page !== undefined ? `p. ${page + 1}` : chapterIdx !== undefined ? `cap. ${chapterIdx + 1}` : ''

  const handleHighlight = async (color: HighlightColor) => {
    if (saving) return
    setHighlighted(color)
    setSaving(true); savingRef.current = true
    try {
      const ann = {
        id: crypto.randomUUID(),
        text, color, page, chapterIdx, pdfAreas,
        createdAt: new Date().toISOString(),
      }
      addAnnotation(stem, ann)
      const existing = await loadAnnotations(stem)
      await saveAnnotations(stem, [...existing, ann])
      const result = await appendBookHighlight(stem, text, source, color).catch(() => null)
      if (result) setHighlightedNoteName(result.note_name)
    } finally {
      setSaving(false); savingRef.current = false
    }
  }

  const handleSaveNote = async () => {
    if (saving) return
    setSaving(true); savingRef.current = true
    try {
      const { note_name } = await appendBookHighlight(stem, text, source)
      openTab({ id: `note:${note_name}`, name: `${note_name}.md`, type: 'note' })
      setActivity('explorer')
      setSavedNote(true)
      setTimeout(() => setSavedNote(false), 2000)
    } catch {
      // ignore — note might not exist yet
    } finally {
      setSaving(false); savingRef.current = false
    }
  }

  const handleOpenNote = () => {
    if (!highlightedNoteName) return
    openTab({ id: `note:${highlightedNoteName}`, name: `${highlightedNoteName}.md`, type: 'note' })
    setActivity('explorer')
    setWordPopup(null)
  }

  const handleDefine = async () => {
    setLoading(true); setAiResponse(null)
    try {
      const { response } = await aiChat([
        { role: 'system', content: DEFINE_SYSTEM },
        { role: 'user', content: `Define: "${text}"` },
      ], aiConfig ?? undefined)
      setAiResponse(response)
    } finally { setLoading(false) }
  }

  const handleTranslate = async () => {
    setLoading(true); setAiResponse(null)
    try {
      const { response } = await aiChat([
        { role: 'system', content: TRANSLATE_SYSTEM },
        { role: 'user', content: text },
      ], aiConfig ?? undefined)
      setAiResponse(response)
    } finally { setLoading(false) }
  }

  const handleQuestion = async () => {
    if (!question.trim()) return
    setLoading(true); setAiResponse(null)
    try {
      const { response } = await aiChat([
        { role: 'system', content: 'Eres un asistente de lectura. Responde en español, de forma concisa.' },
        { role: 'user', content: `Sobre este fragmento: "${text.slice(0, 300)}"\n\nPregunta: ${question}` },
      ], aiConfig ?? undefined)
      setAiResponse(response)
    } finally { setLoading(false) }
  }

  const handleSaveFlashcard = async () => {
    const deck = 'Lecturas'
    await createDeck(deck).catch(() => {})
    await saveDeckCard(deck, {
      type: 'custom',
      front: text.slice(0, 200),
      back: aiResponse ?? '',
    })
    setSavedFlashcard(true)
  }

  // Keep popup in viewport — wider + max-height scrollable
  const popupW = 256
  const popupX = Math.max(8, Math.min(x, window.innerWidth - popupW - 8))
  const popupY = Math.max(8, Math.min(y + 10, window.innerHeight - 420))

  return (
    <div
      ref={ref}
      className="fixed z-50 flex flex-col"
      style={{
        left: popupX,
        top: popupY,
        width: popupW,
        maxHeight: Math.min(480, window.innerHeight - popupY - 12),
        background: '#1e2431',
        border: '1px solid var(--border2)',
        borderRadius: 10,
        boxShadow: '0 12px 48px rgba(0,0,0,.8), 0 0 0 1px rgba(255,255,255,.04)',
        overflow: 'hidden',
      }}
    >
      {/* Scrollable body */}
      <div className="overflow-y-auto flex-1" style={{ padding: '10px 12px' }}>
        <button onClick={() => setWordPopup(null)} className="absolute top-2 right-2 opacity-40 hover:opacity-100" style={{ color: 'var(--text3)' }}>
          <X size={12} />
        </button>

        {/* Selected text preview */}
        <div className="text-[11px] font-semibold mb-2 pr-4 leading-[1.4]" style={{ color: 'var(--text)' }}>
          "{text.length > 120 ? text.slice(0, 120) + '…' : text}"
        </div>

        {/* Quick actions */}
        <div className="flex gap-1 mb-2 flex-wrap">
          <button onClick={handleCopy}
            className="flex items-center gap-1 px-2 py-1 rounded text-[10px]"
            style={{ background: 'var(--bg3)', color: copied ? 'var(--green)' : 'var(--text3)', border: '1px solid var(--border)' }}>
            {copied ? <Check size={9} /> : <Copy size={9} />} {copied ? '¡Copiado!' : 'Copiar'}
          </button>

          <button onClick={handleSaveNote} disabled={saving}
            className="flex items-center gap-1 px-2 py-1 rounded text-[10px]"
            style={{ background: savedNote ? 'rgba(63,185,80,.1)' : 'var(--bg3)', color: savedNote ? 'var(--green)' : saving ? 'var(--text3)' : 'var(--text3)', border: `1px solid ${savedNote ? 'rgba(63,185,80,.3)' : 'var(--border)'}`, opacity: saving ? 0.5 : 1 }}>
            <FileText size={9} /> {saving ? 'Guardando…' : savedNote ? '¡Guardado!' : 'A notas'}
          </button>
        </div>

        {/* Highlight colors */}
        <div className="flex items-center gap-1 mb-1">
          <Highlighter size={10} style={{ color: 'var(--text3)', flexShrink: 0 }} />
          {HIGHLIGHT_COLORS.map(({ color, hex, label }) => (
            <button key={color} onClick={() => handleHighlight(color)}
              disabled={saving}
              className="w-5 h-5 rounded-full transition-transform"
              title={saving ? 'Guardando…' : label}
              style={{
                background: hex,
                transform: highlighted === color ? 'scale(1.3)' : 'scale(1)',
                boxShadow: highlighted === color ? `0 0 0 2px #1e2431, 0 0 0 3px ${hex}` : 'none',
                opacity: saving && highlighted !== color ? 0.4 : 1,
              }} />
          ))}
        </div>

        {/* Highlight saved → link to note */}
        {highlighted && (
          <div className="flex items-center gap-1.5 mb-2 mt-1">
            <span className="text-[9px]" style={{ color: 'var(--green)' }}>✓ Resaltado guardado</span>
            {highlightedNoteName && (
              <button onClick={handleOpenNote}
                className="flex items-center gap-0.5 text-[9px]"
                style={{ color: 'var(--indigo)' }}>
                <ExternalLink size={8} /> Ver nota
              </button>
            )}
          </div>
        )}

        {/* AI actions */}
        <div className="flex gap-1 mb-2">
          <button onClick={handleDefine} disabled={loading}
            className="flex items-center gap-1 px-2 py-1 rounded text-[10px] flex-1"
            style={{ background: 'var(--teal-dim)', color: 'var(--teal)', border: '1px solid rgba(45,212,191,.2)' }}>
            <Sparkles size={9} /> Definir
          </button>
          <button onClick={handleTranslate} disabled={loading}
            className="flex items-center gap-1 px-2 py-1 rounded text-[10px] flex-1"
            style={{ background: 'var(--indigo-dim)', color: 'var(--indigo)', border: '1px solid rgba(129,140,248,.2)' }}>
            <Languages size={9} /> Traducir
          </button>
        </div>

        {/* Free question */}
        <div className="flex items-center gap-1.5 px-2 py-1 rounded text-[10px] mb-2"
          style={{ background: 'var(--bg3)', border: '1px solid var(--border)' }}>
          <input
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleQuestion() }}
            placeholder="Preguntar algo…"
            className="flex-1 bg-transparent outline-none text-[10px]"
            style={{ color: 'var(--text2)' }}
          />
          <button onClick={handleQuestion} disabled={loading} style={{ color: 'var(--indigo)' }}>
            <Send size={10} />
          </button>
        </div>

        {/* AI response */}
        {(loading || aiResponse) && (
          <div className="text-[10px] leading-[1.7] pt-2" style={{ color: 'var(--text2)', borderTop: '1px solid var(--border)', whiteSpace: 'pre-wrap' }}>
            {loading
              ? <span style={{ color: 'var(--text3)' }}>Pensando…</span>
              : aiResponse}
          </div>
        )}

        {/* Flashcard button — only shown when there's an AI response */}
        {aiResponse && !loading && (
          <button onClick={handleSaveFlashcard}
            className="flex items-center gap-1 px-2 py-1 rounded text-[10px] mt-2 w-full justify-center"
            style={{
              background: savedFlashcard ? 'var(--indigo-dim)' : 'var(--bg3)',
              color: savedFlashcard ? 'var(--indigo)' : 'var(--text3)',
              border: `1px solid ${savedFlashcard ? 'rgba(129,140,248,.3)' : 'var(--border)'}`,
            }}>
            <BookMarked size={9} />
            {savedFlashcard ? '¡Flashcard guardada!' : '¿Guardar como flashcard?'}
          </button>
        )}
      </div>
    </div>
  )
}
