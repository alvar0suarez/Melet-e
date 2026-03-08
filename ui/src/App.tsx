import React, { useEffect, useState, useRef, useCallback } from 'react'
import {
  LayoutDashboard, BookOpen, Share2, Calendar, GitBranch, CreditCard, Settings, StickyNote
} from 'lucide-react'
import { getVault, setupVault, getAIConfig, getCollections } from '@/lib/api'
import { useAppStore } from '@/store/app'
import TitleBar from '@/components/layout/TitleBar'
import ActivityBar from '@/components/layout/ActivityBar'
import Sidebar from '@/components/layout/Sidebar'
import StatusBar from '@/components/layout/StatusBar'
import ExplorerView from '@/components/explorer/ExplorerView'
import LibraryView from '@/components/library/LibraryView'
import CalendarView from '@/components/calendar/CalendarView'
import SCView from '@/components/sourcecontrol/SCView'
import FlashcardsView from '@/components/flashcards/FlashcardsView'
import KeepView from '@/components/keep/KeepView'
import ToastContainer from '@/components/shared/Toast'
import GraphView from '@/components/graph/GraphView'
import AISettings from '@/components/shared/AISettings'
import type { Activity } from '@/lib/types'

const isMobile = () => window.innerWidth < 768

// ─── Vault Setup Screen ───────────────────────────────────────────────────

