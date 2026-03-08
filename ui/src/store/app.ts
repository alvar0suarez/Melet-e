import { create } from 'zustand'
import type { Activity, TabItem, AIConfig } from '@/lib/types'

interface AppState {
  // Layout
  activity: Activity
  setActivity: (a: Activity) => void
  sidebarWidth: number
  setSidebarWidth: (w: number) => void
  sidebarVisible: boolean
  toggleSidebar: () => void

  // Vault
  vaultPath: string | null
  setVaultPath: (p: string | null) => void
  vaultReady: boolean
  setVaultReady: (r: boolean) => void

  // Tabs
  tabs: TabItem[]
  activeTabId: string | null
  openTab: (tab: TabItem) => void
  closeTab: (id: string) => void
  setActiveTab: (id: string) => void
  markTabModified: (id: string, modified: boolean) => void

  // AI config
  aiConfig: AIConfig | null
  setAIConfig: (c: AIConfig) => void

  // Collections
  collections: string[]
  setCollections: (c: string[]) => void

  // Search
  globalSearch: string
  setGlobalSearch: (q: string) => void
}

export const useAppStore = create<AppState>((set, get) => ({
  activity: 'explorer',
  setActivity: (activity) => set({ activity }),

  sidebarWidth: 248,
  setSidebarWidth: (sidebarWidth) => set({ sidebarWidth }),
  sidebarVisible: true,
  toggleSidebar: () => set((s) => ({ sidebarVisible: !s.sidebarVisible })),

  vaultPath: null,
  setVaultPath: (vaultPath) => set({ vaultPath }),
  vaultReady: false,
  setVaultReady: (vaultReady) => set({ vaultReady }),

  tabs: [],
  activeTabId: null,
  openTab: (tab) => {
    const { tabs } = get()
    const existing = tabs.find((t) => t.id === tab.id)
    if (!existing) {
      set({ tabs: [...tabs, tab], activeTabId: tab.id })
    } else {
      set({ activeTabId: tab.id })
    }
  },
  closeTab: (id) => {
    const { tabs, activeTabId } = get()
    const idx = tabs.findIndex((t) => t.id === id)
    const newTabs = tabs.filter((t) => t.id !== id)
    let newActive = activeTabId
    if (activeTabId === id) {
      newActive = newTabs[Math.min(idx, newTabs.length - 1)]?.id ?? null
    }
    set({ tabs: newTabs, activeTabId: newActive })
  },
  setActiveTab: (activeTabId) => set({ activeTabId }),
  markTabModified: (id, modified) =>
    set((s) => ({
      tabs: s.tabs.map((t) => (t.id === id ? { ...t, modified } : t)),
    })),

  aiConfig: null,
  setAIConfig: (aiConfig) => set({ aiConfig }),

  collections: [],
  setCollections: (collections) => set({ collections }),

  globalSearch: '',
  setGlobalSearch: (globalSearch) => set({ globalSearch }),
}))
