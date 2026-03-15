import { createContext, useContext, useMemo, useRef, useState } from "react";
import type { NoteListItem } from "@/api/notes";
import { ContextMenu } from "./ContextMenu";
import type { ContextMenuItem } from "./ContextMenu";

// ── Data model ────────────────────────────────────────────────────────────────

export interface FolderNode {
  name: string;
  path: string; // e.g. "personal/libros"
  notes: NoteListItem[];
  children: FolderNode[];
}

export function buildTree(notes: NoteListItem[]): {
  rootNotes: NoteListItem[];
  folders: FolderNode[];
} {
  const rootNotes = notes.filter((n) => !n.folder);
  const folderMap = new Map<string, FolderNode>();

  for (const note of notes) {
    if (!note.folder) continue;
    const parts = note.folder.split("/");
    let path = "";
    for (const part of parts) {
      const parent = path;
      path = parent ? `${parent}/${part}` : part;
      if (!folderMap.has(path)) {
        folderMap.set(path, { name: part, path, notes: [], children: [] });
      }
    }
    folderMap.get(note.folder)!.notes.push(note);
  }

  const rootFolders: FolderNode[] = [];
  for (const [path, folder] of folderMap) {
    const slash = path.lastIndexOf("/");
    if (slash === -1) {
      rootFolders.push(folder);
    } else {
      folderMap.get(path.substring(0, slash))?.children.push(folder);
    }
  }

  return { rootNotes, folders: rootFolders };
}

function subtreeHasNotes(folder: FolderNode): boolean {
  if (folder.notes.length > 0) return true;
  return folder.children.some(subtreeHasNotes);
}

// ── Shared context ────────────────────────────────────────────────────────────

interface TreeCtxValue {
  collapsed: Record<string, boolean>;
  toggleCollapse: (path: string) => void;
  activeNoteId?: string;
  onSelectNote: (id: string) => void;
  // Inline rename
  renaming: { id: string; value: string } | null;
  setRenaming: (r: { id: string; value: string } | null) => void;
  commitRename: (id: string, value: string) => void;
  // Drag & drop
  dragOver: string | null; // folder path | "root" | null
  setDragOver: (v: string | null) => void;
  dragNoteIdRef: React.MutableRefObject<string | null>;
  onMoveNote: (noteId: string, folder: string) => void;
  // Context menus (open from sub-components)
  openNoteMenu: (e: React.MouseEvent, note: NoteListItem) => void;
  openFolderMenu: (e: React.MouseEvent, folder: FolderNode) => void;
}

const TreeCtx = createContext<TreeCtxValue>({
  collapsed: {},
  toggleCollapse: () => {},
  onSelectNote: () => {},
  renaming: null,
  setRenaming: () => {},
  commitRename: () => {},
  dragOver: null,
  setDragOver: () => {},
  dragNoteIdRef: { current: null },
  onMoveNote: () => {},
  openNoteMenu: () => {},
  openFolderMenu: () => {},
});

// ── Depth → Tailwind padding (pre-declared so Tailwind includes them) ─────────

const NOTE_PAD = ["pl-3", "pl-6", "pl-9", "pl-12"] as const;
const FOLDER_PAD = ["pl-2", "pl-5", "pl-8", "pl-11"] as const;

// ── NoteRow ───────────────────────────────────────────────────────────────────

function NoteRow({ note, depth }: { note: NoteListItem; depth: number }) {
  const {
    activeNoteId,
    onSelectNote,
    renaming,
    setRenaming,
    commitRename,
    dragNoteIdRef,
    setDragOver,
    openNoteMenu,
  } = useContext(TreeCtx);

  const isActive = note.id === activeNoteId;
  const isRenaming = renaming?.id === note.id;
  const pad = NOTE_PAD[Math.min(depth, 3)];

  if (isRenaming) {
    return (
      <li>
        <form
          className={`${pad} py-1 pr-3`}
          onSubmit={(e) => {
            e.preventDefault();
            commitRename(note.id, renaming!.value);
          }}
        >
          <input
            value={renaming!.value}
            autoFocus
            onChange={(e) =>
              setRenaming({ id: note.id, value: e.target.value })
            }
            onBlur={() => commitRename(note.id, renaming!.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape") setRenaming(null);
            }}
            className="w-full rounded border border-[var(--color-indigo)] bg-[var(--color-bg)] px-2 py-0.5 text-sm text-[var(--color-text)] outline-none"
          />
        </form>
      </li>
    );
  }

  return (
    <li>
      <button
        draggable
        onDragStart={(e) => {
          dragNoteIdRef.current = note.id;
          e.dataTransfer.setData("melete/note-id", note.id);
          e.dataTransfer.effectAllowed = "move";
        }}
        onDragEnd={() => {
          dragNoteIdRef.current = null;
          setDragOver(null);
        }}
        onClick={() => onSelectNote(note.id)}
        onContextMenu={(e) => {
          e.preventDefault();
          e.stopPropagation();
          openNoteMenu(e, note);
        }}
        className={[
          `flex w-full cursor-grab items-center gap-1.5 ${pad} py-1.5 pr-3 text-left text-sm transition-colors`,
          isActive
            ? "border-l-2 border-[var(--color-indigo)] bg-[var(--color-bg3)] text-[var(--color-text)]"
            : "border-l-2 border-transparent text-[var(--color-text)] hover:bg-[var(--color-bg3)]",
        ].join(" ")}
      >
        <span className="shrink-0 text-xs text-[var(--color-text2)]">📄</span>
        <span className="truncate">{note.title}</span>
      </button>
    </li>
  );
}

