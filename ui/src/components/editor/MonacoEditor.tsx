import React, { useEffect, useRef, useCallback } from 'react'
import Editor, { OnMount, loader } from '@monaco-editor/react'
import { useEditorStore } from '@/store/editor'
import { useAppStore } from '@/store/app'
import { saveNote, getBacklinks } from '@/lib/api'
import * as ver from '@/lib/api'

// Configure Monaco to use local workers
loader.config({ paths: { vs: 'https://cdn.jsdelivr.net/npm/monaco-editor@0.46.0/min/vs' } })

interface Props {
  noteName: string
}

const THEME_NAME = 'melete-dark'

function defineTheme(monaco: typeof import('monaco-editor')) {
  monaco.editor.defineTheme(THEME_NAME, {
    base: 'vs-dark',
    inherit: true,
    rules: [
      { token: 'keyword.md', foreground: 'e2b96f', fontStyle: 'bold' },
      { token: 'strong.md', foreground: 'e6edf3', fontStyle: 'bold' },
      { token: 'emphasis.md', foreground: 'adbac7', fontStyle: 'italic' },
      { token: 'string.link.md', foreground: 'a5b4fc' },
      { token: 'variable.md', foreground: '2dd4bf' },
      { token: 'string.md', foreground: 'ce9178' },
      { token: 'comment.md', foreground: '6e7681', fontStyle: 'italic' },
      { token: 'keyword.table.md', foreground: '444c56' },
    ],
    colors: {
      'editor.background': '#0d1117',
      'editor.foreground': '#e6edf3',
      'editorLineNumber.foreground': '#6e7681',
      'editorLineNumber.activeForeground': '#8b949e',
      'editor.lineHighlightBackground': 'rgba(129,140,248,0.06)',
      'editor.selectionBackground': 'rgba(129,140,248,0.22)',
      'editorCursor.foreground': '#818cf8',
      'editor.wordHighlightBackground': 'rgba(129,140,248,0.12)',
      'editorBracketMatch.background': 'rgba(129,140,248,0.12)',
      'editorBracketMatch.border': '#818cf8',
      'scrollbarSlider.background': 'rgba(68,76,86,0.4)',
      'scrollbarSlider.hoverBackground': 'rgba(68,76,86,0.7)',
      'editorGutter.background': '#0d1117',
    },
  })
}

export default function MonacoEditor({ noteName }: Props) {
  const { getNoteContent, setNoteContent, setBacklinks, markDirty, markClean } = useEditorStore()
  const { markTabModified } = useAppStore()
  const editorRef = useRef<import('monaco-editor').editor.IStandaloneCodeEditor | null>(null)
  const monacoRef = useRef<typeof import('monaco-editor') | null>(null)
  const content = getNoteContent(noteName)
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleSave = useCallback(async (withSnapshot = false) => {
    if (!editorRef.current) return
    const value = editorRef.current.getValue()
    await saveNote(noteName, value, withSnapshot, withSnapshot ? 'Manual save' : '')
    markClean(noteName)
    markTabModified(`note:${noteName}`, false)
    // Refresh backlinks
    const links = await getBacklinks(noteName)
    setBacklinks(noteName, links)
  }, [noteName])

  const handleMount: OnMount = (editor, monaco) => {
    editorRef.current = editor
    monacoRef.current = monaco

    defineTheme(monaco)
    monaco.editor.setTheme(THEME_NAME)

    // Custom keybindings
    // Ctrl+S = save to disk (no snapshot — use SCView "Save Snapshot" to version)
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
      handleSave(false)
    })
    // Ctrl+Shift+S = save + snapshot
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyS, () => {
      handleSave(true)
    })

    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyK, () => {
      const selection = editor.getSelection()
      if (selection) {
        editor.executeEdits('', [{
          range: selection,
          text: `[[${editor.getModel()?.getValueInRange(selection) ?? ''}]]`,
        }])
      }
    })

    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyB, () => {
      const selection = editor.getSelection()
      if (selection) {
        const text = editor.getModel()?.getValueInRange(selection) ?? ''
        editor.executeEdits('', [{ range: selection, text: `**${text}**` }])
      }
    })

    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyI, () => {
      const selection = editor.getSelection()
      if (selection) {
        const text = editor.getModel()?.getValueInRange(selection) ?? ''
        editor.executeEdits('', [{ range: selection, text: `*${text}*` }])
      }
    })

    // Wikilink autocomplete
    monaco.languages.registerCompletionItemProvider('markdown', {
      triggerCharacters: ['['],
      provideCompletionItems: (model, position) => {
        const text = model.getValueInRange({
          startLineNumber: position.lineNumber,
          startColumn: 1,
          endLineNumber: position.lineNumber,
          endColumn: position.column,
        })
        if (!text.endsWith('[[')) return { suggestions: [] }
        // Note names from the editor store (imported notes)
        // We return empty here; the store has notes but we'd need to import it
        return { suggestions: [] }
      },
    })
  }

  const handleChange = (value: string | undefined) => {
    if (value === undefined) return
    setNoteContent(noteName, value)
    markDirty(noteName)
    markTabModified(`note:${noteName}`, true)
    // Auto-save after 2s of inactivity
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
    saveTimeoutRef.current = setTimeout(() => handleSave(false), 2000)
  }

  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
    }
  }, [])

  // When noteName changes, load backlinks
  useEffect(() => {
    getBacklinks(noteName).then((links) => setBacklinks(noteName, links))
  }, [noteName])

  return (
    <Editor
      height="100%"
      language="markdown"
      theme={THEME_NAME}
      value={content}
      onChange={handleChange}
      onMount={handleMount}
      options={{
        wordWrap: 'on',
        lineNumbers: 'on',
        minimap: { enabled: false },
        renderLineHighlight: 'gutter',
        scrollBeyondLastLine: false,
        padding: { top: 16, bottom: 16 },
        fontFamily: "'SF Mono', Consolas, 'Fira Code', monospace",
        fontSize: 13,
        lineHeight: 1.65,
        cursorStyle: 'line',
        smoothScrolling: true,
        scrollbar: { verticalScrollbarSize: 6, horizontalScrollbarSize: 6 },
        overviewRulerLanes: 0,
        hideCursorInOverviewRuler: true,
        occurrencesHighlight: 'off',
        renderWhitespace: 'none',
      }}
    />
  )
}
