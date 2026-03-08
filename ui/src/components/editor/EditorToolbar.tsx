import React from 'react'
import { Bold, Italic, Strikethrough, Heading1, Heading2, Quote, Code, Link, Save, Trash2, Minus } from 'lucide-react'
import { useAppStore } from '@/store/app'
import { saveNote, deleteNote } from '@/lib/api'
import { useEditorStore } from '@/store/editor'

interface Props {
  noteName: string
  onDelete?: () => void
}

const ToolBtn = ({
  icon, title, onClick,
}: {
  icon: React.ReactNode; title: string; onClick: () => void
}) => (
  <button
    title={title}
    onClick={onClick}
    className="w-7 h-7 rounded flex items-center justify-center transition-colors"
    style={{ color: 'var(--text3)' }}
    onMouseEnter={(e) => { ;(e.currentTarget as HTMLElement).style.color = 'var(--text)'; ;(e.currentTarget as HTMLElement).style.background = 'var(--bg3)' }}
    onMouseLeave={(e) => { ;(e.currentTarget as HTMLElement).style.color = 'var(--text3)'; ;(e.currentTarget as HTMLElement).style.background = 'transparent' }}
  >
    {icon}
  </button>
)

const Sep = () => (
  <div className="w-px h-4 mx-1" style={{ background: 'var(--border)' }} />
)

export default function EditorToolbar({ noteName, onDelete }: Props) {
  const { getNoteContent, markClean } = useEditorStore()
  const { markTabModified } = useAppStore()

  const handleSave = async () => {
    const content = getNoteContent(noteName)
    await saveNote(noteName, content, true, 'Manual save')
    markClean(noteName)
    markTabModified(`note:${noteName}`, false)
  }

  const handleDelete = async () => {
    if (!confirm(`Delete "${noteName}"?`)) return
    await deleteNote(noteName)
    onDelete?.()
  }

  return (
    <div
      className="flex items-center gap-[2px] px-2 flex-shrink-0 h-[26px]"
      style={{ background: 'var(--bg2)', borderBottom: '1px solid var(--border)' }}
    >
      <ToolBtn icon={<Bold size={12} />} title="Bold (Ctrl+B)" onClick={() => {}} />
      <ToolBtn icon={<Italic size={12} />} title="Italic (Ctrl+I)" onClick={() => {}} />
      <ToolBtn icon={<Strikethrough size={12} />} title="Strikethrough" onClick={() => {}} />
      <Sep />
      <ToolBtn icon={<Heading1 size={12} />} title="H1" onClick={() => {}} />
      <ToolBtn icon={<Heading2 size={12} />} title="H2" onClick={() => {}} />
      <Sep />
      <ToolBtn icon={<Quote size={12} />} title="Blockquote" onClick={() => {}} />
      <ToolBtn icon={<Code size={12} />} title="Code" onClick={() => {}} />
      <ToolBtn icon={<Link size={12} />} title="Wikilink (Ctrl+K)" onClick={() => {}} />
      <ToolBtn icon={<Minus size={12} />} title="Horizontal rule" onClick={() => {}} />
      <Sep />
      <ToolBtn
        icon={<Save size={12} />}
        title="Save snapshot (Ctrl+S)"
        onClick={handleSave}
      />
      <ToolBtn
        icon={<Trash2 size={12} />}
        title="Delete note"
        onClick={handleDelete}
      />
    </div>
  )
}
