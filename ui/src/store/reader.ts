import { create } from 'zustand'
import type { Annotation, EpubChapter, HighlightColor, PdfArea } from '@/lib/types'

interface ReaderState {
  // Active document
  docPath: string | null
  docType: 'pdf' | 'epub' | 'txt' | null
  setDoc: (path: string, type: 'pdf' | 'epub' | 'txt') => void

  // PDF
  pdfPage: number
  pdfPageCount: number
  setPdfPage: (p: number) => void
  setPdfPageCount: (c: number) => void

  // EPUB
  epubChapters: EpubChapter[]
  epubChapterIdx: number
  setEpubChapters: (chapters: EpubChapter[]) => void
  setEpubChapter: (idx: number) => void

  // Theme
  readerTheme: 'default' | 'night' | 'sepia'
  setReaderTheme: (t: 'default' | 'night' | 'sepia') => void

  // Annotations
  annotations: Record<string, Annotation[]>  // stem → annotations
  setAnnotations: (stem: string, anns: Annotation[]) => void
  addAnnotation: (stem: string, ann: Annotation) => void
  removeAnnotation: (stem: string, id: string) => void

  // Annotation panel
  annotationPanelOpen: boolean
  toggleAnnotationPanel: () => void

  // Note panel (split view)
  notePanelOpen: boolean
  toggleNotePanel: () => void

  // TOC panel
  tocOpen: boolean
  toggleToc: () => void

  // Bookmarks (reading position) — stem → value (page for PDF, chapterIdx for EPUB)
  bookmarks: Record<string, number>
  setBookmark: (stem: string, val: number) => void
  getBookmarkVal: (stem: string) => number | null

  // Word popup
  wordPopup: { stem: string; text: string; x: number; y: number; page?: number; chapterIdx?: number; pdfAreas?: PdfArea[] } | null
  setWordPopup: (wp: { stem: string; text: string; x: number; y: number; page?: number; chapterIdx?: number; pdfAreas?: PdfArea[] } | null) => void

  // Translation
  translationEnabled: boolean
  toggleTranslation: () => void

  // Progress
  getProgress: (stem: string) => number
}

export const useReaderStore = create<ReaderState>((set, get) => ({
  docPath: null,
  docType: null,
  setDoc: (docPath, docType) => set({ docPath, docType, pdfPage: 0, epubChapterIdx: 0 }),

  pdfPage: 0,
  pdfPageCount: 0,
  setPdfPage: (pdfPage) => set({ pdfPage }),
  setPdfPageCount: (pdfPageCount) => set({ pdfPageCount }),

  epubChapters: [],
  epubChapterIdx: 0,
  setEpubChapters: (epubChapters) => set({ epubChapters }),
  setEpubChapter: (epubChapterIdx) => set({ epubChapterIdx }),

  readerTheme: 'default',
  setReaderTheme: (readerTheme) => set({ readerTheme }),

  annotations: {},
  setAnnotations: (stem, anns) =>
    set((s) => ({ annotations: { ...s.annotations, [stem]: anns } })),
  addAnnotation: (stem, ann) =>
    set((s) => ({
      annotations: {
        ...s.annotations,
        [stem]: [...(s.annotations[stem] ?? []), ann],
      },
    })),
  removeAnnotation: (stem, id) =>
    set((s) => ({
      annotations: {
        ...s.annotations,
        [stem]: (s.annotations[stem] ?? []).filter((a) => a.id !== id),
      },
    })),

  annotationPanelOpen: false,
  toggleAnnotationPanel: () =>
    set((s) => ({ annotationPanelOpen: !s.annotationPanelOpen })),

  notePanelOpen: false,
  toggleNotePanel: () =>
    set((s) => ({ notePanelOpen: !s.notePanelOpen })),

  tocOpen: false,
  toggleToc: () => set((s) => ({ tocOpen: !s.tocOpen })),

  bookmarks: (() => {
    try { return JSON.parse(localStorage.getItem('melete_bookmarks') ?? '{}') } catch { return {} }
  })(),
  setBookmark: (stem, val) => {
    set((s) => {
      const next = { ...s.bookmarks, [stem]: val }
      try { localStorage.setItem('melete_bookmarks', JSON.stringify(next)) } catch {}
      return { bookmarks: next }
    })
  },
  getBookmarkVal: (stem) => {
    const val = get().bookmarks[stem]
    return val !== undefined ? val : null
  },

  wordPopup: null,
  setWordPopup: (wordPopup) => set({ wordPopup }),

  translationEnabled: false,
  toggleTranslation: () => set((s) => ({ translationEnabled: !s.translationEnabled })),

  getProgress: (stem) => {
    const { pdfPage, pdfPageCount, epubChapterIdx, epubChapters, docType } = get()
    if (docType === 'pdf' && pdfPageCount > 0) {
      return Math.round((pdfPage / pdfPageCount) * 100)
    }
    if (docType === 'epub' && epubChapters.length > 0) {
      return Math.round((epubChapterIdx / epubChapters.length) * 100)
    }
    return 0
  },
}))
