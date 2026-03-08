import React from 'react'
import {
  LayoutDashboard, Share2, BookOpen, Calendar, GitBranch,
  CreditCard, Settings, StickyNote, Bookmark
} from 'lucide-react'
import { useAppStore } from '@/store/app'
import type { Activity } from '@/lib/types'

const items: { id: Activity; icon: React.ReactNode; label: string }[] = [
  { id: 'explorer', icon: <LayoutDashboard size={18} strokeWidth={1.6} />, label: 'Explorer' },
  { id: 'library', icon: <BookOpen size={18} strokeWidth={1.6} />, label: 'Biblioteca' },
  { id: 'bookmarks', icon: <Bookmark size={18} strokeWidth={1.6} />, label: 'Marcadores' },
  { id: 'keep', icon: <StickyNote size={18} strokeWidth={1.6} />, label: 'Keep' },
  { id: 'graph', icon: <Share2 size={18} strokeWidth={1.6} />, label: 'Graph' },
  { id: 'calendar', icon: <Calendar size={18} strokeWidth={1.6} />, label: 'Calendar' },
  { id: 'sourcecontrol', icon: <GitBranch size={18} strokeWidth={1.6} />, label: 'Source Control' },
  { id: 'flashcards', icon: <CreditCard size={18} strokeWidth={1.6} />, label: 'Flashcards' },
]

export default function ActivityBar() {
  const { activity, setActivity } = useAppStore()

  return (
    <div
      className="flex flex-col items-center flex-shrink-0 py-[10px] gap-1"
      style={{
        width: 48,
        background: '#0d1117',
        borderRight: '1px solid var(--border)',
      }}
    >
      {items.map(({ id, icon, label }) => (
        <button
          key={id}
          title={label}
          onClick={() => setActivity(id)}
          className="w-9 h-9 rounded-lg flex items-center justify-center transition-colors relative"
          style={{
            color: activity === id ? 'var(--indigo)' : 'var(--text3)',
            background: activity === id ? 'var(--indigo-dim)' : 'transparent',
          }}
          onMouseEnter={(e) => {
            if (activity !== id) {
              ;(e.currentTarget as HTMLElement).style.color = 'var(--text2)'
              ;(e.currentTarget as HTMLElement).style.background = 'var(--bg3)'
            }
          }}
          onMouseLeave={(e) => {
            if (activity !== id) {
              ;(e.currentTarget as HTMLElement).style.color = 'var(--text3)'
              ;(e.currentTarget as HTMLElement).style.background = 'transparent'
            }
          }}
        >
          {icon}
        </button>
      ))}

      <div className="flex-1" />

      {/* Settings */}
      <button
        title="Settings"
        onClick={() => setActivity('settings')}
        className="w-9 h-9 rounded-lg flex items-center justify-center transition-colors"
        style={{
          color: activity === 'settings' ? 'var(--indigo)' : 'var(--text3)',
          background: activity === 'settings' ? 'var(--indigo-dim)' : 'transparent',
        }}
        onMouseEnter={(e) => {
          if (activity !== 'settings') {
            ;(e.currentTarget as HTMLElement).style.color = 'var(--text2)'
            ;(e.currentTarget as HTMLElement).style.background = 'var(--bg3)'
          }
        }}
        onMouseLeave={(e) => {
          if (activity !== 'settings') {
            ;(e.currentTarget as HTMLElement).style.color = 'var(--text3)'
            ;(e.currentTarget as HTMLElement).style.background = 'transparent'
          }
        }}
      >
        <Settings size={18} strokeWidth={1.6} />
      </button>
    </div>
  )
}
