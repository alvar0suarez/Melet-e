import React, { useEffect, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react'
import { useCalendarStore } from '@/store/calendar'
import { getEvents, deleteEvent } from '@/lib/api'
import PomodoroTimer from './PomodoroTimer'
import EventModal from './EventModal'
import type { CalEvent } from '@/lib/types'

const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December']
const HOURS = Array.from({ length: 24 }, (_, i) => i)

// Timezone-safe: uses local date parts, not UTC
function toDateStr(d: Date) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

type DragState = { date: string; startH: number; curH: number }

export default function CalendarView() {
  const {
    events, setEvents, removeEvent, currentDate, setCurrentDate,
    view, setView, selectedDate, setSelectedDate,
    eventModalOpen, openEventModal,
  } = useCalendarStore()
  const [weeks, setWeeks] = useState<(string | null)[][]>([])
  const [drag, setDrag] = useState<DragState | null>(null)

  useEffect(() => {
    getEvents().then(setEvents)
  }, [])

  // Drag-to-create: release opens modal with computed hours
  useEffect(() => {
    const onUp = () => {
      if (!drag) return
      const startH = Math.min(drag.startH, drag.curH)
      const endH = Math.min(24, Math.max(drag.startH, drag.curH) + 1)
      if (endH > startH) openEventModal(drag.date, startH, endH)
      setDrag(null)
    }
    document.addEventListener('mouseup', onUp)
    return () => document.removeEventListener('mouseup', onUp)
  }, [drag])

  useEffect(() => {
    buildMonthGrid(currentDate.getFullYear(), currentDate.getMonth() + 1)
    // auto-select today on day view
    if (view === 'day' && !selectedDate) setSelectedDate(toDateStr(new Date()))
  }, [currentDate, view])

  const buildMonthGrid = (year: number, month: number) => {
    const firstDay = new Date(year, month - 1, 1)
    const startDow = (firstDay.getDay() + 6) % 7
    const grid: (string | null)[][] = []
    const cur = new Date(firstDay)
    cur.setDate(cur.getDate() - startDow)
    for (let w = 0; w < 6; w++) {
      const week: (string | null)[] = []
      for (let d = 0; d < 7; d++) {
        week.push(cur.getMonth() + 1 === month ? toDateStr(new Date(cur)) : null)
        cur.setDate(cur.getDate() + 1)
      }
      grid.push(week)
      if (week.every((d) => d === null)) break
    }
    setWeeks(grid)
  }

  const today = toDateStr(new Date())
  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()

  const nav = (dir: number) => {
    const d = new Date(currentDate)
    if (view === 'month') d.setMonth(d.getMonth() + dir)
    else if (view === 'week') d.setDate(d.getDate() + dir * 7)
    else d.setDate(d.getDate() + dir)
    setCurrentDate(d)
    if (view === 'day') setSelectedDate(toDateStr(d))
  }

  const eventsForDate = (dateStr: string) => events.filter((e) => e.date === dateStr)

  // Week start (Monday)
  const getWeekDates = () => {
    const d = new Date(currentDate)
    const dow = (d.getDay() + 6) % 7
    d.setDate(d.getDate() - dow)
    return Array.from({ length: 7 }, (_, i) => {
      const dd = new Date(d)
      dd.setDate(dd.getDate() + i)
      return toDateStr(dd)
    })
  }

  const dayViewDate = view === 'day' ? (selectedDate ?? toDateStr(currentDate)) : toDateStr(currentDate)

  const navLabel = view === 'month'
    ? `${MONTH_NAMES[month]} ${year}`
    : view === 'week'
    ? `Week of ${getWeekDates()[0]}`
    : dayViewDate

  const handleDeleteEvent = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!confirm('Delete this event?')) return
    await deleteEvent(id)
    removeEvent(id)
  }

  return (
    <div className="flex h-full overflow-hidden" style={{ background: 'var(--bg)' }}>
      {/* Main */}
      <div className="flex flex-col flex-1 overflow-hidden">
        {/* Toolbar */}
        <div className="flex items-center gap-2 px-4 py-2 flex-shrink-0"
          style={{ background: 'var(--bg2)', borderBottom: '1px solid var(--border)' }}>
          <button onClick={() => nav(-1)} className="p-1 rounded" style={{ color: 'var(--text3)' }}>
            <ChevronLeft size={16} />
          </button>
          <h2 className="text-sm font-bold flex-1 text-center" style={{ color: 'var(--text)' }}>
            {navLabel}
          </h2>
          <button onClick={() => nav(1)} className="p-1 rounded" style={{ color: 'var(--text3)' }}>
            <ChevronRight size={16} />
          </button>
          <div className="flex gap-1">
            {(['month', 'week', 'day'] as const).map((v) => (
              <button key={v} onClick={() => setView(v)} className="px-2 py-1 rounded text-[10px] capitalize"
                style={{
                  background: view === v ? 'var(--indigo-dim)' : 'var(--bg3)',
                  color: view === v ? 'var(--indigo)' : 'var(--text3)',
                  border: `1px solid ${view === v ? 'rgba(129,140,248,.25)' : 'var(--border)'}`,
                }}>
                {v}
              </button>
            ))}
          </div>
          <button onClick={() => openEventModal(selectedDate ?? today)}
            className="flex items-center gap-1 px-2 py-1 rounded text-xs"
            style={{ background: 'var(--indigo-dim)', color: 'var(--indigo)', border: '1px solid rgba(129,140,248,.25)' }}>
            <Plus size={12} /> Event
          </button>
        </div>

        {/* MONTH VIEW */}
        {view === 'month' && (
          <div className="flex-1 overflow-y-auto p-3">
            <div className="grid grid-cols-7 gap-px mb-1">
              {DAY_NAMES.map((d) => (
                <div key={d} className="text-center text-[9px] font-bold uppercase tracking-wider py-1"
                  style={{ color: 'var(--text3)' }}>{d}</div>
              ))}
            </div>
            <div className="flex flex-col gap-px">
              {weeks.map((week, wi) => (
                <div key={wi} className="grid grid-cols-7 gap-px">
                  {week.map((day, di) => {
                    const isToday = day === today
                    const isSelected = day === selectedDate
                    const dayEvs = day ? eventsForDate(day) : []
                    return (
                      <div key={di}
                        onClick={() => { if (day) setSelectedDate(day) }}
                        onDoubleClick={() => day && openEventModal(day)}
                        className="flex flex-col p-1 rounded cursor-pointer min-h-[58px]"
                        style={{
                          opacity: day ? 1 : 0.3,
                          background: isSelected ? 'var(--indigo-dim)' : 'transparent',
                          border: `1px solid ${isSelected ? 'rgba(129,140,248,.3)' : 'transparent'}`,
                        }}
                        onMouseEnter={(e) => { if (!isSelected && day) (e.currentTarget as HTMLElement).style.background = 'var(--bg3)' }}
                        onMouseLeave={(e) => { if (!isSelected) (e.currentTarget as HTMLElement).style.background = isSelected ? 'var(--indigo-dim)' : 'transparent' }}
                      >
                        <div className="flex justify-center mb-0.5">
                          <span className="text-xs flex items-center justify-center"
                            style={{
                              width: 22, height: 22, borderRadius: '50%',
                              background: isToday ? 'var(--indigo)' : 'transparent',
                              color: isToday ? '#fff' : 'var(--text2)',
                              fontWeight: isToday ? 700 : 400,
                            }}>
                            {day ? new Date(day + 'T12:00').getDate() : ''}
                          </span>
                        </div>
                        <div className="flex flex-col gap-px">
                          {dayEvs.slice(0, 2).map((ev) => (
                            <div key={ev.id} className="text-[9px] rounded px-1 truncate leading-[1.4] flex items-center justify-between gap-1"
                              style={{ background: ev.color + '33', color: ev.color, border: `1px solid ${ev.color}44` }}>
                              <span className="truncate">{ev.title}</span>
                              <button onClick={(e) => handleDeleteEvent(ev.id, e)} className="opacity-0 hover:opacity-100 flex-shrink-0">×</button>
                            </div>
                          ))}
                          {dayEvs.length > 2 && <div className="text-[9px]" style={{ color: 'var(--text3)' }}>+{dayEvs.length - 2}</div>}
                        </div>
                      </div>
                    )
                  })}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* WEEK VIEW */}
        {view === 'week' && (
          <div className="flex-1 overflow-auto">
            <div className="flex min-w-0">
              {/* Hour labels */}
              <div className="flex flex-col flex-shrink-0 pt-8" style={{ width: 44 }}>
                {HOURS.map((h) => (
                  <div key={h} className="flex items-start justify-end pr-2 text-[9px]"
                    style={{ height: 48, color: 'var(--text3)', borderTop: '1px solid var(--border)' }}>
                    {h}:00
                  </div>
                ))}
              </div>
              {/* Day columns */}
              {getWeekDates().map((dateStr, dayIdx) => {
                const isToday = dateStr === today
                const dayEvs = eventsForDate(dateStr)
                // Parse local date parts from YYYY-MM-DD without timezone issues
                const [, , dd] = dateStr.split('-').map(Number)
                return (
                  <div key={dateStr} className="flex-1 border-l min-w-0" style={{ borderColor: 'var(--border)' }}>
                    <div className="sticky top-0 z-10 text-center py-1.5 text-[10px] font-bold"
                      style={{ background: 'var(--bg2)', borderBottom: '1px solid var(--border)', color: isToday ? 'var(--indigo)' : 'var(--text2)' }}>
                      {DAY_NAMES[dayIdx]}
                      <br />
                      <span style={{ fontSize: 11, color: isToday ? 'var(--indigo)' : 'var(--text)' }}>
                        {dd}
                      </span>
                    </div>
                    <div className="relative">
                      {HOURS.map((h) => {
                        const isDragging = drag?.date === dateStr
                        const inDrag = isDragging && h >= Math.min(drag!.startH, drag!.curH) && h <= Math.max(drag!.startH, drag!.curH)
                        return (
                        <div key={h} className="border-t select-none" style={{ height: 48, borderColor: 'var(--border)', background: inDrag ? 'rgba(129,140,248,0.1)' : 'transparent', cursor: 'crosshair' }}
                          onMouseDown={() => setDrag({ date: dateStr, startH: h, curH: h })}
                          onMouseEnter={() => { if (drag) setDrag(prev => prev ? { ...prev, curH: h } : null) }} />
                      )})}
                      {dayEvs.map((ev) => (
                        <div key={ev.id} className="absolute left-1 right-1 rounded px-1 text-[9px] overflow-hidden group"
                          style={{
                            top: ev.start_h * 48,
                            height: Math.max(24, (ev.end_h - ev.start_h) * 48),
                            background: ev.color + '33',
                            color: ev.color,
                            border: `1px solid ${ev.color}55`,
                          }}>
                          <div className="flex items-start justify-between gap-1">
                            <span className="font-bold truncate">{ev.title}</span>
                            <button onClick={(e) => handleDeleteEvent(ev.id, e)}
                              className="opacity-0 group-hover:opacity-100 flex-shrink-0 text-[10px] leading-none"
                              style={{ color: ev.color }}>×</button>
                          </div>
                          <div>{ev.start_h}:00–{ev.end_h}:00</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* DAY VIEW */}
        {view === 'day' && (
          <div className="flex-1 overflow-auto">
            <div className="flex">
              {/* Hour labels */}
              <div className="flex flex-col flex-shrink-0" style={{ width: 52 }}>
                {HOURS.map((h) => (
                  <div key={h} className="flex items-start justify-end pr-2 pt-1 text-[10px]"
                    style={{ height: 56, color: 'var(--text3)', borderTop: '1px solid var(--border)' }}>
                    {h.toString().padStart(2, '0')}:00
                  </div>
                ))}
              </div>
              {/* Events column */}
              <div className="flex-1 relative border-l" style={{ borderColor: 'var(--border)' }}>
                {HOURS.map((h) => {
                  const isDragging = drag?.date === dayViewDate
                  const inDrag = isDragging && h >= Math.min(drag!.startH, drag!.curH) && h <= Math.max(drag!.startH, drag!.curH)
                  return (
                  <div key={h} className="border-t select-none"
                    style={{ height: 56, borderColor: 'var(--border)', background: inDrag ? 'rgba(129,140,248,0.1)' : 'transparent', cursor: 'crosshair' }}
                    onMouseDown={() => setDrag({ date: dayViewDate, startH: h, curH: h })}
                    onMouseEnter={() => { if (drag) setDrag(prev => prev ? { ...prev, curH: h } : null) }} />
                  )
                })}
                {/* Current time indicator */}
                {dayViewDate === today && (() => {
                  const now = new Date()
                  const topPx = (now.getHours() + now.getMinutes() / 60) * 56
                  return (
                    <div className="absolute left-0 right-0 flex items-center" style={{ top: topPx, zIndex: 10 }}>
                      <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: 'var(--danger)', marginLeft: -4 }} />
                      <div className="flex-1 h-px" style={{ background: 'var(--danger)' }} />
                    </div>
                  )
                })()}
                {eventsForDate(dayViewDate).map((ev) => (
                  <div key={ev.id} className="absolute left-2 right-2 rounded-lg px-2 py-1 text-xs group"
                    style={{
                      top: ev.start_h * 56 + 2,
                      height: Math.max(32, (ev.end_h - ev.start_h) * 56 - 4),
                      background: ev.color + '22',
                      color: ev.color,
                      border: `1px solid ${ev.color}44`,
                    }}>
                    <div className="flex items-start justify-between gap-1">
                      <div className="font-bold truncate">{ev.title}</div>
                      <button onClick={(e) => handleDeleteEvent(ev.id, e)}
                        className="opacity-0 group-hover:opacity-100 flex-shrink-0 text-[12px] leading-none"
                        style={{ color: ev.color }}>×</button>
                    </div>
                    <div className="text-[10px]">{ev.start_h}:00 – {ev.end_h}:00</div>
                    {ev.notes && <div className="text-[10px] mt-0.5 truncate opacity-70">{ev.notes}</div>}
                  </div>
                ))}
                {eventsForDate(dayViewDate).length === 0 && (
                  <div className="absolute inset-0 flex items-center justify-center text-xs"
                    style={{ color: 'var(--text3)', pointerEvents: 'none' }}>
                    No events — double-click to add
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Sidebar */}
      <div className="flex flex-col flex-shrink-0 overflow-hidden"
        style={{ width: 190, borderLeft: '1px solid var(--border)', background: 'var(--bg2)' }}>
        <PomodoroTimer />

        {/* Selected day events */}
        {selectedDate && view !== 'day' && (
          <div className="flex-1 overflow-y-auto p-2 border-t" style={{ borderColor: 'var(--border)' }}>
            <div className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--text3)' }}>
              {new Date(selectedDate + 'T12:00').toLocaleDateString('en', { weekday: 'long', month: 'short', day: 'numeric' })}
            </div>
            {eventsForDate(selectedDate).length === 0 ? (
              <div className="text-[10px]" style={{ color: 'var(--text3)' }}>
                No events<br />
                <button onClick={() => openEventModal(selectedDate)} className="mt-1 text-[10px]"
                  style={{ color: 'var(--indigo)' }}>+ Add event</button>
              </div>
            ) : (
              eventsForDate(selectedDate).map((ev) => (
                <div key={ev.id} className="rounded p-1.5 mb-1.5 text-[10px] group"
                  style={{ background: ev.color + '22', border: `1px solid ${ev.color}44` }}>
                  <div className="flex items-start justify-between gap-1">
                    <div className="font-bold" style={{ color: ev.color }}>{ev.title}</div>
                    <button onClick={(e) => handleDeleteEvent(ev.id, e)}
                      className="opacity-0 group-hover:opacity-100 flex-shrink-0 text-[12px] leading-none"
                      style={{ color: ev.color }}>×</button>
                  </div>
                  <div style={{ color: 'var(--text3)' }}>{ev.start_h}:00 – {ev.end_h}:00</div>
                  {ev.notes && <div style={{ color: 'var(--text3)', marginTop: 2 }}>{ev.notes}</div>}
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {eventModalOpen && <EventModal />}
    </div>
  )
}
