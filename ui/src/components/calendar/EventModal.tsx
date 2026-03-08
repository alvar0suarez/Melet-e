import React, { useState } from 'react'
import { X } from 'lucide-react'
import { addEvent } from '@/lib/api'
import { useCalendarStore } from '@/store/calendar'

const COLORS = ['#818cf8', '#2dd4bf', '#3fb950', '#f85149', '#e3b341', '#bc8cff']

export default function EventModal() {
  const { closeEventModal, eventModalDate, eventModalStartH, eventModalEndH, addEvent: addLocalEvent } = useCalendarStore()
  const [title, setTitle] = useState('')
  const today = new Date(); const todayStr = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`
  const [date, setDate] = useState(eventModalDate ?? todayStr)
  const [startH, setStartH] = useState(eventModalStartH ?? 9)
  const [endH, setEndH] = useState(eventModalEndH ?? 10)
  const [color, setColor] = useState(COLORS[0])
  const [notes, setNotes] = useState('')
  const [recurring, setRecurring] = useState<'none' | 'daily' | 'weekly' | 'monthly'>('none')
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    if (!title.trim()) return
    setSaving(true)
    try {
      const ev = await addEvent({ title, date, start_h: startH, end_h: endH, color, notes, recurring })
      addLocalEvent(ev)
      closeEventModal()
    } finally {
      setSaving(false)
    }
  }

  const inputStyle = {
    background: 'var(--bg3)',
    border: '1px solid var(--border)',
    borderRadius: 6,
    color: 'var(--text)',
    padding: '6px 10px',
    fontSize: 12,
    outline: 'none',
    width: '100%',
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.7)' }}
      onClick={closeEventModal}
    >
      <div
        className="relative flex flex-col gap-4 p-5 rounded-xl"
        style={{
          width: 340,
          background: 'var(--bg2)',
          border: '1px solid var(--border2)',
          boxShadow: '0 20px 60px rgba(0,0,0,0.8)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={closeEventModal}
          className="absolute top-3 right-3"
          style={{ color: 'var(--text3)' }}
        >
          <X size={16} />
        </button>

        <h3 className="text-sm font-bold" style={{ color: 'var(--text)' }}>New Event</h3>

        <input
          style={inputStyle}
          placeholder="Event title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          autoFocus
        />

        <input
          type="date"
          style={{ ...inputStyle, colorScheme: 'dark' }}
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />

        <div className="flex gap-2">
          <div className="flex-1">
            <label className="text-[10px] mb-1 block" style={{ color: 'var(--text3)' }}>Start</label>
            <select style={{ ...inputStyle, padding: '6px 8px' }} value={startH} onChange={(e) => setStartH(Number(e.target.value))}>
              {Array.from({ length: 24 }).map((_, i) => (
                <option key={i} value={i}>{i.toString().padStart(2, '0')}:00</option>
              ))}
            </select>
          </div>
          <div className="flex-1">
            <label className="text-[10px] mb-1 block" style={{ color: 'var(--text3)' }}>End</label>
            <select style={{ ...inputStyle, padding: '6px 8px' }} value={endH} onChange={(e) => setEndH(Number(e.target.value))}>
              {Array.from({ length: 24 }).map((_, i) => (
                <option key={i} value={i}>{i.toString().padStart(2, '0')}:00</option>
              ))}
            </select>
          </div>
        </div>

        {/* Color picker */}
        <div>
          <label className="text-[10px] mb-2 block" style={{ color: 'var(--text3)' }}>Color</label>
          <div className="flex gap-2">
            {COLORS.map((c) => (
              <button
                key={c}
                onClick={() => setColor(c)}
                className="w-6 h-6 rounded-full transition-transform"
                style={{
                  background: c,
                  transform: color === c ? 'scale(1.3)' : 'scale(1)',
                  boxShadow: color === c ? `0 0 0 2px var(--bg2), 0 0 0 4px ${c}` : 'none',
                }}
              />
            ))}
          </div>
        </div>

        {/* Recurrence */}
        <div>
          <label className="text-[10px] mb-1 block" style={{ color: 'var(--text3)' }}>Recurrence</label>
          <select
            style={{ ...inputStyle, padding: '6px 8px' }}
            value={recurring}
            onChange={(e) => setRecurring(e.target.value as any)}
          >
            <option value="none">None</option>
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
          </select>
        </div>

        <textarea
          style={{ ...inputStyle, resize: 'none', height: 60 }}
          placeholder="Notes (optional)"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />

        <div className="flex gap-2">
          <button
            onClick={closeEventModal}
            className="flex-1 py-2 rounded-lg text-xs"
            style={{ background: 'var(--bg3)', color: 'var(--text2)', border: '1px solid var(--border)' }}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !title.trim()}
            className="flex-1 py-2 rounded-lg text-xs font-bold"
            style={{ background: color + '22', color, border: `1px solid ${color}44` }}
          >
            {saving ? 'Saving…' : 'Create Event'}
          </button>
        </div>
      </div>
    </div>
  )
}
