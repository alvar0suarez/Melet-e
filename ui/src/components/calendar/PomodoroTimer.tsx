import React, { useEffect, useState } from 'react'
import { Play, Pause, RotateCcw, SkipForward, Pencil, Check } from 'lucide-react'
import { useCalendarStore } from '@/store/calendar'
import { toast } from '@/components/shared/Toast'

type PomodoroMode = 'work' | 'break' | 'longbreak'

const modeColor = {
  work: 'var(--indigo)',
  break: 'var(--teal)',
  longbreak: 'var(--green)',
}
const modeLabel = {
  work: 'WORK',
  break: 'BREAK',
  longbreak: 'LONG BREAK',
}
const modeNext = {
  work: '→ break after',
  break: '→ back to work',
  longbreak: '→ back to work',
}

export default function PomodoroTimer() {
  const { pomodoro, startPomodoro, pausePomodoro, resetPomodoro, skipPomodoro, setPomodoroMins, setOnTimerComplete } = useCalendarStore()
  const { mode, running, remaining, sessions, workMins, breakMins, longbreakMins } = pomodoro
  const [editing, setEditing] = useState(false)
  const [editWork, setEditWork] = useState(String(workMins))
  const [editBreak, setEditBreak] = useState(String(breakMins))
  const [editLong, setEditLong] = useState(String(longbreakMins))

  // Register toast notification callback
  useEffect(() => {
    setOnTimerComplete((completedMode: PomodoroMode) => {
      const msgs = {
        work: '🍅 Work session complete! Time for a break.',
        break: '⚡ Break over. Back to work!',
        longbreak: '⚡ Long break over. Ready to focus!',
      }
      toast.success(msgs[completedMode], 6000)

      // Browser notification if permitted
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('Melete Pomodoro', { body: msgs[completedMode], icon: '' })
      }
    })
  }, [])

  // Request notification permission on mount
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission()
    }
  }, [])

  const totalSecs = (mode === 'work' ? workMins : mode === 'break' ? breakMins : longbreakMins) * 60
  const pct = remaining / totalSecs
  const r = 38
  const circ = 2 * Math.PI * r
  const offset = circ * (1 - pct)
  const color = modeColor[mode]

  const min = Math.floor(remaining / 60).toString().padStart(2, '0')
  const sec = (remaining % 60).toString().padStart(2, '0')

  const saveEdit = () => {
    const w = parseInt(editWork) || workMins
    const b = parseInt(editBreak) || breakMins
    const l = parseInt(editLong) || longbreakMins
    setPomodoroMins('work', w)
    setPomodoroMins('break', b)
    setPomodoroMins('longbreak', l)
    setEditing(false)
  }

  return (
    <div className="flex flex-col items-center gap-2 p-3" style={{ background: 'var(--bg2)' }}>
      {/* Mode label */}
      <div className="flex items-center justify-between w-full">
        <span className="text-[9px] font-bold uppercase tracking-[2px]" style={{ color }}>
          {modeLabel[mode]}
        </span>
        <button
          onClick={() => { setEditing(!editing); setEditWork(String(workMins)); setEditBreak(String(breakMins)); setEditLong(String(longbreakMins)) }}
          className="p-1 rounded opacity-50 hover:opacity-100"
          style={{ color: 'var(--text3)' }}
          title="Edit durations"
        >
          {editing ? <Check size={11} /> : <Pencil size={11} />}
        </button>
      </div>

      {/* Edit durations */}
      {editing && (
        <div className="w-full flex flex-col gap-1.5 text-[10px]" style={{ color: 'var(--text3)' }}>
          {[
            { label: 'Work', val: editWork, set: setEditWork, mode: 'work' as PomodoroMode, c: 'var(--indigo)' },
            { label: 'Break', val: editBreak, set: setEditBreak, mode: 'break' as PomodoroMode, c: 'var(--teal)' },
            { label: 'Long', val: editLong, set: setEditLong, mode: 'longbreak' as PomodoroMode, c: 'var(--green)' },
          ].map(({ label, val, set, c }) => (
            <div key={label} className="flex items-center gap-2">
              <span className="w-8 text-right font-bold" style={{ color: c }}>{label}</span>
              <input
                type="number" min={1} max={120}
                value={val}
                onChange={(e) => set(e.target.value)}
                onBlur={saveEdit}
                onKeyDown={(e) => { if (e.key === 'Enter') saveEdit() }}
                className="w-12 px-1.5 py-0.5 rounded text-center outline-none"
                style={{ background: 'var(--bg3)', border: '1px solid var(--border)', color: 'var(--text)' }}
              />
              <span>min</span>
            </div>
          ))}
          <button
            onClick={saveEdit}
            className="mt-1 w-full py-1 rounded text-[10px] font-bold"
            style={{ background: 'var(--indigo-dim)', color: 'var(--indigo)', border: '1px solid rgba(129,140,248,.25)' }}
          >
            Apply
          </button>
        </div>
      )}

      {/* SVG Circle */}
      {!editing && (
        <>
          <div className="relative" style={{ width: 94, height: 94 }}>
            <svg width="94" height="94" viewBox="0 0 94 94">
              <circle cx="47" cy="47" r={r} fill="none" stroke="var(--border)" strokeWidth="5" />
              <circle
                cx="47" cy="47" r={r}
                fill="none"
                stroke={color}
                strokeWidth="5"
                strokeLinecap="round"
                strokeDasharray={circ}
                strokeDashoffset={offset}
                transform="rotate(-90 47 47)"
                style={{ transition: 'stroke-dashoffset 1s linear, stroke 0.3s' }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="font-mono text-xl font-bold" style={{ color: 'var(--text)', lineHeight: 1 }}>
                {min}:{sec}
              </span>
              <span className="text-[8px] mt-0.5" style={{ color: 'var(--text3)' }}>{modeNext[mode]}</span>
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-2">
            <button
              onClick={running ? pausePomodoro : startPomodoro}
              className="w-9 h-9 rounded-full flex items-center justify-center font-bold"
              style={{ background: color + '22', color, border: `1px solid ${color}44` }}
            >
              {running ? <Pause size={15} /> : <Play size={15} />}
            </button>
            <button onClick={resetPomodoro} className="w-7 h-7 rounded-full flex items-center justify-center"
              style={{ background: 'var(--bg3)', color: 'var(--text3)' }}>
              <RotateCcw size={12} />
            </button>
            <button onClick={skipPomodoro} className="w-7 h-7 rounded-full flex items-center justify-center"
              style={{ background: 'var(--bg3)', color: 'var(--text3)' }}>
              <SkipForward size={12} />
            </button>
          </div>

          {/* Sessions */}
          <div className="flex items-center gap-1 flex-wrap justify-center">
            {Array.from({ length: Math.max(sessions, 4) }).map((_, i) => (
              <div key={i} className="w-2 h-2 rounded-full"
                style={{ background: i < sessions ? 'var(--orange)' : 'var(--border)' }} />
            ))}
            <span className="ml-1 text-[9px]" style={{ color: 'var(--text3)' }}>{sessions} 🍅</span>
          </div>
        </>
      )}
    </div>
  )
}
