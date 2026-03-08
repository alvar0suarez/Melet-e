import React, { useEffect, useRef, useState } from 'react'
import * as d3 from 'd3'
import { X, FileText, ExternalLink, ChevronDown, ChevronUp } from 'lucide-react'
import { getGraph, getNote, getBacklinksContext } from '@/lib/api'
import { useAppStore } from '@/store/app'
import { useEditorStore } from '@/store/editor'

interface GraphNode extends d3.SimulationNodeDatum {
  id: string
  real?: boolean
}
interface GraphLink {
  source: string
  target: string
}
interface BacklinkCtx {
  note: string
  ctx: string
}

/** Simple inline markdown renderer for the graph preview panel */
function NotePreview({ content }: { content: string }) {
  const lines = content.split('\n')
  return (
    <div style={{ fontFamily: 'inherit', fontSize: 11, lineHeight: 1.7, color: 'var(--text2)' }}>
      {lines.map((line, i) => {
        if (line.startsWith('---')) return <hr key={i} style={{ border: 'none', borderTop: '1px solid var(--border)', margin: '6px 0' }} />
        if (line.startsWith('# ')) return <div key={i} style={{ color: 'var(--text)', fontWeight: 700, fontSize: 13, marginTop: 8, marginBottom: 4 }}>{line.slice(2)}</div>
        if (line.startsWith('## ')) return <div key={i} style={{ color: 'var(--text)', fontWeight: 600, fontSize: 12, marginTop: 6, marginBottom: 2 }}>{line.slice(3)}</div>
        if (line.startsWith('### ')) return <div key={i} style={{ color: 'var(--indigo)', fontWeight: 600, marginTop: 4 }}>{line.slice(4)}</div>
        if (line.startsWith('> ')) return (
          <div key={i} style={{ borderLeft: '2px solid var(--teal)', paddingLeft: 8, margin: '3px 0', color: 'var(--text2)', fontStyle: 'italic' }}>
            {line.slice(2)}
          </div>
        )
        if (line.startsWith('- ') || line.startsWith('* ')) return <div key={i} style={{ paddingLeft: 12 }}>· {line.slice(2)}</div>
        if (line.trim() === '') return <div key={i} style={{ height: 4 }} />
        // Inline bold: **text**
        const parts = line.split(/(\*\*[^*]+\*\*)/)
        return (
          <div key={i}>
            {parts.map((p, j) =>
              p.startsWith('**') && p.endsWith('**')
                ? <strong key={j} style={{ color: 'var(--text)' }}>{p.slice(2, -2)}</strong>
                : <span key={j}>{p}</span>
            )}
          </div>
        )
      })}
    </div>
  )
}

