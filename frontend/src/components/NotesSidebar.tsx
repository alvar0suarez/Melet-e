import { useState, useMemo } from "react";
import { useAppStore } from "@/store/useAppStore";
import type { NoteListItem } from "@/api/notes";
import { FolderTree } from "./FolderTree";
import { ContextMenu } from "./ContextMenu";

// ── Move-to-folder dialog ─────────────────────────────────────────────────────

interface MoveFolderDialogProps {
  note: NoteListItem;
  existingFolders: string[];
  onConfirm: (folder: string) => void;
  onCancel: () => void;
}

function MoveFolderDialog({
  note,
  existingFolders,
  onConfirm,
  onCancel,
}: MoveFolderDialogProps) {
  const [value, setValue] = useState(note.folder);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-80 rounded-lg border border-[var(--color-bg3)] bg-[var(--color-bg2)] p-4 shadow-xl">
        <p className="mb-3 text-sm font-semibold text-[var(--color-text)]">
          Mover "{note.title}"
        </p>
        <p className="mb-1.5 text-xs text-[var(--color-text2)]">
          Carpeta destino (vacío = raíz):
        </p>
        <input
          list="melete-folder-list"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="ej. personal/libros"
          autoFocus
          className="mb-3 w-full rounded border border-[var(--color-bg3)] bg-[var(--color-bg)] px-2.5 py-1.5 text-sm text-[var(--color-text)] outline-none focus:border-[var(--color-indigo)]"
        />
        <datalist id="melete-folder-list">
          {existingFolders.map((f) => (
            <option key={f} value={f} />
          ))}
        </datalist>
        <div className="flex justify-end gap-2">
          <button
            onClick={onCancel}
            className="rounded px-3 py-1.5 text-sm text-[var(--color-text2)] hover:text-[var(--color-text)] transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={() => onConfirm(value.trim())}
            className="rounded bg-[var(--color-indigo)] px-3 py-1.5 text-sm font-medium text-white hover:opacity-90 transition-opacity"
          >
            Mover
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Sidebar ───────────────────────────────────────────────────────────────────

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
  const [moveTarget, setMoveTarget] = useState<NoteListItem | null>(null);

  // All unique folder paths derived from existing notes
  const existingFolders = useMemo(() => {
    const set = new Set<string>();
    for (const note of notes) {
      if (!note.folder) continue;
      const parts = note.folder.split("/");
      for (let i = 1; i <= parts.length; i++) {
        set.add(parts.slice(0, i).join("/"));
      }
    }
    return Array.from(set).sort();
  }, [notes]);

  async function handleNewNote() {
    const id = await createNote("Nueva nota", "", "");
    await selectNote(id);
  }

  async function handleNewFolder() {
    const name = window.prompt("Nombre de la carpeta:");
    if (!name?.trim()) return;
    const id = await createNote("Nueva nota", "", name.trim());
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
          onClick: () => setMoveTarget(note),
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
          onClick: () => {
            if (folderNotes.length > 0) {
              alert("La carpeta tiene notas. Muévelas o elimínalas primero.");
            }
            // If empty, folder disappears automatically (no backend entity)
          },
        },
      ],
    });
  }

  return (
    <aside className="flex h-full w-64 flex-shrink-0 flex-col border-r border-[var(--color-bg3)] bg-[var(--color-bg2)]">
      {/* Header */}
      <div className="flex flex-col gap-2 border-b border-[var(--color-bg3)] p-3">
        <div className="flex gap-2">
          <button
            onClick={handleNewNote}
            className="flex-1 rounded bg-[var(--color-indigo)] px-3 py-1.5 text-sm font-medium text-white transition-opacity hover:opacity-90"
          >
            + Nota
          </button>
          <button
            onClick={handleNewFolder}
            title="Nueva carpeta"
            className="rounded bg-[var(--color-bg3)] px-3 py-1.5 text-sm font-medium text-[var(--color-text2)] transition-colors hover:text-[var(--color-text)]"
          >
            📁+
          </button>
        </div>
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

      {/* Move-to-folder dialog */}
      {moveTarget && (
        <MoveFolderDialog
          note={moveTarget}
          existingFolders={existingFolders}
          onConfirm={async (folder) => {
            await moveNote(moveTarget.id, folder);
            setMoveTarget(null);
          }}
          onCancel={() => setMoveTarget(null)}
        />
      )}
    </aside>
  );
}
