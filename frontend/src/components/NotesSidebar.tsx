import { useState, useMemo } from "react";
import { useAppStore } from "@/store/useAppStore";
import { FolderTree } from "./FolderTree";

export function NotesSidebar() {
  const {
    notes,
    activeNote,
    selectNote,
    createNote,
    deleteNote,
    renameNote,
    moveNote,
    duplicateNote,
  } = useAppStore();

  const [search, setSearch] = useState("");

  async function handleNewNote() {
    const id = await createNote("Nueva nota", "", "");
    await selectNote(id);
  }

  const filteredNotes = useMemo(() => {
    if (!search.trim()) return notes;
    const q = search.toLowerCase();
    return notes.filter(
      (n) =>
        n.title.toLowerCase().includes(q) ||
        n.folder.toLowerCase().includes(q)
    );
  }, [notes, search]);

  return (
    <aside className="flex h-full w-64 flex-shrink-0 flex-col border-r border-[var(--color-bg3)] bg-[var(--color-bg2)]">
      {/* Header */}
      <div className="flex flex-col gap-2 border-b border-[var(--color-bg3)] p-3">
        <button
          onClick={handleNewNote}
          className="w-full rounded bg-[var(--color-indigo)] px-3 py-1.5 text-sm font-medium text-white transition-opacity hover:opacity-90"
        >
          + Nueva nota
        </button>
        <input
          type="text"
          placeholder="Buscar notas…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded border border-[var(--color-bg3)] bg-[var(--color-bg)] px-2.5 py-1.5 text-xs text-[var(--color-text)] placeholder-[var(--color-text2)] outline-none focus:border-[var(--color-indigo)]"
        />
      </div>

      {/* Tree */}
      <div className="flex-1 overflow-y-auto">
        <FolderTree
          notes={filteredNotes}
          activeNoteId={activeNote?.id}
          onSelectNote={selectNote}
          onRenameNote={renameNote}
          onMoveNote={async (id, folder) => moveNote(id, folder)}
          onDuplicateNote={duplicateNote}
          onDeleteNote={deleteNote}
          onCreateNoteInFolder={async (folder) => {
            const id = await createNote("Nueva nota", "", folder);
            await selectNote(id);
          }}
        />
      </div>
    </aside>
  );
}
