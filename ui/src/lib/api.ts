/**
 * Melete API client — REST-based, works on both desktop and mobile.
 */
import type {
  AIConfig, DocMeta, EpubChapter, Annotation, CalEvent, ChangedFile,
  Version, DiffLine, Plugin, GraphData, NoteSearchResult, AIProvider, KeepCard,
  FlashDeck, FlashCard
} from './types'

const BASE = import.meta.env.VITE_API_URL ?? ''

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`)
  if (!res.ok) throw new Error(`GET ${path} → ${res.status}`)
  return res.json()
}

async function post<T>(path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: body !== undefined ? { 'Content-Type': 'application/json' } : {},
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })
  if (!res.ok) throw new Error(`POST ${path} → ${res.status}`)
  return res.json()
}

async function del<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`, { method: 'DELETE' })
  if (!res.ok) throw new Error(`DELETE ${path} → ${res.status}`)
  return res.json()
}

// ─── Vault ───────────────────────────────────────────────────────────────

export const getVault = () => get<{ path: string | null; valid: boolean }>('/api/vault')
export const setupVault = (path: string) => post<{ ok: boolean }>('/api/vault/setup', { path })

// ─── Documents ───────────────────────────────────────────────────────────

export const listDocuments = () => get<DocMeta[]>('/api/documents')
export const updateBookMeta = (path: string, meta: Partial<DocMeta>) =>
  post<{ ok: boolean }>('/api/documents/meta', { path, meta })

export const getBookMeta = (path: string) => get<Record<string, unknown>>(`/api/documents/meta/${encodeURIComponent(path)}`)
export const trackReadingSession = (path: string, seconds: number) =>
  post<{ ok: boolean }>('/api/documents/reading-session', { path, seconds })

// Vault file URL (for PDF.js and direct access)
export const vaultFileUrl = (path: string) => `${BASE}/vault-files/${path}`

// ─── PDF ─────────────────────────────────────────────────────────────────

export const getPdfPageCount = (path: string) => get<{ count: number }>(`/api/pdf/count/${encodeURIComponent(path)}`)
export const getPdfText = (path: string, page: number) =>
  get<{ text: string }>(`/api/pdf/text/${encodeURIComponent(path)}?page=${page}`)

// ─── EPUB ─────────────────────────────────────────────────────────────────

export const loadEpub = (path: string) => get<EpubChapter[]>(`/api/epub/${encodeURIComponent(path)}`)

// ─── Notes ───────────────────────────────────────────────────────────────

export const listNotes = () => get<string[]>('/api/notes')
export const getNote = (name: string) => get<{ content: string }>(`/api/notes/${encodeURIComponent(name)}`)
export const saveNote = (name: string, content: string, snapshot = false, msg = '') =>
  post<{ ok: boolean }>(`/api/notes/${encodeURIComponent(name)}`, { content, snapshot, snapshot_msg: msg })
export const deleteNote = (name: string) => del<{ ok: boolean }>(`/api/notes/${encodeURIComponent(name)}`)
export const renameNote = (oldName: string, newName: string) =>
  post<{ ok: boolean }>(`/api/notes/${encodeURIComponent(oldName)}/rename`, { new_name: newName })
export const newNote = () => post<{ name: string }>('/api/notes/new')
export const appendBookHighlight = (stem: string, text: string, source: string, color = 'yellow') =>
  post<{ ok: boolean; note_name: string }>(`/api/notes/${encodeURIComponent(stem)}/highlight`, { text, source, color })
export const getBacklinks = (name: string) => get<string[]>(`/api/notes/${encodeURIComponent(name)}/backlinks`)
export const getBacklinksContext = (name: string) => get<{ note: string; ctx: string }[]>(`/api/notes/${encodeURIComponent(name)}/backlinks-context`)
export const searchNotes = (q: string) => get<NoteSearchResult[]>(`/api/notes/search?q=${encodeURIComponent(q)}`)
export const getGraph = () => get<GraphData>('/api/graph')

// ─── Annotations ─────────────────────────────────────────────────────────

export const loadAnnotations = (stem: string) => get<Annotation[]>(`/api/annotations/${encodeURIComponent(stem)}`)
export const saveAnnotations = (stem: string, annotations: Annotation[]) =>
  post<{ ok: boolean }>(`/api/annotations/${encodeURIComponent(stem)}`, { annotations })

// ─── Flashcard Decks ──────────────────────────────────────────────────────

export const listVocabWords = () => get<{ front: string; back: string; type: string }[]>('/api/vocab')
export const listDecks = () => get<FlashDeck[]>('/api/decks')
export const createDeck = (name: string) => post<{ ok: boolean }>('/api/decks', { name })
export const deleteDeck = (name: string) => del<{ ok: boolean }>(`/api/decks/${encodeURIComponent(name)}`)
export const listDeckCards = (deck: string) => get<FlashCard[]>(`/api/decks/${encodeURIComponent(deck)}/cards`)
export const getDueCards = (deck: string) => get<FlashCard[]>(`/api/decks/${encodeURIComponent(deck)}/due`)
export const saveDeckCard = (deck: string, card: Partial<FlashCard>) =>
  post<FlashCard>(`/api/decks/${encodeURIComponent(deck)}/cards`, { card })
