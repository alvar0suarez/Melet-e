import React from 'react'
import { GitBranch, Zap, Shield } from 'lucide-react'
import { useAppStore } from '@/store/app'
import { useEditorStore } from '@/store/editor'

export default function StatusBar() {
  const { tabs, activeTabId, vaultPath, aiConfig } = useAppStore()
  const { dirtyNotes } = useEditorStore()
  const activeTab = tabs.find((t) => t.id === activeTabId)
  const vaultName = vaultPath ? vaultPath.split(/[\\/]/).pop() : 'No vault'

  return (
    <div
      className="flex items-center flex-shrink-0 h-[22px] gap-[14px] px-3 text-[10.5px]"
      style={{
        background: '#12161f',
        borderTop: '1px solid var(--border)',
        color: 'var(--text3)',
      }}
    >
      {/* Active file */}
      {activeTab && (
        <span style={{ color: 'var(--indigo)' }}>{activeTab.name}</span>
      )}

      {/* Vault */}
      <span className="flex items-center gap-1">
        <GitBranch size={11} strokeWidth={1.8} />
        {vaultName}
      </span>

      {/* Dirty notes indicator */}
      {dirtyNotes.size > 0 && (
        <span style={{ color: 'var(--orange)' }}>
          ● {dirtyNotes.size} unsaved
        </span>
      )}

      <span className="flex-1" />

      {/* AI provider */}
      {aiConfig && (
        <span className="flex items-center gap-1" style={{ color: 'var(--teal)' }}>
          <Zap size={11} strokeWidth={1.8} />
          {aiConfig.provider}/{aiConfig.model}
        </span>
      )}

      {/* Local only badge */}
      <span className="flex items-center gap-1" style={{ color: 'var(--green)' }}>
        <Shield size={11} strokeWidth={1.8} />
        100% Local
      </span>
    </div>
  )
}
