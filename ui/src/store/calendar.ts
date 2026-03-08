import { create } from 'zustand'
import type { CalEvent, CalView } from '@/lib/types'

type PomodoroMode = 'work' | 'break' | 'longbreak'

interface PomodoroState {
  mode: PomodoroMode
  running: boolean
  remaining: number    // seconds
  sessions: number
  intervalId: ReturnType<typeof setInterval> | null
  // Custom durations (minutes)
  workMins: number
  breakMins: number
  longbreakMins: number
}

interface CalendarState {
  events: CalEvent[]
  setEvents: (evs: CalEvent[]) => void
  addEvent: (ev: CalEvent) => void
  removeEvent: (id: string) => void

  view: CalView
  setView: (v: CalView) => void
  currentDate: Date
  setCurrentDate: (d: Date) => void

  selectedDate: string | null
  setSelectedDate: (d: string | null) => void

  eventModalOpen: boolean
  eventModalDate: string | null
  eventModalStartH: number | null
  eventModalEndH: number | null
  openEventModal: (date?: string, startH?: number, endH?: number) => void
  closeEventModal: () => void

  // Pomodoro
  pomodoro: PomodoroState
  startPomodoro: () => void
  pausePomodoro: () => void
  resetPomodoro: () => void
  skipPomodoro: () => void
  setPomodoroMins: (mode: PomodoroMode, mins: number) => void
  _pomodoroTick: () => void
  onTimerComplete?: (mode: PomodoroMode) => void
  setOnTimerComplete: (fn: (mode: PomodoroMode) => void) => void
}

const DEFAULT = { work: 25, break: 5, longbreak: 15 }

const durations = (p: PomodoroState) => ({
  work: p.workMins * 60,
  break: p.breakMins * 60,
  longbreak: p.longbreakMins * 60,
})

export const useCalendarStore = create<CalendarState>((set, get) => ({
  events: [],
  setEvents: (events) => set({ events }),
  addEvent: (ev) => set((s) => ({ events: [...s.events, ev] })),
  removeEvent: (id) => set((s) => ({ events: s.events.filter((e) => e.id !== id) })),

  view: 'month',
  setView: (view) => set({ view }),
  currentDate: new Date(),
  setCurrentDate: (currentDate) => set({ currentDate }),

  selectedDate: null,
  setSelectedDate: (selectedDate) => set({ selectedDate }),

  eventModalOpen: false,
  eventModalDate: null,
  eventModalStartH: null,
  eventModalEndH: null,
  openEventModal: (date, startH, endH) => set({ eventModalOpen: true, eventModalDate: date ?? null, eventModalStartH: startH ?? null, eventModalEndH: endH ?? null }),
  closeEventModal: () => set({ eventModalOpen: false, eventModalDate: null, eventModalStartH: null, eventModalEndH: null }),

  onTimerComplete: undefined,
  setOnTimerComplete: (fn) => set({ onTimerComplete: fn }),

  pomodoro: {
    mode: 'work',
    running: false,
    remaining: DEFAULT.work * 60,
    sessions: 0,
    intervalId: null,
    workMins: DEFAULT.work,
    breakMins: DEFAULT.break,
    longbreakMins: DEFAULT.longbreak,
  },

  setPomodoroMins: (mode, mins) => {
    const m = Math.max(1, Math.min(120, mins))
    set((s) => {
      const p = s.pomodoro
      const updated = {
        ...p,
        [`${mode}Mins`]: m,
        // if currently in this mode and not running, update remaining
        remaining: p.mode === mode && !p.running ? m * 60 : p.remaining,
      }
      return { pomodoro: updated }
    })
  },

  startPomodoro: () => {
    const { pomodoro, _pomodoroTick } = get()
    if (pomodoro.running) return
    const id = setInterval(_pomodoroTick, 1000)
    set((s) => ({ pomodoro: { ...s.pomodoro, running: true, intervalId: id } }))
  },

  pausePomodoro: () => {
    const { pomodoro } = get()
    if (pomodoro.intervalId) clearInterval(pomodoro.intervalId)
    set((s) => ({ pomodoro: { ...s.pomodoro, running: false, intervalId: null } }))
  },

  resetPomodoro: () => {
    const { pomodoro } = get()
    if (pomodoro.intervalId) clearInterval(pomodoro.intervalId)
    const d = durations(pomodoro)
    set((s) => ({
      pomodoro: { ...s.pomodoro, running: false, intervalId: null, remaining: d[s.pomodoro.mode] },
    }))
  },

  skipPomodoro: () => {
    const { pomodoro } = get()
    if (pomodoro.intervalId) clearInterval(pomodoro.intervalId)
    const nextMode: PomodoroMode =
      pomodoro.mode === 'work'
        ? pomodoro.sessions > 0 && (pomodoro.sessions + 1) % 4 === 0 ? 'longbreak' : 'break'
        : 'work'
    const d = durations(pomodoro)
    set((s) => ({
      pomodoro: { ...s.pomodoro, mode: nextMode, running: false, intervalId: null, remaining: d[nextMode] },
    }))
  },

  _pomodoroTick: () => {
    const { pomodoro, onTimerComplete } = get()
    if (pomodoro.remaining <= 1) {
      if (pomodoro.intervalId) clearInterval(pomodoro.intervalId)
      const newSessions = pomodoro.mode === 'work' ? pomodoro.sessions + 1 : pomodoro.sessions
      const nextMode: PomodoroMode =
        pomodoro.mode === 'work'
          ? newSessions % 4 === 0 ? 'longbreak' : 'break'
          : 'work'
      const d = durations(pomodoro)

      // Fire callback for notification
      onTimerComplete?.(pomodoro.mode)

      set((s) => ({
        pomodoro: {
          ...s.pomodoro,
          mode: nextMode,
          running: false,
          intervalId: null,
          remaining: d[nextMode],
          sessions: newSessions,
        },
      }))
    } else {
      set((s) => ({ pomodoro: { ...s.pomodoro, remaining: s.pomodoro.remaining - 1 } }))
    }
  },
}))
