import { useState } from "react";
import type { NoteListItem } from "@/api/notes";
import type { ContextMenuItem } from "./ContextMenu";

interface FolderNode {
  name: string;
  path: string;
  notes: NoteListItem[];
  children: FolderNode[];
}

function buildTree(notes: NoteListItem[]): {
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
      const parentPath = path;
      path = parentPath ? `${parentPath}/${part}` : part;
      if (!folderMap.has(path)) {
        folderMap.set(path, { name: part, path, notes: [], children: [] });
      }
    }
    folderMap.get(note.folder)!.notes.push(note);
  }

  const rootFolders: FolderNode[] = [];
  for (const [path, folder] of folderMap) {
    const lastSlash = path.lastIndexOf("/");
    if (lastSlash === -1) {
      rootFolders.push(folder);
    } else {
      const parentPath = path.substring(0, lastSlash);
      folderMap.get(parentPath)?.children.push(folder);
    }
  }

  return { rootNotes, folders: rootFolders };
}

interface Props {
  notes: NoteListItem[];
  activeNoteId?: string;
  onSelectNote: (id: string) => void;
  onContextMenuNote: (
    e: React.MouseEvent,
    note: NoteListItem
  ) => void;
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
}: Props) {
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

  function NoteItem({ note, depth = 0 }: { note: NoteListItem; depth?: number }) {
    const isActive = note.id === activeNoteId;
    return (
      <li>
        <button
          onClick={() => onSelectNote(note.id)}
          onContextMenu={(e) => {
            e.preventDefault();
            onContextMenuNote(e, note);
          }}
          style={{ paddingLeft: `${(depth + 1) * 12}px` }}
          className={[
            "flex w-full items-center gap-1.5 py-1.5 pr-3 text-left text-sm transition-colors",
            isActive
              ? "border-l-2 border-[var(--color-indigo)] bg-[var(--color-bg3)] text-[var(--color-text)]"
              : "border-l-2 border-transparent text-[var(--color-text)] hover:bg-[var(--color-bg3)]",
          ].join(" ")}
        >
          <span className="text-[var(--color-text2)] text-xs">📄</span>
          <span className="truncate">{note.title}</span>
        </button>
      </li>
    );
  }

  function FolderItem({
    folder,
    depth = 0,
  }: {
    folder: FolderNode;
    depth?: number;
  }) {
    const isCollapsed = collapsed[folder.path];
    return (
      <li>
        <button
          onClick={() => toggleCollapse(folder.path)}
          onContextMenu={(e) => {
            e.preventDefault();
            onContextMenuFolder(e, folder.path, folder.notes);
          }}
          style={{ paddingLeft: `${depth * 12 + 8}px` }}
          className="flex w-full items-center gap-1.5 py-1 pr-3 text-left text-sm text-[var(--color-text2)] hover:text-[var(--color-text)] transition-colors"
        >
          <span className="text-xs">{isCollapsed ? "▶" : "▼"}</span>
          <span className="text-xs">📁</span>
          <span className="truncate font-medium">{folder.name}</span>
        </button>
        {!isCollapsed && (
          <ul>
            {folder.children.map((child) => (
              <FolderItem key={child.path} folder={child} depth={depth + 1} />
            ))}
            {folder.notes.map((note) => (
              <NoteItem key={note.id} note={note} depth={depth + 1} />
            ))}
          </ul>
        )}
      </li>
    );
  }

  return (
    <ul className="py-1">
      {rootNotes.map((note) => (
        <NoteItem key={note.id} note={note} />
      ))}
      {folders.map((folder) => (
        <FolderItem key={folder.path} folder={folder} />
      ))}
      {notes.length === 0 && (
        <li className="px-4 py-6 text-center text-sm text-[var(--color-text2)]">
          Sin notas todavía
        </li>
      )}
    </ul>
  );
}

export type { ContextMenuItem };
