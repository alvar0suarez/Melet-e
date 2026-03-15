import { create } from "zustand";
import { notesApi, type Note, type NoteListItem, type BacklinkItem } from "@/api/notes";

interface AppState {
  notes: NoteListItem[];
  activeNote: Note | null;
  backlinks: BacklinkItem[];
  isLoading: boolean;

  fetchNotes: () => Promise<void>;
  selectNote: (id: string) => Promise<void>;
  clearActive: () => void;
  createNote: (title: string, content: string, folder: string) => Promise<string>;
  saveNote: (id: string, title: string, content: string, folder: string) => Promise<void>;
  deleteNote: (id: string) => Promise<void>;
  renameNote: (id: string, newTitle: string) => Promise<void>;
  moveNote: (id: string, newFolder: string) => Promise<void>;
  duplicateNote: (id: string) => Promise<void>;
  fetchBacklinks: (id: string) => Promise<void>;
}

export const useAppStore = create<AppState>((set, get) => ({
  notes: [],
  activeNote: null,
  backlinks: [],
  isLoading: false,

  fetchNotes: async () => {
    set({ isLoading: true });
    try {
      const notes = await notesApi.list();
      set({ notes });
    } finally {
      set({ isLoading: false });
    }
  },

  selectNote: async (id: string) => {
    const note = await notesApi.get(id);
    set({ activeNote: note });
    await get().fetchBacklinks(id);
  },

  clearActive: () => set({ activeNote: null, backlinks: [] }),

  createNote: async (title, content, folder) => {
    const { id } = await notesApi.create({ title, content, folder });
    await get().fetchNotes();
    return id;
  },

  saveNote: async (id, title, content, folder) => {
    await notesApi.update(id, { title, content, folder });
    set((state) => ({
      activeNote: state.activeNote
        ? { ...state.activeNote, title, content, folder }
        : null,
    }));
    await get().fetchNotes();
    await get().fetchBacklinks(id);
  },

  deleteNote: async (id) => {
    await notesApi.delete(id);
    set({ activeNote: null, backlinks: [] });
    await get().fetchNotes();
  },

  renameNote: async (id, newTitle) => {
    const note = await notesApi.get(id);
    await notesApi.update(id, {
      title: newTitle,
      content: note.content,
      folder: note.folder,
    });
    if (get().activeNote?.id === id) {
      set((state) => ({
        activeNote: state.activeNote
          ? { ...state.activeNote, title: newTitle }
          : null,
      }));
    }
    await get().fetchNotes();
  },

  moveNote: async (id, newFolder) => {
    const note = await notesApi.get(id);
    await notesApi.update(id, {
      title: note.title,
      content: note.content,
      folder: newFolder,
    });
    if (get().activeNote?.id === id) {
      set((state) => ({
        activeNote: state.activeNote
          ? { ...state.activeNote, folder: newFolder }
          : null,
      }));
    }
    await get().fetchNotes();
  },

  duplicateNote: async (id) => {
    const note = await notesApi.get(id);
    await notesApi.create({
      title: `${note.title} (copia)`,
      content: note.content,
      folder: note.folder,
    });
    await get().fetchNotes();
  },

  fetchBacklinks: async (id) => {
    try {
      const backlinks = await notesApi.backlinks(id);
      set({ backlinks });
    } catch {
      set({ backlinks: [] });
    }
  },
}));
