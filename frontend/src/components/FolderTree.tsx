import { createContext, useContext, useState } from "react";
import type { NoteListItem } from "@/api/notes";

// ── Data model ────────────────────────────────────────────────────────────────

export interface FolderNode {
  name: string;
  path: string;
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

// ── Shared context (avoids prop drilling through recursive components) ────────

interface TreeCtxValue {
  collapsed: Record<string, boolean>;
  toggleCollapse: (path: string) => void;
  activeNoteId?: string;
  onSelectNote: (id: string) => void;
  onContextMenuNote: (e: React.MouseEvent, note: NoteListItem) => void;
  onContextMenuFolder: (
    e: React.MouseEvent,
    folderPath: string,
    notes: NoteListItem[]
  ) => void;
}

const TreeCtx = createContext<TreeCtxValue>({
  collapsed: {},
  toggleCollapse: () => {},
  onSelectNote: () => {},
  onContextMenuNote: () => {},
  onContextMenuFolder: () => {},
});

// ── Depth → padding class (pre-listed so Tailwind includes them) ──────────────

const NOTE_PAD = ["pl-3", "pl-6", "pl-9", "pl-12"] as const;
const FOLDER_PAD = ["pl-2", "pl-5", "pl-8", "pl-11"] as const;

// ── Top-level sub-components (NOT nested inside FolderTree) ───────────────────

function NoteRow({ note, depth }: { note: NoteListItem; depth: number }) {
  const { activeNoteId, onSelectNote, onContextMenuNote } = useContext(TreeCtx);
  const isActive = note.id === activeNoteId;
  const pad = NOTE_PAD[Math.min(depth, 3)];

  return (
    <li>
      <button
        onClick={() => onSelectNote(note.id)}
        onContextMenu={(e) => {
          e.preventDefault();
          onContextMenuNote(e, note);
        }}
        className={[
          `flex w-full items-center gap-1.5 ${pad} py-1.5 pr-3 text-left text-sm transition-colors`,
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

function FolderRow({ folder, depth }: { folder: FolderNode; depth: number }) {
  const { collapsed, toggleCollapse, onContextMenuFolder } =
    useContext(TreeCtx);
  const isCollapsed = !!collapsed[folder.path];
  const pad = FOLDER_PAD[Math.min(depth, 3)];

  return (
    <li>
      <button
        onClick={() => toggleCollapse(folder.path)}
        onContextMenu={(e) => {
          e.preventDefault();
          onContextMenuFolder(e, folder.path, folder.notes);
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

// ── Public component ──────────────────────────────────────────────────────────

export interface FolderTreeProps {
  notes: NoteListItem[];
  activeNoteId?: string;
  onSelectNote: (id: string) => void;
  onContextMenuNote: (e: React.MouseEvent, note: NoteListItem) => void;
  onContextMenuFolder: (
    e: React.MouseEvent,
    folderPath: string,
    notes: NoteListItem[]
  ) => void;
}

export function FolderTree({
  notes,
  activeNoteId,
  onSelectNote,
  onContextMenuNote,
  onContextMenuFolder,
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

  function toggleCollapse(path: string) {
    setCollapsed((prev) => {
      const next = { ...prev, [path]: !prev[path] };
      localStorage.setItem("melete-folder-collapsed", JSON.stringify(next));
      return next;
    });
  }

  const { rootNotes, folders } = buildTree(notes);

  return (
    <TreeCtx.Provider
      value={{
        collapsed,
        toggleCollapse,
        activeNoteId,
        onSelectNote,
        onContextMenuNote,
        onContextMenuFolder,
      }}
    >
      <ul className="py-1">
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
    </TreeCtx.Provider>
  );
}