// ── FolderRow ─────────────────────────────────────────────────────────────────

function FolderRow({ folder, depth }: { folder: FolderNode; depth: number }) {
  const { collapsed, toggleCollapse, dragOver, setDragOver, onMoveNote, openFolderMenu } =
    useContext(TreeCtx);

  const isCollapsed = !!collapsed[folder.path];
  const isDragOver = dragOver === folder.path;
  const pad = FOLDER_PAD[Math.min(depth, 3)];

  // Drag handlers on the <li> to avoid child-element flickering in onDragLeave
  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(folder.path);
  }

  function handleDragLeave(e: React.DragEvent) {
    e.stopPropagation();
    // Only clear when truly leaving this element (not entering a child)
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setDragOver(null);
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    const noteId = e.dataTransfer.getData("melete/note-id");
    if (noteId) onMoveNote(noteId, folder.path);
    setDragOver(null);
  }

  return (
    <li
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={[
        "rounded transition-colors",
        isDragOver
          ? "bg-[var(--color-indigo)]/15 outline outline-1 outline-[var(--color-indigo)]"
          : "",
      ].join(" ")}
    >
      <button
        onClick={() => toggleCollapse(folder.path)}
        onContextMenu={(e) => {
          e.preventDefault();
          e.stopPropagation();
          openFolderMenu(e, folder);
        }}
        className={`flex w-full items-center gap-1.5 ${pad} py-1 pr-3 text-left text-sm text-[var(--color-text2)] transition-colors hover:text-[var(--color-text)]`}
      >
        <span className="w-3 shrink-0 text-center text-xs">
          {isCollapsed ? "▶" : "▼"}
        </span>
        <span className="shrink-0 text-xs">📁</span>
        <span className="truncate font-medium">{folder.name}</span>
      </button>
      {!isCollapsed && (
        <ul>
          {folder.children.map((child) => (
            <FolderRow key={child.path} folder={child} depth={depth + 1} />
          ))}
          {folder.notes.map((note) => (
            <NoteRow key={note.id} note={note} depth={depth + 1} />
          ))}
        </ul>
      )}
    </li>
  );
}

// ── Move-to-folder dialog ─────────────────────────────────────────────────────

