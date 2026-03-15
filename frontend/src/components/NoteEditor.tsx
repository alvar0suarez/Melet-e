import { useEffect, useRef, useState } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Markdown } from "tiptap-markdown";
import { useAppStore } from "@/store/useAppStore";
import { WikiLinkExtension } from "@/lib/WikiLinkExtension";

export function NoteEditor() {
  const { notes, activeNote, createNote, saveNote, deleteNote, backlinks, selectNote } =
    useAppStore();

  const [title, setTitle] = useState("");
  const [folder, setFolder] = useState("");
  const [saving, setSaving] = useState(false);
  const [sourceMode, setSourceMode] = useState(false);
  const [sourceText, setSourceText] = useState("");
  const [backlinksOpen, setBacklinksOpen] = useState(true);

  // Keep note titles fresh for suggestion without recreating the editor
  const noteTitlesRef = useRef<string[]>([]);
  noteTitlesRef.current = notes.map((n) => n.title);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Markdown.configure({ html: true }),
      WikiLinkExtension.configure({
        getNoteTitles: () => noteTitlesRef.current,
      }),
    ],
    editorProps: {
      attributes: {
        class: "note-prose",
      },
    },
    content: "",
  });

  // Sync editor when active note changes
  useEffect(() => {
    if (!editor) return;
    if (activeNote) {
      setTitle(activeNote.title);
      setFolder(activeNote.folder);
      editor.commands.setContent(activeNote.content);
      setSourceText(activeNote.content);
    } else {
      setTitle("");
      setFolder("");
      editor.commands.setContent("");
      setSourceText("");
    }
    setSourceMode(false);
  }, [activeNote, editor]);

  // Ctrl+Shift+P toggles source mode
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.ctrlKey && e.shiftKey && e.key === "P") {
        e.preventDefault();
        toggleSourceMode();
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  });

  function toggleSourceMode() {
    if (!editor) return;
    if (!sourceMode) {
      // Entering source mode: capture current markdown
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setSourceText((editor.storage as any).markdown.getMarkdown());
    } else {
      // Leaving source mode: push markdown back to editor
      editor.commands.setContent(sourceText);
    }
    setSourceMode((prev) => !prev);
  }

  function getContent(): string {
    if (!editor) return "";
    if (sourceMode) return sourceText;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (editor.storage as any).markdown.getMarkdown();
  }

  async function handleSave() {
    if (!title.trim()) return;
    setSaving(true);
    try {
      const content = getContent();
      if (activeNote) {
        await saveNote(activeNote.id, title.trim(), content, folder.trim());
      } else {
        const id = await createNote(title.trim(), content, folder.trim());
        await useAppStore.getState().selectNote(id);
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!activeNote) return;
    if (!confirm(`¿Eliminar "${activeNote.title}"?`)) return;
    await deleteNote(activeNote.id);
  }

  const isEmpty = !activeNote && !title;

  return (
    <main className="flex h-full flex-1 flex-col overflow-hidden">
      {isEmpty ? (
        <div className="flex flex-1 items-center justify-center text-[var(--color-text2)]">
          <p className="text-sm">Selecciona una nota o crea una nueva</p>
        </div>
      ) : (
        <>
          {/* Header bar */}
          <div className="flex flex-shrink-0 items-center gap-3 border-b border-[var(--color-bg3)] px-6 py-3">
            <input
              type="text"
              placeholder="Título"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="flex-1 bg-transparent text-lg font-semibold text-[var(--color-text)] placeholder-[var(--color-text2)] outline-none"
            />
            <input
              type="text"
              placeholder="carpeta/subcarpeta"
              value={folder}
              onChange={(e) => setFolder(e.target.value)}
              className="w-44 rounded border border-[var(--color-bg3)] bg-[var(--color-bg2)] px-2 py-1 text-xs text-[var(--color-text2)] outline-none focus:border-[var(--color-indigo)]"
            />
            <button
              onClick={toggleSourceMode}
              title="Ctrl+Shift+P"
              className={[
                "rounded px-3 py-1.5 text-xs font-medium transition-colors",
                sourceMode
                  ? "bg-[var(--color-teal)] text-[var(--color-bg)]"
                  : "bg-[var(--color-bg3)] text-[var(--color-text2)] hover:text-[var(--color-text)]",
              ].join(" ")}
            >
              {sourceMode ? "Editor" : "Fuente"}
            </button>
            <button
              onClick={handleSave}
              disabled={saving || !title.trim()}
              className="rounded bg-[var(--color-indigo)] px-4 py-1.5 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-40"
            >
              {saving ? "Guardando…" : "Guardar"}
            </button>
            {activeNote && (
              <button
                onClick={handleDelete}
                className="rounded bg-[var(--color-bg3)] px-4 py-1.5 text-sm font-medium text-[var(--color-red)] transition-colors hover:bg-[var(--color-red)] hover:text-white"
              >
                Eliminar
              </button>
            )}
          </div>

          {/* Editor area */}
          <div className="flex flex-1 flex-col overflow-hidden">
            {sourceMode ? (
              <textarea
                value={sourceText}
                onChange={(e) => setSourceText(e.target.value)}
                className="flex-1 resize-none bg-transparent px-8 py-6 font-mono text-sm leading-relaxed text-[var(--color-text)] outline-none"
                placeholder="Markdown…"
              />
            ) : (
              <div className="flex-1 overflow-y-auto px-8 py-6">
                <EditorContent editor={editor} />
              </div>
            )}

            {/* Backlinks panel */}
            {activeNote && (
              <div className="flex-shrink-0 border-t border-[var(--color-bg3)]">
                <button
                  onClick={() => setBacklinksOpen((v) => !v)}
                  className="flex w-full items-center gap-2 px-6 py-2 text-xs font-semibold uppercase tracking-wide text-[var(--color-text2)] hover:text-[var(--color-text)] transition-colors"
                >
                  <span>{backlinksOpen ? "▼" : "▶"}</span>
                  <span>
                    Referencias ({backlinks.length})
                  </span>
                </button>
                {backlinksOpen && backlinks.length > 0 && (
                  <ul className="flex flex-wrap gap-2 px-6 pb-3">
                    {backlinks.map((bl) => (
                      <li key={bl.id}>
                        <button
                          onClick={() => selectNote(bl.id)}
                          className="rounded bg-[var(--color-bg3)] px-2.5 py-1 text-xs text-[var(--color-indigo)] hover:underline transition-colors"
                        >
                          {bl.title}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
                {backlinksOpen && backlinks.length === 0 && (
                  <p className="px-6 pb-3 text-xs text-[var(--color-text2)]">
                    Ninguna nota enlaza aquí todavía.
                  </p>
                )}
              </div>
            )}
          </div>
        </>
      )}
    </main>
  );
}
