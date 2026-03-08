import React, { useEffect, useState, useCallback } from 'react'
import { create } from 'zustand'
import { X, CheckCircle, Info, AlertTriangle } from 'lucide-react'

export type ToastType = 'info' | 'success' | 'warning'

interface Toast {
  id: number
  message: string
  type: ToastType
  duration?: number
}

interface ToastStore {
  toasts: Toast[]
  add: (message: string, type?: ToastType, duration?: number) => void
  remove: (id: number) => void
}

let _id = 0

export const useToastStore = create<ToastStore>((set) => ({
  toasts: [],
  add: (message, type = 'info', duration = 4000) => {
    const id = ++_id
    set((s) => ({ toasts: [...s.toasts, { id, message, type, duration }] }))
    if (duration > 0) {
      setTimeout(() => {
        set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }))
      }, duration)
    }
  },
  remove: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}))

export const toast = {
  info: (msg: string, dur?: number) => useToastStore.getState().add(msg, 'info', dur),
  success: (msg: string, dur?: number) => useToastStore.getState().add(msg, 'success', dur),
  warning: (msg: string, dur?: number) => useToastStore.getState().add(msg, 'warning', dur),
}

const icons = {
  info: <Info size={14} />,
  success: <CheckCircle size={14} />,
  warning: <AlertTriangle size={14} />,
}

const colors = {
  info: { bg: 'rgba(129,140,248,0.12)', border: 'rgba(129,140,248,0.3)', color: 'var(--indigo)' },
  success: { bg: 'rgba(63,185,80,0.12)', border: 'rgba(63,185,80,0.3)', color: 'var(--green)' },
  warning: { bg: 'rgba(227,179,65,0.15)', border: 'rgba(227,179,65,0.35)', color: 'var(--orange)' },
}

export default function ToastContainer() {
  const { toasts, remove } = useToastStore()

  return (
    <div
      className="fixed bottom-8 right-4 z-[100] flex flex-col gap-2 pointer-events-none"
      style={{ maxWidth: 320 }}
    >
      {toasts.map((t) => {
        const c = colors[t.type]
        return (
          <div
            key={t.id}
            className="flex items-start gap-2 px-3 py-2.5 rounded-lg text-xs pointer-events-auto"
            style={{
              background: c.bg,
              border: `1px solid ${c.border}`,
              color: c.color,
              boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
              animation: 'slideIn 0.2s ease',
            }}
          >
            <span className="mt-0.5 flex-shrink-0">{icons[t.type]}</span>
            <span className="flex-1 leading-[1.5]">{t.message}</span>
            <button
              onClick={() => remove(t.id)}
              className="opacity-50 hover:opacity-100 flex-shrink-0"
            >
              <X size={12} />
            </button>
          </div>
        )
      })}
      <style>{`
        @keyframes slideIn {
          from { opacity: 0; transform: translateX(20px); }
          to   { opacity: 1; transform: translateX(0); }
        }
      `}</style>
    </div>
  )
}