function MoveFolderDialog({
  note,
  folders,
  onConfirm,
  onCancel,
}: {
  note: NoteListItem;
  folders: string[];
  onConfirm: (folder: string) => void;
  onCancel: () => void;
}) {
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
          list="melete-folder-datalist"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="ej. personal/libros"
          autoFocus
          className="mb-3 w-full rounded border border-[var(--color-bg3)] bg-[var(--color-bg)] px-2.5 py-1.5 text-sm text-[var(--color-text)] outline-none focus:border-[var(--color-indigo)]"
        />
        <datalist id="melete-folder-datalist">
          {folders.map((f) => (
            <option key={f} value={f} />
          ))}
        </datalist>
        <div className="flex justify-end gap-2">
          <button
            onClick={onCancel}
            className="rounded px-3 py-1.5 text-sm text-[var(--color-text2)] transition-colors hover:text-[var(--color-text)]"
          >
            Cancelar
          </button>
          <button
            onClick={() => onConfirm(value.trim())}
            className="rounded bg-[var(--color-indigo)] px-3 py-1.5 text-sm font-medium text-white transition-opacity hover:opacity-90"
          >
            Mover
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Public component ──────────────────────────────────────────────────────────

export interface FolderTreeProps {
  notes: NoteListItem[];
  activeNoteId?: string;
  onSelectNote: (id: string) => void;
  onRenameNote: (id: string, newTitle: string) => void;
  onMoveNote: (id: string, newFolder: string) => void;
  onDuplicateNote: (id: string) => void;
  onDeleteNote: (id: string) => void;
  onCreateNoteInFolder: (folder: string) => void;
}

export function FolderTree({
  notes,
  activeNoteId,
  onSelectNote,
  onRenameNote,
  onMoveNote,
  onDuplicateNote,
  onDeleteNote,
  onCreateNoteInFolder,
}: FolderTreeProps) {
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>(() => {
    try {
      return JSON.parse(
        localStorage.getItem("melete-folder-collapsed") ?? "{}"
      );
    } catch {
      return {};
    }
  });

  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    items: ContextMenuItem[];
  } | null>(null);

  const [renaming, setRenaming] = useState<{
    id: string;
    value: string;
  } | null>(null);

  const [moveTarget, setMoveTarget] = useState<NoteListItem | null>(null);
  const [dragOver, setDragOver] = useState<string | null>(null);
  const dragNoteIdRef = useRef<string | null>(null);

  function toggleCollapse(path: string) {
    setCollapsed((prev) => {
      const next = { ...prev, [path]: !prev[path] };
      localStorage.setItem("melete-folder-collapsed", JSON.stringify(next));
      return next;
    });
  }

  function commitRename(id: string, value: string) {
    const trimmed = value.trim();
    if (trimmed) onRenameNote(id, trimmed);
    setRenaming(null);
  }

  // All unique folder paths for the move-dialog autocomplete
  const allFolderPaths = useMemo(() => {
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

  function openNoteMenu(e: React.MouseEvent, note: NoteListItem) {
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      items: [
        {
          label: "Renombrar",
          onClick: () => setRenaming({ id: note.id, value: note.title }),
        },
        {
          label: "Mover a carpeta",
          onClick: () => setMoveTarget(note),
        },
        {
          label: "Duplicar",
          onClick: () => onDuplicateNote(note.id),
        },
        {
          label: "Eliminar",
          danger: true,
          onClick: () => {
            if (confirm(`¿Eliminar "${note.title}"?`)) onDeleteNote(note.id);
          },
        },
      ],
    });
  }

  function openFolderMenu(e: React.MouseEvent, folder: FolderNode) {
    const hasNotes = subtreeHasNotes(folder);
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      items: [
        {
          label: "Nueva nota aquí",
          onClick: () => onCreateNoteInFolder(folder.path),
        },
        {
          label: "Eliminar carpeta",
          danger: true,
          disabled: hasNotes,
          disabledReason: "Mueve las notas antes de eliminar",
          onClick: () => {
            /* folder disappears automatically when empty */
          },
        },
      ],
    });
  }

  const { rootNotes, folders } = buildTree(notes);

  const ctxValue: TreeCtxValue = {
    collapsed,
    toggleCollapse,
    activeNoteId,
    onSelectNote,
    renaming,
    setRenaming,
    commitRename,
    dragOver,
    setDragOver,
    dragNoteIdRef,
    onMoveNote,
    openNoteMenu,
    openFolderMenu,
  };

  // Root drop zone: catches drops when not over any folder
  function handleRootDragOver(e: React.DragEvent) {
    e.preventDefault();
    if (!dragOver) setDragOver("root");
  }
  function handleRootDragLeave(e: React.DragEvent) {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setDragOver(null);
    }
  }
  function handleRootDrop(e: React.DragEvent) {
    e.preventDefault();
    const noteId = e.dataTransfer.getData("melete/note-id");
    if (noteId && dragOver === "root") onMoveNote(noteId, "");
    setDragOver(null);
  }

  return (
    <TreeCtx.Provider value={ctxValue}>
      <ul
        className={[
          "py-1 min-h-12 transition-colors",
          dragOver === "root"
            ? "outline outline-1 outline-[var(--color-indigo)] outline-offset-[-2px] rounded"
            : "",
        ].join(" ")}
        onDragOver={handleRootDragOver}
        onDragLeave={handleRootDragLeave}
        onDrop={handleRootDrop}
      >
        {rootNotes.map((note) => (
          <NoteRow key={note.id} note={note} depth={0} />
        ))}
        {folders.map((folder) => (
          <FolderRow key={folder.path} folder={folder} depth={0} />
        ))}
        {notes.length === 0 && (
          <li className="px-4 py-6 text-center text-sm text-[var(--color-text2)]">
            Sin notas todavía
          </li>
        )}
      </ul>

      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          items={contextMenu.items}
          onClose={() => setContextMenu(null)}
        />
      )}

      {moveTarget && (
        <MoveFolderDialog
          note={moveTarget}
          folders={allFolderPaths}
          onConfirm={async (folder) => {
            await onMoveNote(moveTarget.id, folder);
            setMoveTarget(null);
          }}
          onCancel={() => setMoveTarget(null)}
        />
      )}
    </TreeCtx.Provider>
  );
}
