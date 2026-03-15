import { useEffect } from "react";
import { useAppStore } from "@/store/useAppStore";
import { NotesSidebar } from "@/components/NotesSidebar";
import { NoteEditor } from "@/components/NoteEditor";

function App() {
  const fetchNotes = useAppStore((s) => s.fetchNotes);

  useEffect(() => {
    fetchNotes();
  }, [fetchNotes]);

  return (
    <div className="flex h-screen overflow-hidden bg-[var(--color-bg)] text-[var(--color-text)]">
      <NotesSidebar />
      <NoteEditor />
    </div>
  );
}

export default App;
