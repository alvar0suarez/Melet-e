import React, { useState } from 'react'
import { Star, BookOpen } from 'lucide-react'
import { updateBookMeta } from '@/lib/api'
import type { DocMeta, DocStatus } from '@/lib/types'

interface Props {
  doc: DocMeta
  onClick: () => void
  onUpdate: () => void
}

const extColor: Record<string, string> = {
  pdf: '#dc2626',
  epub: '#0891b2',
  txt: '#d97706',
}

const statusColor: Record<DocStatus, string> = {
  unread: 'var(--text3)',
  reading: 'var(--indigo)',
  read: 'var(--green)',
  toread: 'var(--orange)',
}

const statusLabel: Record<DocStatus, string> = {
  unread: 'Unread',
  reading: 'Reading',
  read: 'Read',
  toread: 'To Read',
}

export default function BookCard({ doc, onClick, onUpdate }: Props) {
  const [hovered, setHovered] = useState(false)

  const toggleFavorite = async (e: React.MouseEvent) => {
    e.stopPropagation()
    await updateBookMeta(doc.path, { favorite: !doc.favorite })
    onUpdate()
  }

  const cycleStatus = async (e: React.MouseEvent) => {
    e.stopPropagation()
    const statuses: DocStatus[] = ['unread', 'toread', 'reading', 'read']
    const next = statuses[(statuses.indexOf(doc.status) + 1) % statuses.length]
    await updateBookMeta(doc.path, { status: next })
    onUpdate()
  }

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="flex flex-col rounded-lg overflow-hidden cursor-pointer transition-all"
      style={{
        background: 'var(--bg2)',
        border: `1px solid ${hovered ? 'var(--border2)' : 'var(--border)'}`,
        transform: hovered ? 'translateY(-2px)' : 'none',
        boxShadow: hovered ? '0 8px 24px rgba(0,0,0,0.4)' : 'none',
      }}
    >
      {/* Cover */}
      <div
        className="flex items-center justify-center"
        style={{
          height: 110,
          background: `linear-gradient(135deg, ${extColor[doc.ext] ?? '#444'}22, ${extColor[doc.ext] ?? '#444'}44)`,
          position: 'relative',
        }}
      >
        <span className="text-4xl font-bold" style={{ color: extColor[doc.ext] ?? '#666', opacity: 0.3 }}>
          {doc.ext.toUpperCase()}
        </span>
        <span
          className="absolute top-1 left-2 text-[9px] font-bold uppercase px-1.5 py-0.5 rounded"
          style={{ background: extColor[doc.ext] ?? '#666', color: '#fff' }}
        >
          {doc.ext}
        </span>
        {/* Favorite */}
        <button
          onClick={toggleFavorite}
          className="absolute top-1 right-2 p-1"
          style={{ color: doc.favorite ? 'var(--orange)' : 'rgba(255,255,255,0.3)' }}
        >
          <Star size={12} fill={doc.favorite ? 'currentColor' : 'none'} />
        </button>
      </div>

      {/* Info */}
      <div className="p-2 flex flex-col gap-1">
        <div className="text-xs font-medium truncate" style={{ color: 'var(--text)' }}>{doc.name}</div>
        {doc.author && (
          <div className="text-[10px] truncate" style={{ color: 'var(--text3)' }}>{doc.author}</div>
        )}

        {/* Status + progress */}
        <div className="flex items-center justify-between mt-1">
          <button
            onClick={cycleStatus}
            className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded"
            style={{
              color: statusColor[doc.status],
              background: `${statusColor[doc.status]}22`,
              border: `1px solid ${statusColor[doc.status]}44`,
            }}
          >
            {statusLabel[doc.status]}
          </button>
          {doc.progress > 0 && (
            <span className="text-[9px]" style={{ color: 'var(--text3)' }}>{doc.progress}%</span>
          )}
        </div>

        {/* Progress bar */}
        <div className="h-1 rounded-full overflow-hidden" style={{ background: 'var(--bg3)' }}>
          <div
            className="h-full rounded-full transition-all"
            style={{
              width: `${doc.progress}%`,
              background: doc.status === 'read'
                ? 'var(--green)'
                : doc.status === 'reading'
                ? 'var(--indigo)'
                : 'var(--border2)',
            }}
          />
        </div>
      </div>
    </div>
  )
}