function VaultSetup({ onDone }: { onDone: () => void }) {
  const [path, setPath] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleConfirm = async () => {
    if (!path.trim()) return
    setLoading(true)
    setError('')
    try {
      const { ok } = await setupVault(path.trim())
      if (ok) {
        onDone()
      } else {
        setError('Could not create vault at that path. Check permissions.')
      }
    } catch (e) {
      setError('Server not reachable. Is main.py running?')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="fixed inset-0 flex items-center justify-center"
      style={{ background: '#06080d' }}
    >
      <div
        className="flex flex-col gap-5 p-8 rounded-2xl"
        style={{
          width: 420,
          background: 'var(--bg2)',
          border: '1px solid var(--border2)',
          boxShadow: '0 30px 80px rgba(0,0,0,0.8)',
        }}
      >
        {/* Logo */}
        <div className="text-center">
          <div
            className="text-3xl font-black tracking-tight mb-1"
            style={{
              background: 'linear-gradient(135deg, var(--indigo), var(--teal))',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            Melete
          </div>
          <div className="text-[10px] uppercase tracking-[3px]" style={{ color: 'var(--text3)' }}>
            Your Local PKM
          </div>
        </div>

        <p className="text-xs text-center leading-[1.7]" style={{ color: 'var(--text3)' }}>
          Choose a folder for your vault. Melete will create <code style={{ color: 'var(--teal)' }}>Files/</code>,{' '}
          <code style={{ color: 'var(--teal)' }}>Notas/</code>, <code style={{ color: 'var(--teal)' }}>Flashcards/</code>,{' '}
          and <code style={{ color: 'var(--teal)' }}>Plugins/</code> inside it.
        </p>

        <input
          value={path}
          onChange={(e) => setPath(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') handleConfirm() }}
          placeholder="/home/user/MyVault  or  C:\Users\User\MyVault"
          className="px-3 py-2.5 rounded-lg text-xs outline-none"
          style={{
            background: 'var(--bg3)',
            border: '1px solid var(--border)',
            color: 'var(--text)',
          }}
        />

        {error && (
          <p className="text-xs text-center" style={{ color: 'var(--danger)' }}>{error}</p>
        )}

        <button
          onClick={handleConfirm}
          disabled={loading || !path.trim()}
          className="py-2.5 rounded-lg text-sm font-bold transition-opacity"
          style={{
            background: 'linear-gradient(135deg, var(--indigo), var(--teal))',
            color: '#fff',
            opacity: loading || !path.trim() ? 0.5 : 1,
          }}
        >
          {loading ? 'Creating vault…' : 'Open Vault'}
        </button>
      </div>
    </div>
  )
}

// ─── Mobile Bottom Nav ────────────────────────────────────────────────────

const navItems: { id: Activity; icon: React.ReactNode; label: string }[] = [
  { id: 'explorer', icon: <LayoutDashboard size={20} strokeWidth={1.6} />, label: 'Explorer' },
  { id: 'library', icon: <BookOpen size={20} strokeWidth={1.6} />, label: 'Library' },
  { id: 'keep', icon: <StickyNote size={20} strokeWidth={1.6} />, label: 'Keep' },
  { id: 'calendar', icon: <Calendar size={20} strokeWidth={1.6} />, label: 'Calendar' },
  { id: 'settings', icon: <Settings size={20} strokeWidth={1.6} />, label: 'Settings' },
]

function MobileNav() {
  const { activity, setActivity } = useAppStore()
  return (
    <div
      className="flex items-center justify-around flex-shrink-0"
      style={{
        height: 54,
        background: 'rgba(22,27,34,0.97)',
        borderTop: '1px solid var(--border)',
        backdropFilter: 'blur(12px)',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
    >
      {navItems.map(({ id, icon, label }) => (
        <button
          key={id}
          onClick={() => setActivity(id)}
          className="flex flex-col items-center gap-[2px] px-3"
          style={{
            color: activity === id ? 'var(--indigo)' : 'var(--text3)',
            fontSize: 8,
            fontWeight: 600,
            letterSpacing: '0.5px',
            textTransform: 'uppercase',
          }}
        >
          {icon}
          {label}
        </button>
      ))}
    </div>
  )
}

// ─── Main App ─────────────────────────────────────────────────────────────

const SHOW_SIDEBAR_ACTIVITIES: Activity[] = ['explorer', 'library', 'graph']

export default function App() {
  const {
    activity, vaultReady, setVaultReady, setVaultPath, setAIConfig, setCollections,
    sidebarWidth, setSidebarWidth, sidebarVisible,
  } = useAppStore()
  const [showSetup, setShowSetup] = useState(false)
  const [mobile, setMobile] = useState(isMobile())
  const sidebarDragging = useRef(false)

  useEffect(() => {
    const check = () => setMobile(isMobile())
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  useEffect(() => {
    ;(async () => {
      try {
        const { path, valid } = await getVault()
        if (valid && path) {
          setVaultPath(path)
          setVaultReady(true)
          // Load AI config
          const cfg = await getAIConfig().catch(() => null)
          if (cfg) setAIConfig(cfg)
          const colls = await getCollections().catch(() => [])
          setCollections(colls)
        } else {
          setShowSetup(true)
        }
      } catch {
        setShowSetup(true)
      }
    })()
  }, [])

  const handleVaultReady = async () => {
    try {
      const { path } = await getVault()
      if (path) {
        setVaultPath(path)
        setVaultReady(true)
      }
      const cfg = await getAIConfig().catch(() => null)
      if (cfg) setAIConfig(cfg)
      const colls = await getCollections().catch(() => [])
      setCollections(colls)
    } catch {}
    setShowSetup(false)
  }

  // Sidebar resize drag
  const handleSidebarDrag = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    const startX = e.clientX
    const startW = sidebarWidth
    const onMove = (ev: MouseEvent) => {
      const newW = Math.min(400, Math.max(160, startW + (ev.clientX - startX)))
      setSidebarWidth(newW)
    }
    const onUp = () => {
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
    }
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
  }, [sidebarWidth])

  if (showSetup) return <VaultSetup onDone={handleVaultReady} />

  const showSidebar = sidebarVisible && SHOW_SIDEBAR_ACTIVITIES.includes(activity) && !mobile

  const renderView = () => {
    switch (activity) {
      case 'explorer': return <ExplorerView />
      case 'library': return <LibraryView />
      case 'calendar': return <CalendarView />
      case 'sourcecontrol': return <SCView />
      case 'flashcards': return <FlashcardsView />
      case 'keep': return <KeepView />
      case 'graph': return <GraphView />
      case 'settings': return <AISettings />
      default: return <ExplorerView />
    }
  }

  // Mobile layout
  if (mobile) {
    return (
      <div className="flex flex-col h-full overflow-hidden" style={{ background: 'var(--bg)' }}>
        <ToastContainer />
        <div className="flex-1 overflow-hidden">
          {renderView()}
        </div>
        <MobileNav />
      </div>
    )
  }

  // Desktop layout
  return (
    <div className="flex flex-col h-full overflow-hidden" style={{ background: 'var(--bg)' }}>
      <TitleBar />
      <ToastContainer />

      <div className="flex flex-1 overflow-hidden">
        {/* Activity Bar */}
        <ActivityBar />

        {/* Sidebar */}
        {showSidebar && (
          <>
            <div style={{ width: sidebarWidth, flexShrink: 0, overflow: 'hidden' }}>
              <div className="h-full">
                <Sidebar />
              </div>
            </div>
            {/* Sidebar resize handle */}
            <div className="resize-handle" onMouseDown={handleSidebarDrag} />
          </>
        )}

        {/* Main content */}
        <div className="flex-1 overflow-hidden min-w-0">
          {renderView()}
        </div>
      </div>

      <StatusBar />
    </div>
  )
}
