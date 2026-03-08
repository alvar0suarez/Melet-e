import React, { useEffect, useState } from 'react'
import { GitBranch, Save, Trash2, Archive, RefreshCw, FileText, CreditCard, BookOpen } from 'lucide-react'
import { getChanges, getDiff, saveSnapshot, getVersions, createBackup, snapshotAll, revertFile } from '@/lib/api'
import type { ChangedFile, DiffLine, Version } from '@/lib/types'
import CommitTimeline from './CommitTimeline'
import DiffSplitView from './DiffSplitView'

export default function SCView() {
  const [changes, setChanges] = useState<ChangedFile[]>([])
  const [selected, setSelected] = useState<string | null>(null)
  const [diff, setDiff] = useState<DiffLine[]>([])
  const [versions, setVersions] = useState<Version[]>([])
  const [snapshotMsg, setSnapshotMsg] = useState('')
  const [loading, setLoading] = useState(false)
  const [backupPath, setBackupPath] = useState<string | null>(null)

  const load = async () => {
    setLoading(true)
    try {
      const c = await getChanges()
      setChanges(c)
      if (c.length > 0 && !selected) {
        selectFile(c[0].name)
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const selectFile = async (name: string) => {
    setSelected(name)
    const [d, v] = await Promise.all([getDiff(name), getVersions(name)])
    setDiff(d)
    setVersions(v)
  }

  const handleSnapshot = async () => {
    if (!selected) return
    await saveSnapshot(selected, snapshotMsg)
    setSnapshotMsg('')
    await selectFile(selected)
    load()
  }

  const handleBackup = async () => {
    const { path } = await createBackup()
    setBackupPath(path)
    setTimeout(() => setBackupPath(null), 5000)
  }

  const handleSnapshotAll = async () => {
    setLoading(true)
    await snapshotAll()
    await load()
  }

  const handleRevert = async (name: string) => {
    if (!confirm(`Descartar cambios en "${name}"? Se restaurará la última versión guardada (o se eliminará si no hay historial).`)) return
    await revertFile(name)
    if (selected === name) {
      setSelected(null)
      setDiff([])
      setVersions([])
    }
    await load()
  }

  return (
    <div className="flex flex-col h-full overflow-hidden" style={{ background: 'var(--bg)' }}>
      {/* Header */}
      <div
        className="flex items-center gap-3 px-4 py-2 flex-shrink-0"
        style={{ background: 'var(--bg2)', borderBottom: '1px solid var(--border)' }}
      >
        <GitBranch size={14} style={{ color: 'var(--indigo)' }} />
        <span className="text-sm font-bold" style={{ color: 'var(--text)' }}>Source Control</span>
        <span
          className="text-[9px] font-bold px-2 py-0.5 rounded-full"
          style={{ background: 'rgba(63,185,80,.12)', color: 'var(--green)', border: '1px solid rgba(63,185,80,.25)' }}
        >
          LOCAL
        </span>

        <span className="flex-1" />

        {/* Snapshot input */}
        <input
          value={snapshotMsg}
          onChange={(e) => setSnapshotMsg(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') handleSnapshot() }}
          placeholder="Snapshot message…"
          className="px-2 py-1 rounded text-xs"
          style={{ background: 'var(--bg3)', border: '1px solid var(--border)', color: 'var(--text2)', width: 180 }}
        />
        <button
          onClick={handleSnapshot}
          disabled={!selected}
          className="flex items-center gap-1 px-2 py-1 rounded text-xs"
          style={{ background: '#4c1d95', color: '#c4b5fd', border: '1px solid rgba(124,58,237,.4)' }}
        >
          <Save size={11} /> Save Snapshot
        </button>
        <button
          onClick={handleSnapshotAll}
          disabled={changes.length === 0}
          className="flex items-center gap-1 px-2 py-1 rounded text-xs disabled:opacity-40"
          style={{ background: 'rgba(63,185,80,.12)', color: 'var(--green)', border: '1px solid rgba(63,185,80,.25)' }}
        >
          <Save size={11} /> Guardar todo
        </button>
        <button
          onClick={handleBackup}
          className="flex items-center gap-1 px-2 py-1 rounded text-xs"
          style={{ background: 'var(--teal-dim)', color: 'var(--teal)', border: '1px solid rgba(45,212,191,.25)' }}
        >
          <Archive size={11} /> Backup ZIP
        </button>
        <button
          onClick={load}
          className="p-1 rounded"
          style={{ color: 'var(--text3)' }}
        >
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {backupPath && (
        <div
          className="px-4 py-1 text-xs flex-shrink-0"
          style={{ background: 'rgba(63,185,80,0.1)', color: 'var(--green)', borderBottom: '1px solid var(--border)' }}
        >
          Backup saved: {backupPath}
        </div>
      )}

      <div className="flex flex-1 overflow-hidden">
        {/* File changes list */}
        <div
          className="flex flex-col flex-shrink-0 overflow-hidden"
          style={{ width: 256, borderRight: '1px solid var(--border)' }}
        >
          <div
            className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider flex items-center justify-between"
            style={{ color: 'var(--text3)', borderBottom: '1px solid var(--border)', background: 'var(--bg2)' }}
          >
            <span>Changed Files</span>
            <span
              className="px-1.5 py-0.5 rounded text-[9px]"
              style={{ background: 'var(--bg3)', color: 'var(--text2)' }}
            >
              {changes.length}
            </span>
          </div>
          <div className="flex-1 overflow-y-auto py-1">
            {changes.length === 0 ? (
              <div className="text-center text-xs mt-4" style={{ color: 'var(--text3)' }}>
                No changes
              </div>
            ) : (
              changes.map((f) => {
                const isNote = !f.kind || f.kind === 'note'
                const KindIcon = f.kind === 'flashcard' ? CreditCard : f.kind === 'book' ? BookOpen : FileText
                const displayName = isNote ? `${f.name}.md` : f.name
                return (
                <div
                  key={f.name}
                  onClick={() => isNote ? selectFile(f.name) : undefined}
                  className="group flex items-center gap-2 px-3 py-[5px] mx-1.5 rounded text-xs"
                  style={{
                    cursor: isNote ? 'pointer' : 'default',
                    color: selected === f.name ? 'var(--text)' : 'var(--text2)',
                    background: selected === f.name ? 'rgba(129,140,248,.14)' : 'transparent',
                  }}
                  onMouseEnter={(e) => { if (selected !== f.name) (e.currentTarget as HTMLElement).style.background = 'var(--bg3)' }}
                  onMouseLeave={(e) => { if (selected !== f.name) (e.currentTarget as HTMLElement).style.background = 'transparent' }}
                >
                  <span
                    className="w-[15px] h-[15px] rounded flex items-center justify-center text-[9px] font-bold flex-shrink-0"
                    style={{
                      background: f.status === 'M' ? 'rgba(227,179,65,.18)' : 'rgba(63,185,80,.18)',
                      color: f.status === 'M' ? 'var(--orange)' : 'var(--green)',
                    }}
                  >
                    {f.status}
                  </span>
                  <KindIcon size={10} style={{ color: 'var(--text3)', flexShrink: 0 }} />
                  <span className="truncate flex-1">{displayName}</span>
                  {isNote && (
                    <button
                      onClick={(e) => { e.stopPropagation(); handleRevert(f.name) }}
                      title="Descartar cambios"
                      className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded"
                      style={{ color: 'var(--red)', flexShrink: 0 }}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(248,81,73,.15)' }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent' }}
                    >
                      <Trash2 size={10} />
                    </button>
                  )}
                </div>
                )
              })
            )}
          </div>
        </div>

        {/* Diff view */}
        <div className="flex flex-col flex-1 overflow-hidden">
          {selected ? (
            <>
              <div
                className="flex items-center gap-3 px-4 py-1.5 text-xs flex-shrink-0"
                style={{ background: 'var(--bg2)', borderBottom: '1px solid var(--border)', color: 'var(--text3)' }}
              >
                <strong style={{ color: 'var(--text2)' }}>{selected}</strong>
                <span>diff view</span>
              </div>
              <DiffSplitView diff={diff} />
            </>
          ) : (
            <div className="flex items-center justify-center flex-1 text-sm" style={{ color: 'var(--text3)' }}>
              Select a file to view diff
            </div>
          )}
        </div>
      </div>

      {/* Timeline */}
      {selected && versions.length > 0 && (
        <CommitTimeline versions={versions} stem={selected} onRestore={() => selectFile(selected!)} />
      )}
    </div>
  )
}
