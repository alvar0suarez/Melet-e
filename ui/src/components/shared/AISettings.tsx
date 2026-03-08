import React, { useEffect, useState } from 'react'
import { Zap, CheckCircle, XCircle, Plus, Trash2 } from 'lucide-react'
import { getAIConfig, saveAIConfig, getAIProviders, testAI, getCollections, addCollection, deleteCollection } from '@/lib/api'
import { useAppStore } from '@/store/app'
import type { AIConfig, AIProvider } from '@/lib/types'

export default function AISettings() {
  const { setAIConfig, setCollections } = useAppStore()
  const [config, setConfig] = useState<AIConfig>({
    provider: 'ollama', model: 'llama3.2', api_key: '', base_url: 'http://localhost:11434',
  })
  const [providers, setProviders] = useState<AIProvider[]>([])
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null)
  const [collections, setLocalCollections] = useState<string[]>([])
  const [newColl, setNewColl] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    Promise.all([getAIConfig(), getAIProviders(), getCollections()]).then(([cfg, pvs, colls]) => {
      setConfig(cfg)
      setProviders(pvs)
      setLocalCollections(colls)
    })
  }, [])

  const handleSave = async () => {
    setSaving(true)
    try {
      await saveAIConfig(config)
      setAIConfig(config)
    } finally {
      setSaving(false)
    }
  }

  const handleTest = async () => {
    setTesting(true)
    setTestResult(null)
    try {
      const result = await testAI(config)
      setTestResult(result)
    } finally {
      setTesting(false)
    }
  }

  const handleAddCollection = async () => {
    if (!newColl.trim()) return
    await addCollection(newColl.trim())
    const updated = [...collections, newColl.trim()]
    setLocalCollections(updated)
    setCollections(updated)
    setNewColl('')
  }

  const handleDeleteCollection = async (name: string) => {
    await deleteCollection(name)
    const updated = collections.filter((c) => c !== name)
    setLocalCollections(updated)
    setCollections(updated)
  }

  const needsKey = !['ollama', 'lmstudio'].includes(config.provider)
  const needsUrl = ['ollama', 'lmstudio'].includes(config.provider)

  const inputCls = "w-full px-3 py-2 rounded-md text-xs outline-none"
  const inputStyle = { background: 'var(--bg3)', border: '1px solid var(--border)', color: 'var(--text)' }

  const modelSuggestions: Record<string, string[]> = {
    ollama: ['llama3.2', 'llama3.1', 'mistral', 'phi3', 'gemma2'],
    lmstudio: ['local-model'],
    claude: ['claude-opus-4-6', 'claude-sonnet-4-6', 'claude-haiku-4-5-20251001'],
    openai: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo'],
    grok: ['grok-beta', 'grok-vision-beta'],
  }

  return (
    <div className="flex flex-col h-full overflow-y-auto" style={{ background: 'var(--bg)' }}>
      <div className="max-w-2xl mx-auto w-full p-6 flex flex-col gap-6">
        <h2 className="text-base font-bold" style={{ color: 'var(--text)' }}>Settings</h2>

        {/* AI Provider */}
        <section
          className="rounded-xl p-5 flex flex-col gap-4"
          style={{ background: 'var(--bg2)', border: '1px solid var(--border)' }}
        >
          <div className="flex items-center gap-2">
            <Zap size={16} style={{ color: 'var(--indigo)' }} />
            <h3 className="text-sm font-bold" style={{ color: 'var(--text)' }}>AI Provider</h3>
          </div>

          {/* Provider selector */}
          <div>
            <label className="block text-[10px] mb-1 uppercase tracking-wider" style={{ color: 'var(--text3)' }}>Provider</label>
            <div className="flex flex-wrap gap-2">
              {providers.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setConfig((c) => ({ ...c, provider: p.id as any }))}
                  className="px-3 py-1.5 rounded-lg text-xs transition-colors"
                  style={{
                    background: config.provider === p.id ? 'var(--indigo-dim)' : 'var(--bg3)',
                    color: config.provider === p.id ? 'var(--indigo)' : 'var(--text2)',
                    border: `1px solid ${config.provider === p.id ? 'rgba(129,140,248,.25)' : 'var(--border)'}`,
                  }}
                >
                  {p.name}
                </button>
              ))}
            </div>
          </div>

          {/* Model */}
          <div>
            <label className="block text-[10px] mb-1 uppercase tracking-wider" style={{ color: 'var(--text3)' }}>Model</label>
            <input
              list="model-suggestions"
              className={inputCls}
              style={inputStyle}
              value={config.model}
              onChange={(e) => setConfig((c) => ({ ...c, model: e.target.value }))}
              placeholder="model name"
            />
            <datalist id="model-suggestions">
              {(modelSuggestions[config.provider] ?? []).map((m) => (
                <option key={m} value={m} />
              ))}
            </datalist>
          </div>

          {/* API Key */}
          {needsKey && (
            <div>
              <label className="block text-[10px] mb-1 uppercase tracking-wider" style={{ color: 'var(--text3)' }}>API Key</label>
              <input
                type="password"
                className={inputCls}
                style={inputStyle}
                value={config.api_key}
                onChange={(e) => setConfig((c) => ({ ...c, api_key: e.target.value }))}
                placeholder="sk-..."
              />
            </div>
          )}

          {/* Base URL */}
          {needsUrl && (
            <div>
              <label className="block text-[10px] mb-1 uppercase tracking-wider" style={{ color: 'var(--text3)' }}>Base URL</label>
              <input
                className={inputCls}
                style={inputStyle}
                value={config.base_url}
                onChange={(e) => setConfig((c) => ({ ...c, base_url: e.target.value }))}
                placeholder="http://localhost:11434"
              />
            </div>
          )}

          {/* Test + Save */}
          <div className="flex gap-2 items-center">
            <button
              onClick={handleTest}
              disabled={testing}
              className="px-3 py-1.5 rounded text-xs"
              style={{ background: 'var(--bg3)', color: 'var(--text2)', border: '1px solid var(--border)' }}
            >
              {testing ? 'Testing…' : 'Test Connection'}
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-3 py-1.5 rounded text-xs font-bold"
              style={{ background: 'var(--indigo-dim)', color: 'var(--indigo)', border: '1px solid rgba(129,140,248,.25)' }}
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
            {testResult && (
              <span className="flex items-center gap-1 text-xs" style={{ color: testResult.ok ? 'var(--green)' : 'var(--danger)' }}>
                {testResult.ok ? <CheckCircle size={12} /> : <XCircle size={12} />}
                {testResult.message}
              </span>
            )}
          </div>
        </section>

        {/* Collections */}
        <section
          className="rounded-xl p-5 flex flex-col gap-4"
          style={{ background: 'var(--bg2)', border: '1px solid var(--border)' }}
        >
          <h3 className="text-sm font-bold" style={{ color: 'var(--text)' }}>Collections</h3>
          <div className="flex gap-2">
            <input
              value={newColl}
              onChange={(e) => setNewColl(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleAddCollection() }}
              placeholder="New collection name…"
              className={inputCls + ' flex-1'}
              style={inputStyle}
            />
            <button
              onClick={handleAddCollection}
              className="px-3 py-1.5 rounded text-xs"
              style={{ background: 'var(--indigo-dim)', color: 'var(--indigo)', border: '1px solid rgba(129,140,248,.25)' }}
            >
              <Plus size={13} />
            </button>
          </div>
          <div className="flex flex-col gap-1">
            {collections.map((c) => (
              <div key={c} className="flex items-center justify-between px-3 py-1.5 rounded"
                style={{ background: 'var(--bg3)', border: '1px solid var(--border)' }}>
                <span className="text-xs" style={{ color: 'var(--text2)' }}>{c}</span>
                <button onClick={() => handleDeleteCollection(c)} style={{ color: 'var(--text3)' }}>
                  <Trash2 size={12} />
                </button>
              </div>
            ))}
            {collections.length === 0 && (
              <p className="text-xs" style={{ color: 'var(--text3)' }}>No collections yet</p>
            )}
          </div>
        </section>

        {/* About */}
        <section
          className="rounded-xl p-5"
          style={{ background: 'var(--bg2)', border: '1px solid var(--border)' }}
        >
          <h3 className="text-sm font-bold mb-3" style={{ color: 'var(--text)' }}>About Melete</h3>
          <div className="text-xs leading-[1.7]" style={{ color: 'var(--text3)' }}>
            <p>Melete is a fully local PKM — no cloud, no accounts, no telemetry.</p>
            <p className="mt-1">Version 1.0.0 · Stack: Python + FastAPI · React + TypeScript</p>
          </div>
        </section>
      </div>
    </div>
  )
}
