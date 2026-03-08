// ─── Vault & Config ──────────────────────────────────────────────────────

export interface AIConfig {
  provider: 'ollama' | 'lmstudio' | 'claude' | 'openai' | 'grok'
  model: string
  api_key: string
  base_url: string
}

export interface AIProvider {
  id: string
  name: string
}

// ─── Documents ───────────────────────────────────────────────────────────

export type DocStatus = 'unread' | 'reading' | 'read' | 'toread'
export type DocExt = 'pdf' | 'epub' | 'txt'

export interface DocMeta {
  path: string
  name: string       // filename stem (raw)
  title: string      // clean title from metadata (may be empty)
  ext: DocExt
  status: DocStatus
  progress: number
  favorite: boolean
  author: string
  year: string
  pages: number
  language: string
  publisher: string
  collections: string[]
  last_opened: string        // ISO date string, empty if never
  total_read_seconds: number // cumulative reading time
}

export interface PdfOutlineItem {
  level: number
  title: string
  page: number  // 0-indexed
}

// ─── EPUB ─────────────────────────────────────────────────────────────────

export type BlockType = 'h1' | 'h2' | 'h3' | 'p' | 'quote' | 'code'

export interface EpubBlock {
  type: BlockType
  text: string
}

export interface EpubChapter {
  title: string
  blocks: EpubBlock[]
}

// ─── Notes ────────────────────────────────────────────────────────────────

export interface NoteSearchResult {
  name: string
  ctx: string
}

export interface GraphData {
  nodes: { id: string }[]
  links: { s: string; t: string }[]
}

// ─── Annotations ─────────────────────────────────────────────────────────

export type HighlightColor = 'red' | 'yellow' | 'green' | 'grey'

export interface PdfArea {
  pageIndex: number
  top: number    // % relative to page height
  left: number   // % relative to page width
  width: number
  height: number
}

export interface Annotation {
  id: string
  page?: number         // PDF
  chapterIdx?: number   // EPUB
  text: string
  note?: string
  color: HighlightColor
  createdAt: string
  pdfAreas?: PdfArea[]  // PDF highlight overlay coordinates
}

// ─── Flashcards ──────────────────────────────────────────────────────────

export interface Flashcard {
  word: string
  content: string
}

// ─── Calendar ────────────────────────────────────────────────────────────

export type EventColor = string
export type Recurring = 'none' | 'daily' | 'weekly' | 'monthly'
export type CalView = 'month' | 'week' | 'day'

export interface CalEvent {
  id: string
  title: string
  date: string   // YYYY-MM-DD
  start_h: number
  end_h: number
  color: EventColor
  notes: string
  recurring: Recurring
  created: string
}

// ─── Source Control ──────────────────────────────────────────────────────

export type ChangeStatus = 'M' | 'A'

export interface ChangedFile {
  name: string
  status: ChangeStatus
  kind?: 'note' | 'flashcard' | 'book'
}

export interface Version {
  ts: string
  label: string
  msg: string
  hash: string
}

export type DiffLineType = 'ctx' | 'del' | 'ins'

export interface DiffLine {
  type: DiffLineType
  old_n: number | null
  new_n: number | null
  text: string
}

// ─── Plugins ─────────────────────────────────────────────────────────────

export interface Plugin {
  id: string
  name: string
  description: string
  version: string
  active: boolean
  error: string | null
}

// ─── Keep (Google Keep-style cards) ──────────────────────────────────────

export type CardType = 'text' | 'checklist' | 'course'

export interface KeepItem {
  id: string
  text: string
  done: boolean
  indent: number
}

export interface KeepCard {
  id: string
  type: CardType
  title: string
  content: string
  items: KeepItem[]
  color: string
  pinned: boolean
  created: string
  updated: string
  note_refs?: string[]   // linked note names (notebook pages)
}

// ─── Flashcard Decks ──────────────────────────────────────────────────────

export type FlashCardType = 'dictionary' | 'translation' | 'custom'

export interface FlashCard {
  id: string
  type: FlashCardType
  front: string
  back: string
  created: string
  due: string
  interval: number
  ease: number
  reviews: number
}

export interface FlashDeck {
  name: string
  card_count: number
  due_count: number
}

// ─── App State ───────────────────────────────────────────────────────────

export type Activity =
  | 'explorer'
  | 'library'
  | 'bookmarks'
  | 'calendar'
  | 'sourcecontrol'
  | 'flashcards'
  | 'graph'
  | 'keep'
  | 'settings'

export interface TabItem {
  id: string        // unique key
  name: string      // display name
  type: 'note' | 'pdf' | 'epub' | 'txt'
  path?: string     // for documents
  modified?: boolean
}
