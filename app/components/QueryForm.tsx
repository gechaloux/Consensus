'use client'

import { useState } from 'react'

interface Props {
  onSubmit: (question: string) => void
  loading: boolean
}

export default function QueryForm({ onSubmit, loading }: Props) {
  const [question, setQuestion] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (question.trim() && !loading) onSubmit(question.trim())
  }

  return (
    <form className="cq-form" onSubmit={handleSubmit}>
      <textarea
        className="cq-textarea"
        value={question}
        onChange={e => setQuestion(e.target.value)}
        placeholder="Ask a question…"
        rows={3}
        disabled={loading}
        onKeyDown={e => {
          if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit(e) }
        }}
      />
      <div className="cq-form-row">
        <div className="cq-form-hint">
          <span className="cq-kbd">↵</span>
          <span>to submit</span>
          <span style={{ marginLeft: 4, color: 'var(--text-faint)' }}>· Shift+↵ for newline</span>
        </div>
        <button
          type="submit"
          className="cq-btn-primary"
          disabled={!question.trim() || loading}
        >
          {loading ? (
            <>
              <span className="cq-spinner" aria-hidden="true" />
              <span>Querying…</span>
            </>
          ) : (
            'Ask all models'
          )}
        </button>
      </div>
    </form>
  )
}
