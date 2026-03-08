import { create } from 'zustand'

interface EditorState {
  noteContent: Record<string, string>    // name → content
  setNoteContent: (name: string, content: string) => void
  getNoteContent: (name: string) => string

  notes: string[]
  setNotes: (notes: string[]) => void

  backlinks: Record<string, string[]>
  setBacklinks: (name: string, links: string[]) => void

  dirtyNotes: Set<string>
  markDirty: (name: string) => void
  markClean: (name: string) => void
}

export const useEditorStore = create<EditorState>((set, get) => ({
  noteContent: {},
  setNoteContent: (name, content) =>
    set((s) => ({ noteContent: { ...s.noteContent, [name]: content } })),
  getNoteContent: (name) => get().noteContent[name] ?? '',

  notes: [],
  setNotes: (notes) => set({ notes }),

  backlinks: {},
  setBacklinks: (name, links) =>
    set((s) => ({ backlinks: { ...s.backlinks, [name]: links } })),

  dirtyNotes: new Set(),
  markDirty: (name) =>
    set((s) => ({ dirtyNotes: new Set([...s.dirtyNotes, name]) })),
  markClean: (name) =>
    set((s) => {
      const d = new Set(s.dirtyNotes)
      d.delete(name)
      return { dirtyNotes: d }
    }),
}))