export const deleteDeckCard = (deck: string, cardId: string) =>
  del<{ ok: boolean }>(`/api/decks/${encodeURIComponent(deck)}/cards/${cardId}`)
export const reviewCard = (deck: string, cardId: string, rating: 'again' | 'hard' | 'good' | 'easy') =>
  post<FlashCard>(`/api/decks/${encodeURIComponent(deck)}/cards/${cardId}/review`, { rating })
export const snapshotAll = () => post<{ ok: boolean; count: number }>('/api/sc/snapshot-all')

// ─── AI ──────────────────────────────────────────────────────────────────

export const getAIProviders = () => get<AIProvider[]>('/api/ai/providers')
export const getAIConfig = () => get<AIConfig>('/api/ai/config')
export const saveAIConfig = (config: AIConfig) => post<{ ok: boolean }>('/api/ai/config', config)
export const aiChat = (messages: { role: string; content: string }[], config?: AIConfig) =>
  post<{ response: string }>('/api/ai/chat', { messages, config })
export const testAI = (config: AIConfig) => post<{ ok: boolean; message: string }>('/api/ai/test', config)

// ─── Collections ─────────────────────────────────────────────────────────

export const getCollections = () => get<string[]>('/api/collections')
export const addCollection = (name: string) => post<{ ok: boolean }>('/api/collections', { name })
export const deleteCollection = (name: string) => del<{ ok: boolean }>(`/api/collections/${encodeURIComponent(name)}`)

// ─── Calendar ────────────────────────────────────────────────────────────

export const getEvents = () => get<CalEvent[]>('/api/calendar/events')
export const addEvent = (ev: Omit<CalEvent, 'id' | 'created'>) =>
  post<CalEvent>('/api/calendar/events', ev)
export const deleteEvent = (id: string) => del<{ ok: boolean }>(`/api/calendar/events/${id}`)
export const getEventsForDate = (date: string) => get<CalEvent[]>(`/api/calendar/date/${date}`)
export const getEventsForWeek = (weekStart: string) =>
  get<Record<string, CalEvent[]>>(`/api/calendar/week/${weekStart}`)
export const getMonthCalendar = (year: number, month: number) =>
  get<{ weeks: (string | null)[][] }>(`/api/calendar/month/${year}/${month}`)

// ─── Source Control ──────────────────────────────────────────────────────

export const getChanges = () => get<ChangedFile[]>('/api/sc/changes')
export const getVersions = (stem: string) => get<Version[]>(`/api/sc/versions/${encodeURIComponent(stem)}`)
export const saveSnapshot = (stem: string, message = '') =>
  post<{ ok: boolean }>(`/api/sc/snapshot/${encodeURIComponent(stem)}`, { message })
export const getDiff = (stem: string) => get<DiffLine[]>(`/api/sc/diff/${encodeURIComponent(stem)}`)
export const restoreVersion = (stem: string, ts: string) =>
  post<{ content: string; ok: boolean }>(`/api/sc/restore/${encodeURIComponent(stem)}/${ts}`)
export const createBackup = () => post<{ path: string }>('/api/sc/backup')
export const revertFile = (stem: string) => post<{ ok: boolean; action: string }>(`/api/sc/revert/${encodeURIComponent(stem)}`)

// ─── Plugins ─────────────────────────────────────────────────────────────

export const listPlugins = () => get<Plugin[]>('/api/plugins')

// ─── Keep ─────────────────────────────────────────────────────────────────

export const listCards = () => get<KeepCard[]>('/api/keep/cards')
export const createCard = (data: { type_: string; title?: string; content?: string; items?: unknown[]; color?: string; pinned?: boolean }) =>
  post<KeepCard>('/api/keep/cards', data)
export const updateCard = (id: string, updates: Partial<KeepCard>) =>
  post<KeepCard>(`/api/keep/cards/${id}`, updates)
export const deleteCard = (id: string) => del<{ ok: boolean }>(`/api/keep/cards/${id}`)
export const toggleItem = (cardId: string, itemId: string) =>
  post<KeepCard>(`/api/keep/cards/${cardId}/items/${itemId}/toggle`)
export const addItem = (cardId: string, text: string, indent = 0) =>
  post<KeepCard>(`/api/keep/cards/${cardId}/items`, { text, indent })
export const deleteItem = (cardId: string, itemId: string) =>
  del<KeepCard>(`/api/keep/cards/${cardId}/items/${itemId}`)
