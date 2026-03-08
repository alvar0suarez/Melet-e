import React from 'react'
import { Search } from 'lucide-react'
import { useAppStore } from '@/store/app'

interface Props {
  onOpenSearch?: () => void
}

export default function TitleBar({ onOpenSearch }: Props) {
  const { tabs, activeTabId } = useAppStore()
  const activeTab = tabs.find((t) => t.id === activeTabId)
  const title = activeTab ? activeTab.name : 'Melete'

  return (
    <div
      className="flex items-center h-[38px] flex-shrink-0 px-3"
      style={{ background: '#1c2128', borderBottom: '1px solid var(--border)' }}
    >
      <div className="flex-1 text-center text-xs" style={{ color: 'var(--text3)', fontWeight: 500 }}>
        Melete — {title}
      </div>
      {onOpenSearch && (
        <button
          onClick={onOpenSearch}
          title="Buscar (Ctrl+K)"
          className="flex items-center gap-1.5 px-2 py-1 rounded text-xs"
          style={{ color: 'var(--text3)', background: 'var(--bg3)', border: '1px solid var(--border)' }}
        >
          <Search size={11} />
          <span>Buscar</span>
          <span style={{ fontSize: 9, color: 'var(--text3)', marginLeft: 4 }}>Ctrl K</span>
        </button>
      )}
    </div>
  )
}
