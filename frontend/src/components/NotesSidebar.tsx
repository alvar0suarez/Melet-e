import { useState, useMemo } from "react";
import { useAppStore } from "@/store/useAppStore";
import type { NoteListItem } from "@/api/notes";
import { FolderTree } from "./FolderTree";
import { ContextMenu } from "./ContextMenu";

interface ContextMenuState {
  x: number;
  y: number;
  items: { label: string; onClick: () => void; danger?: boolean }[];
}

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
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);

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

  function openNoteMenu(e: React.MouseEvent, note: NoteListItem) {
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      items: [
        {
          label: "Renombrar",
          onClick: async () => {
            const newTitle = window.prompt("Nuevo nombre:", note.title);
            if (newTitle && newTitle.trim() && newTitle !== note.title) {
              await renameNote(note.id, newTitle.trim());
            }
          },
        },
        {
          label: "Mover a carpeta",
          onClick: async () => {
            const newFolder = window.prompt(
              "Carpeta (deja vacío para raíz):",
              note.folder
            );
            if (newFolder !== null && newFolder !== note.folder) {
              await moveNote(note.id, newFolder.trim());
            }
          },
        },
        {
          label: "Duplicar",
          onClick: () => duplicateNote(note.id),
        },
        {
          label: "Eliminar",
          danger: true,
          onClick: async () => {
            if (confirm(`¿Eliminar "${note.title}"?`)) {
              await deleteNote(note.id);
            }
          },
        },
      ],
    });
  }

  function openFolderMenu(
    e: React.MouseEvent,
    folderPath: string,
    folderNotes: NoteListItem[]
  ) {
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      items: [
        {
          label: "Nueva nota aquí",
          onClick: async () => {
            const id = await createNote("Nueva nota", "", folderPath);
            await selectNote(id);
          },
        },
        {
          label: "Eliminar carpeta",
          danger: true,
          onClick: async () => {
            if (folderNotes.length > 0) {
              alert("La carpeta tiene notas. Muévelas primero.");
              return;
            }
            // Empty folder — nothing to delete (no backend entity)
          },
        },
      ],
    });
  }

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
          onContextMenuNote={openNoteMenu}
          onContextMenuFolder={openFolderMenu}
        />
      </div>

      {/* Context menu */}
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          items={contextMenu.items}
          onClose={() => setContextMenu(null)}
        />
      )}
    </aside>
  );
}