export default function GraphView() {
  const svgRef = useRef<SVGSVGElement>(null)
  const { openTab } = useAppStore()
  const { setNoteContent } = useEditorStore()
  const [selectedNode, setSelectedNode] = useState<string | null>(null)
  const [selectedIsReal, setSelectedIsReal] = useState(false)
  const [noteContent, setNoteContent2] = useState<string | null>(null)
  const [noteExpanded, setNoteExpanded] = useState(true)
  const [backlinks, setBacklinks] = useState<BacklinkCtx[]>([])
  const [loadingCtx, setLoadingCtx] = useState(false)

  const openNoteInEditor = async (name: string) => {
    const { content } = await getNote(name)
    setNoteContent(name, content)
    openTab({ id: `note:${name}`, name: `${name}.md`, type: 'note' })
  }

  const selectNode = async (id: string, isReal: boolean) => {
    setSelectedNode(id)
    setSelectedIsReal(isReal)
    setBacklinks([])
    setNoteContent2(null)
    setNoteExpanded(true)
    setLoadingCtx(true)
    try {
      const [ctx, noteData] = await Promise.all([
        getBacklinksContext(id),
        isReal ? getNote(id) : Promise.resolve(null),
      ])
      setBacklinks(ctx)
      if (noteData) setNoteContent2(noteData.content)
    } finally {
      setLoadingCtx(false)
    }
  }

  useEffect(() => {
    if (!svgRef.current) return
    const svgEl = svgRef.current
    const svg = d3.select(svgEl)

    const width = svgEl.clientWidth || 600
    const height = svgEl.clientHeight || 500

    svg.selectAll('*').remove()

    const g = svg.append('g')

    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.2, 4])
      .on('zoom', (event) => { g.attr('transform', event.transform) })
    svg.call(zoom)

    getGraph().then(({ nodes, links }) => {
      if (nodes.length === 0) return

      const nodeData: GraphNode[] = (nodes as any[]).map((n) => ({ id: n.id, real: n.real !== false }))
      const linkData: GraphLink[] = links.map((l: any) => ({ source: l.s, target: l.t }))

      const simulation = d3.forceSimulation<GraphNode>(nodeData)
        .force('link', d3.forceLink<GraphNode, GraphLink>(linkData).id((d) => d.id).distance(80))
        .force('charge', d3.forceManyBody().strength(-200))
        .force('center', d3.forceCenter(width / 2, height / 2))
        .force('collide', d3.forceCollide(20))

      const link = g.append('g')
        .selectAll('line')
        .data(linkData)
        .enter()
        .append('line')
        .style('stroke', 'var(--border2)')
        .style('stroke-opacity', 0.5)
        .style('stroke-width', 1)

      const node = g.append('g')
        .selectAll('g')
        .data(nodeData)
        .enter()
        .append('g')
        .attr('class', 'graph-node')
        .style('cursor', 'pointer')

      node.append('circle')
        .attr('r', (d) => d.real ? 8 : 5)
        .style('fill', (d) => d.real ? 'var(--indigo)' : 'transparent')
        .style('stroke', (d) => d.real ? 'var(--bg2)' : 'var(--text3)')
        .style('stroke-width', (d) => d.real ? 2 : 1.5)
        .style('stroke-dasharray', (d) => d.real ? 'none' : '3,2')

      node.append('text')
        .text((d) => d.id)
        .attr('text-anchor', 'middle')
        .attr('dy', (d) => d.real ? 20 : 16)
        .style('font-size', (d) => d.real ? '10px' : '9px')
        .style('fill', (d) => d.real ? 'var(--text3)' : 'var(--text3)')
        .style('opacity', (d) => d.real ? 1 : 0.6)
        .style('pointer-events', 'none')

      node
        .on('mouseenter', function (_, d) {
          d3.select(this).select('circle')
            .transition().duration(150)
            .attr('r', d.real ? 12 : 7)
            .style('filter', 'drop-shadow(0 0 6px rgba(129,140,248,0.7))')
          d3.select(this).select('text')
            .style('fill', 'var(--text)')
            .style('font-size', '11px')
            .style('opacity', 1)
        })
        .on('mouseleave', function (_, d) {
          d3.select(this).select('circle')
            .transition().duration(150)
            .attr('r', d.real ? 8 : 5)
            .style('filter', 'none')
          d3.select(this).select('text')
            .style('fill', 'var(--text3)')
            .style('font-size', d.real ? '10px' : '9px')
            .style('opacity', d.real ? 1 : 0.6)
        })
        .on('click', (_, d) => selectNode(d.id, d.real ?? true))

      const drag = d3.drag<SVGGElement, GraphNode>()
        .on('start', (event, d) => {
          if (!event.active) simulation.alphaTarget(0.3).restart()
          d.fx = d.x; d.fy = d.y
        })
        .on('drag', (event, d) => { d.fx = event.x; d.fy = event.y })
        .on('end', (event, d) => {
          if (!event.active) simulation.alphaTarget(0)
          d.fx = null; d.fy = null
        })

      node.call(drag as any)

      simulation.on('tick', () => {
        link
          .attr('x1', (d) => (d.source as any).x)
          .attr('y1', (d) => (d.source as any).y)
          .attr('x2', (d) => (d.target as any).x)
          .attr('y2', (d) => (d.target as any).y)
        node.attr('transform', (d) => `translate(${d.x ?? 0},${d.y ?? 0})`)
      })

      return () => simulation.stop()
    })
  }, [])

  // Highlight [[link]] text in context snippet
  const highlightCtx = (ctx: string, name: string) => {
    const parts = ctx.split(new RegExp(`(\\[\\[${name}\\]\\])`, 'g'))
    return parts.map((p, i) =>
      p === `[[${name}]]`
        ? <mark key={i} style={{ background: 'rgba(129,140,248,.25)', color: 'var(--indigo)', borderRadius: 2, padding: '0 2px' }}>{p}</mark>
        : <span key={i}>{p}</span>
    )
  }

  return (
    <div className="flex h-full overflow-hidden" style={{ background: 'var(--bg)' }}>
      {/* Main graph area */}
      <div className="flex flex-col flex-1 overflow-hidden">
        <div
          className="flex items-center px-4 py-2 flex-shrink-0 text-xs"
          style={{ background: 'var(--bg2)', borderBottom: '1px solid var(--border)', color: 'var(--text3)' }}
        >
          <span className="font-bold" style={{ color: 'var(--text)' }}>Knowledge Graph</span>
          <span className="ml-2">Click a node to see backlinks · Drag · Scroll to zoom</span>
          <span className="ml-2 opacity-50">● real note &nbsp; ○ referenced link</span>
        </div>
        <svg
          ref={svgRef}
          className="flex-1 w-full"
          style={{ background: 'var(--bg)' }}
        />
      </div>

      {/* Node detail panel */}
      {selectedNode && (
        <div
          className="flex flex-col flex-shrink-0 overflow-hidden"
          style={{ width: 320, borderLeft: '1px solid var(--border)', background: 'var(--bg2)' }}
        >
          {/* Header */}
          <div
            className="flex items-center justify-between px-3 py-2 flex-shrink-0"
            style={{ borderBottom: '1px solid var(--border)' }}
          >
            <div className="flex-1 min-w-0">
              <div className="text-xs font-semibold truncate" style={{ color: 'var(--text)' }}>{selectedNode}</div>
              <div className="text-[10px]" style={{ color: 'var(--text3)' }}>
                {loadingCtx ? 'Cargando…' : `${backlinks.length} referencia${backlinks.length !== 1 ? 's' : ''}`}
              </div>
            </div>
            <div className="flex items-center gap-1 ml-2">
              {selectedIsReal && (
                <button
                  onClick={() => openNoteInEditor(selectedNode)}
                  title="Abrir en editor"
                  className="flex items-center gap-1 px-2 py-1 rounded text-[10px]"
                  style={{ background: 'var(--indigo-dim)', color: 'var(--indigo)', border: '1px solid rgba(129,140,248,.25)' }}
                >
                  <ExternalLink size={9} /> Editar
                </button>
              )}
              <button onClick={() => setSelectedNode(null)} style={{ color: 'var(--text3)' }}>
                <X size={13} />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {/* Note content preview */}
            {selectedIsReal && noteContent !== null && (
              <div style={{ borderBottom: '1px solid var(--border)' }}>
                <button
                  className="w-full flex items-center justify-between px-3 py-1.5 text-[10px]"
                  style={{ color: 'var(--text3)', background: 'var(--bg3)' }}
                  onClick={() => setNoteExpanded((v) => !v)}
                >
                  <span className="font-semibold uppercase tracking-wider">Vista previa</span>
                  {noteExpanded ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
                </button>
                {noteExpanded && (
                  <div className="px-3 py-2" style={{ maxHeight: 320, overflowY: 'auto' }}>
                    <NotePreview content={noteContent} />
                  </div>
                )}
              </div>
            )}

            {/* Backlinks */}
            <div className="py-2 px-2 flex flex-col gap-2">
              {backlinks.length === 0 && !loadingCtx && (
                <div className="text-center text-xs mt-4" style={{ color: 'var(--text3)' }}>
                  Sin referencias
                </div>
              )}
              {backlinks.length > 0 && (
                <div className="text-[9px] font-bold uppercase tracking-wider px-1 pt-1 pb-0.5" style={{ color: 'var(--text3)' }}>
                  Mencionado en
                </div>
              )}
              {backlinks.map((bl, i) => (
                <div
                  key={i}
                  className="rounded p-2 cursor-pointer"
                  style={{ background: 'var(--bg3)', border: '1px solid var(--border)' }}
                  onClick={() => openNoteInEditor(bl.note)}
                >
                  <div className="flex items-center gap-1 mb-1">
                    <FileText size={10} style={{ color: 'var(--indigo)', flexShrink: 0 }} />
                    <span className="text-[10px] font-semibold" style={{ color: 'var(--indigo)' }}>{bl.note}.md</span>
                  </div>
                  <div className="text-[10px] leading-[1.5]" style={{ color: 'var(--text2)' }}>
                    …{highlightCtx(bl.ctx, selectedNode)}…
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
