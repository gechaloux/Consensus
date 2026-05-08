/* Consensus app components — pure presentation, controlled by props. */
const { useState: useStateC, useEffect: useEffectC, useRef: useRefC } = React;

// --- model registry ---
const MODELS = [
  { id: "gpt4o",    name: "GPT-4o",          provider: "OpenAI",    color: "#74AA9C", short: "GPT-4o" },
  { id: "claude",   name: "Claude Sonnet",   provider: "Anthropic", color: "#D97706", short: "Claude" },
  { id: "gemini",   name: "Gemini Flash",    provider: "Google",    color: "#4285F4", short: "Gemini" },
  { id: "llama",    name: "Llama 3.3 70B",   provider: "Meta",      color: "#7C3AED", short: "Llama" },
];

// --- QueryForm -------------------------------------------------------------
function QueryForm({ value, onChange, onSubmit, loading, placeholder }) {
  return (
    <form
      className="cq-form"
      onSubmit={(e) => { e.preventDefault(); if (!loading) onSubmit?.(); }}
    >
      <textarea
        className="cq-textarea"
        rows={3}
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        placeholder={placeholder ?? "Ask a question…"}
        disabled={loading}
      />
      <div className="cq-form-row">
        <div className="cq-form-hint">
          <span className="cq-kbd">⌘</span><span className="cq-kbd">↵</span>
          <span>to submit</span>
        </div>
        <button
          type="submit"
          className="cq-btn-primary"
          disabled={loading || !value?.trim()}
        >
          {loading ? (
            <>
              <span className="cq-spinner" aria-hidden="true" />
              <span>Querying…</span>
            </>
          ) : (
            <>Ask all models</>
          )}
        </button>
      </div>
    </form>
  );
}

// --- ModelCard -------------------------------------------------------------
// state: 'waiting' | 'streaming' | 'done' | 'error'
function ModelCard({ model, state, text, latency, error }) {
  return (
    <article className="cq-card" data-state={state}>
      <header
        className="cq-card-head"
        style={{
          borderBottomColor: model.color,
          backgroundColor: tint(model.color, 0.08),
        }}
      >
        <div className="cq-card-meta">
          <div className="cq-card-name">{model.name}</div>
          <div className="cq-card-provider">{model.provider}</div>
        </div>
        <div className="cq-card-status">
          {state === "streaming" ? (
            <span className="cq-pulse" aria-label="streaming" />
          ) : state === "done" ? (
            <span className="cq-latency">{latency}</span>
          ) : state === "error" ? (
            <span className="cq-status-err">error</span>
          ) : null}
        </div>
      </header>
      <div className="cq-card-body">
        {state === "waiting" && (
          <div className="cq-body-waiting">Waiting for response…</div>
        )}
        {state === "streaming" && (
          <div className="cq-body-text">
            {text}
            <span className="cq-cursor" />
          </div>
        )}
        {state === "done" && (
          <div className="cq-body-text">{text}</div>
        )}
        {state === "error" && (
          <div className="cq-body-error">
            <div className="cq-body-error-title">Request failed</div>
            <div className="cq-body-error-msg">{error}</div>
          </div>
        )}
      </div>
    </article>
  );
}

// hex tint helper — overlay color over white at given opacity
function tint(hex, alpha) {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  const mix = (c) => Math.round(c * alpha + 255 * (1 - alpha));
  return `rgb(${mix(r)}, ${mix(g)}, ${mix(b)})`;
}

// --- ConsensusPanel --------------------------------------------------------
// status: 'reached' | 'none' | 'unavailable'
function ConsensusPanel({ status, percent, agreeing, dissenting, matrix, models, reason }) {
  if (status === "unavailable") {
    return (
      <div className="cq-consensus-unavail">
        Consensus unavailable — {reason}
      </div>
    );
  }

  const reached = status === "reached";
  return (
    <section className="cq-consensus">
      <div className="cq-consensus-head">
        <div className="cq-consensus-title">
          <span
            className="cq-consensus-dot"
            style={{ backgroundColor: reached ? "#10B981" : "#EAB308" }}
          />
          <span>{reached ? "Consensus reached" : "No consensus"}</span>
          <span className="cq-consensus-sub">
            {reached
              ? "Models converge on a shared answer"
              : "Responses diverge across models"}
          </span>
        </div>
        <div className="cq-consensus-pct">
          <span className="cq-consensus-pct-num">{percent}%</span>
          <span className="cq-consensus-pct-lbl">avg agreement</span>
        </div>
      </div>

      <div className="cq-consensus-chips">
        <div className="cq-chip-group">
          <div className="cq-chip-label">In agreement ({agreeing.length})</div>
          <div className="cq-chip-row">
            {agreeing.length === 0 ? (
              <div className="cq-chip-empty">— none —</div>
            ) : agreeing.map((m) => (
              <span key={m.id} className="cq-chip cq-chip-pos">
                <span className="cq-chip-mark" style={{ backgroundColor: m.color }} />
                {m.short}
              </span>
            ))}
          </div>
        </div>
        <div className="cq-chip-group">
          <div className="cq-chip-label">Dissenting ({dissenting.length})</div>
          <div className="cq-chip-row">
            {dissenting.length === 0 ? (
              <div className="cq-chip-empty">— none —</div>
            ) : dissenting.map((m) => (
              <span key={m.id} className="cq-chip cq-chip-neg">
                <span className="cq-chip-mark" style={{ backgroundColor: m.color }} />
                {m.short}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="cq-matrix-wrap">
        <div className="cq-matrix-label">Pairwise similarity</div>
        <table className="cq-matrix">
          <thead>
            <tr>
              <th></th>
              {models.map((m) => <th key={m.id}>{m.short}</th>)}
            </tr>
          </thead>
          <tbody>
            {models.map((rowM, ri) => (
              <tr key={rowM.id}>
                <th>{rowM.short}</th>
                {models.map((colM, ci) => {
                  const v = matrix[ri][ci];
                  if (ri === ci) return <td key={colM.id} className="cq-cell cq-cell-self">—</td>;
                  const cls =
                    v >= 0.85 ? "cq-cell-hi" :
                    v >= 0.70 ? "cq-cell-mid" : "cq-cell-lo";
                  return (
                    <td key={colM.id} className={`cq-cell ${cls}`}>
                      {v.toFixed(2)}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

// --- Full page shell -------------------------------------------------------
function FullPage({ children }) {
  return (
    <div className="cq-page">
      <div className="cq-container">
        <header className="cq-page-head">
          <h1 className="cq-page-title">Consensus</h1>
          <p className="cq-page-tag">Ask a question. See where models agree.</p>
        </header>
        {children}
      </div>
    </div>
  );
}

Object.assign(window, {
  MODELS,
  QueryForm,
  ModelCard,
  ConsensusPanel,
  FullPage,
  tint,
});
