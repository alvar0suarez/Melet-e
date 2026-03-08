import React from 'react'
import { Link } from 'lucide-react'
import { useEditorStore } from '@/store/editor'
import { useAppStore } from '@/store/app'
import { getNote } from '@/lib/api'

interface Props {
  noteName: string
}

export default function BacklinksPanel({ noteName }: Props) {
  const { backlinks, setNoteContent } = useEditorStore()
  const { openTab } = useAppStore()
  const links = backlinks[noteName] ?? []

  const openNote = async (name: string) => {
    const { content } = await getNote(name)
    setNoteContent(name, content)
    openTab({ id: `note:${name}`, name: `${name}.md`, type: 'note' })
  }

  return (
    <div
      className="flex-shrink-0 overflow-hidden"
      style={{
        height: 110,
        borderTop: '1px solid var(--border)',
        background: 'var(--bg2)',
        padding: '8px 14px',
      }}
    >
      <div className="flex items-center gap-2 mb-[7px]">
        <span
          className="text-[10px] font-bold uppercase tracking-[1.2px]"
          style={{ color: 'var(--text3)' }}
        >
          Backlinks
        </span>
        <span
          className="px-[7px] py-[1px] rounded-[10px] text-[10px]"
          style={{
            background: 'var(--bg3)',
            border: '1px solid var(--border)',
            color: 'var(--text2)',
          }}
        >
          {links.length}
        </span>
      </div>

      {links.length === 0 ? (
        <div className="text-[11px]" style={{ color: 'var(--text3)' }}>
          No notes link here yet
        </div>
      ) : (
        <div className="flex flex-col gap-[2px]">
          {links.map((name) => (
            <div
              key={name}
              onClick={() => openNote(name)}
              className="flex items-center gap-[10px] px-2 py-[3px] rounded cursor-pointer text-[11px]"
              onMouseEnter={(e) => { ;(e.currentTarget as HTMLElement).style.background = 'var(--bg3)' }}
              onMouseLeave={(e) => { ;(e.currentTarget as HTMLElement).style.background = 'transparent' }}
            >
              <span style={{ color: 'var(--indigo)', minWidth: 110 }}>{name}.md</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
