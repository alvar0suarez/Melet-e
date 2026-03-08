import React from 'react'
import { useAppStore } from '@/store/app'

export default function TitleBar() {
  const { tabs, activeTabId } = useAppStore()
  const activeTab = tabs.find((t) => t.id === activeTabId)
  const title = activeTab ? activeTab.name : 'Melete'

  return (
    <div
      className="flex items-center h-[38px] flex-shrink-0"
      style={{ background: '#1c2128', borderBottom: '1px solid var(--border)' }}
    >
      <div className="flex-1 text-center text-xs" style={{ color: 'var(--text3)', fontWeight: 500 }}>
        Melete — {title}
      </div>
    </div>
  )
}
