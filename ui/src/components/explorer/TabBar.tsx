import React from 'react'
import { X } from 'lucide-react'
import { useAppStore } from '@/store/app'
import type { TabItem } from '@/lib/types'

const extColor: Record<string, string> = {
  note: '#7c3aed',
  epub: '#0891b2',
  pdf: '#dc2626',
  txt: '#d97706',
}

export default function TabBar() {
  const { tabs, activeTabId, closeTab, setActiveTab } = useAppStore()

  if (tabs.length === 0) return null

  return (
    <div
      className="tabs-scroll flex items-stretch flex-shrink-0 h-[35px]"
      style={{ background: 'var(--bg2)', borderBottom: '1px solid var(--border)' }}
    >
      {tabs.map((tab) => {
        const isActive = tab.id === activeTabId
        return (
          <div
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className="flex items-center gap-[7px] px-[14px] text-sm cursor-pointer relative border-r flex-shrink-0"
            style={{
              borderColor: 'var(--border)',
              color: isActive ? 'var(--text)' : 'var(--text3)',
              background: isActive ? 'var(--bg)' : 'transparent',
              minWidth: 0,
              maxWidth: 200,
            }}
          >
            {/* Active underline */}
            {isActive && (
              <div
                className="absolute bottom-0 left-0 right-0 h-[2px]"
                style={{ background: 'var(--indigo)' }}
              />
            )}

            {/* File type dot */}
            <span
              className="w-[10px] h-[10px] rounded-[2px] flex-shrink-0"
              style={{ background: extColor[tab.type] ?? '#666' }}
            />

            {/* Name */}
            <span className="truncate" style={{ maxWidth: 120 }}>{tab.name}</span>

            {/* Modified dot */}
            {tab.modified && (
              <span
                className="w-[6px] h-[6px] rounded-full flex-shrink-0"
                style={{ background: 'var(--orange)' }}
              />
            )}

            {/* Close button */}
            <button
              onClick={(e) => { e.stopPropagation(); closeTab(tab.id) }}
              className="flex-shrink-0 rounded opacity-40 hover:opacity-100 p-0.5"
              style={{ color: 'var(--text3)' }}
            >
              <X size={11} />
            </button>
          </div>
        )
      })}
    </div>
  )
}
