'use client'

import { ModelInfo } from '@/types'

interface ModelState {
  text: string
  done: boolean
  latencyMs?: number
  error?: string
}

interface Props {
  model: ModelInfo
  state?: ModelState
}

function tint(hex: string, alpha: number): string {
  const h = hex.replace('#', '')
  const r = parseInt(h.slice(0, 2), 16)
  const g = parseInt(h.slice(2, 4), 16)
  const b = parseInt(h.slice(4, 6), 16)
  const mix = (c: number) => Math.round(c * alpha + 255 * (1 - alpha))
  return `rgb(${mix(r)}, ${mix(g)}, ${mix(b)})`
}

export default function ModelCard({ model, state }: Props) {
  const streaming = !state?.done && !!state?.text
  const waiting = !state?.done && !state?.text && !state?.error
  const hasError = !!state?.error

  return (
    <article className="cq-card">
      <header
        className="cq-card-head"
        style={{
          borderBottomColor: model.color,
          backgroundColor: tint(model.color, 0.08),
        }}
      >
        <div>
          <div className="cq-card-name">{model.name}</div>
          <div className="cq-card-provider">{model.provider}</div>
        </div>
        <div className="cq-card-status">
          {streaming && <span className="cq-pulse" aria-label="streaming" />}
          {state?.done && !hasError && state.latencyMs && (
            <span className="cq-latency">{(state.latencyMs / 1000).toFixed(1)}s</span>
          )}
          {hasError && <span className="cq-status-err">err</span>}
        </div>
      </header>

      <div className="cq-card-body">
        {waiting && (
          <div className="cq-body-waiting">Waiting for response…</div>
        )}
        {streaming && (
          <div className="cq-body-text">
            {state!.text}
            <span className="cq-cursor" />
          </div>
        )}
        {state?.done && !hasError && (
          <div className="cq-body-text">{state.text}</div>
        )}
        {hasError && (
          <div className="cq-body-error">
            <div className="cq-body-error-title">Request failed</div>
            <div className="cq-body-error-msg">{state!.error}</div>
          </div>
        )}
      </div>
    </article>
  )
}
