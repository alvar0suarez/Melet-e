import { NodeViewWrapper } from "@tiptap/react";
import type { NodeViewProps } from "@tiptap/react";
import { useAppStore } from "@/store/useAppStore";

export function WikiLinkNode({ node }: NodeViewProps) {
  const { notes, selectNote, createNote } = useAppStore();
  const title = node.attrs.title as string;
  const exists = notes.some((n) => n.title === title);

  async function handleClick() {
    if (exists) {
      const note = notes.find((n) => n.title === title)!;
      await selectNote(note.id);
    } else {
      if (confirm(`La nota "${title}" no existe. ¿Crearla ahora?`)) {
        const id = await createNote(title, "", "");
        await selectNote(id);
      }
    }
  }

  return (
    <NodeViewWrapper as="span" className="inline">
      <span
        onClick={handleClick}
        className={[
          "cursor-pointer font-medium underline-offset-2 hover:underline",
          exists
            ? "text-[var(--color-indigo)]"
            : "text-[var(--color-red)]",
        ].join(" ")}
      >
        [[{title}]]
      </span>
    </NodeViewWrapper>
  );
}
