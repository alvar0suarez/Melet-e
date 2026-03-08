import React, { useEffect, useState } from 'react'
import { Eye, EyeOff, BookOpen } from 'lucide-react'
import { checkAuth, setupAuth, loginAuth } from '@/lib/api'

interface Props {
  onAuthenticated: () => void
}

export default function LoginScreen({ onAuthenticated }: Props) {
  const [mode, setMode] = useState<'loading' | 'setup' | 'login'>('loading')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    checkAuth()
      .then(({ configured }) => setMode(configured ? 'login' : 'setup'))
      .catch(() => setMode('login'))
  }, [])

  const handleSubmit = async () => {
    setError('')
    if (!password) return
    setLoading(true)
    try {
      if (mode === 'setup') {
        if (password.length < 4) { setError('Mínimo 4 caracteres'); return }
        if (password !== confirm) { setError('Las contraseñas no coinciden'); return }
        const { token } = await setupAuth(password)
        localStorage.setItem('melete_token', token)
      } else {
        const { token } = await loginAuth(password)
        localStorage.setItem('melete_token', token)
      }
      onAuthenticated()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error de conexión')
    } finally {
      setLoading(false)
    }
  }

  if (mode === 'loading') {
    return (
      <div className="fixed inset-0 flex items-center justify-center" style={{ background: '#0d1117' }}>
        <div className="text-sm" style={{ color: 'var(--text3)' }}>Conectando…</div>
      </div>
    )
  }

  return (
    <div
      className="fixed inset-0 flex flex-col items-center justify-center gap-10 px-6"
      style={{ background: 'linear-gradient(160deg, #0d1117 0%, #10151f 60%, #0d1117 100%)' }}
    >
      {/* Logo */}
      <div className="flex flex-col items-center gap-4">
        <div
          className="w-20 h-20 rounded-3xl flex items-center justify-center"
          style={{
            background: 'linear-gradient(135deg, #4f46e5, #0d9488)',
            boxShadow: '0 12px 48px rgba(79,70,229,0.35)',
          }}
        >
          <BookOpen size={36} color="#fff" strokeWidth={1.5} />
        </div>
        <div className="text-center">
          <h1
            className="text-3xl font-black tracking-tight"
            style={{
              background: 'linear-gradient(135deg, var(--indigo), var(--teal))',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            Melete
          </h1>
          <p className="text-xs mt-1.5 tracking-wide" style={{ color: 'var(--text3)' }}>
            {mode === 'setup' ? 'Crea tu contraseña de acceso' : 'Tu biblioteca personal de conocimiento'}
          </p>
        </div>
      </div>

      {/* Form */}
      <div className="w-full max-w-xs flex flex-col gap-3">
        {/* Password field */}
        <div className="relative">
          <input
            type={showPw ? 'text' : 'password'}
            value={password}
            onChange={e => setPassword(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleSubmit() }}
            placeholder="Contraseña"
            autoFocus
            autoComplete={mode === 'setup' ? 'new-password' : 'current-password'}
            className="w-full px-4 py-3.5 rounded-2xl text-sm outline-none pr-12"
            style={{
              background: 'var(--bg2)',
              border: '1px solid var(--border2)',
              color: 'var(--text)',
              fontSize: 16,  // prevents iOS zoom on focus
            }}
          />
          <button
            onClick={() => setShowPw(v => !v)}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1"
          >
            {showPw
              ? <EyeOff size={16} style={{ color: 'var(--text3)' }} />
              : <Eye size={16} style={{ color: 'var(--text3)' }} />
            }
          </button>
        </div>

        {/* Confirm field (setup only) */}
        {mode === 'setup' && (
          <input
            type="password"
            value={confirm}
            onChange={e => setConfirm(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleSubmit() }}
            placeholder="Repite la contraseña"
            autoComplete="new-password"
            className="w-full px-4 py-3.5 rounded-2xl text-sm outline-none"
            style={{
              background: 'var(--bg2)',
              border: '1px solid var(--border2)',
              color: 'var(--text)',
              fontSize: 16,
            }}
          />
        )}

        {error && (
          <p className="text-xs text-center" style={{ color: 'var(--red)' }}>{error}</p>
        )}

        <button
          onClick={handleSubmit}
          disabled={loading || !password}
          className="w-full py-3.5 rounded-2xl text-sm font-bold mt-1"
          style={{
            background: 'linear-gradient(135deg, var(--indigo), var(--teal))',
            color: '#fff',
            opacity: loading || !password ? 0.6 : 1,
            fontSize: 15,
          }}
        >
          {loading ? '…' : mode === 'setup' ? 'Crear contraseña' : 'Entrar'}
        </button>

        {mode === 'setup' && (
          <p className="text-[10px] text-center leading-relaxed" style={{ color: 'var(--text3)' }}>
            Esta contraseña protege el acceso desde el móvil y otras redes.
            La puedes cambiar desde Ajustes.
          </p>
        )}
      </div>
    </div>
  )
}
