/* Lightweight design canvas: vertical sections with horizontal artboard rows.
   Click any artboard to open it fullscreen; ←/→/Esc to navigate. */
const { useState, useEffect, useRef, useCallback } = React;

function DCRoot({ children }) {
  return (
    <div className="dc-root">
      <div className="dc-topbar">
        <div className="dc-topbar-title">Consensus — Design Canvas</div>
        <div className="dc-topbar-meta">12 states · Click any frame to focus</div>
      </div>
      <div className="dc-stage">{children}</div>
    </div>
  );
}

function DCSection({ id, title, subtitle, children }) {
  return (
    <section className="dc-section" id={id}>
      <div className="dc-section-head">
        <div className="dc-section-title">{title}</div>
        {subtitle ? <div className="dc-section-subtitle">{subtitle}</div> : null}
      </div>
      <div className="dc-row">{children}</div>
    </section>
  );
}

const FocusContext = React.createContext(null);

function DCFrameProvider({ children }) {
  const [frames, setFrames] = useState([]);
  const [focusId, setFocusId] = useState(null);

  const register = useCallback((id, meta) => {
    setFrames((prev) => {
      const existing = prev.findIndex((f) => f.id === id);
      if (existing >= 0) {
        const next = prev.slice();
        next[existing] = { id, ...meta };
        return next;
      }
      return [...prev, { id, ...meta }];
    });
    return () => setFrames((prev) => prev.filter((f) => f.id !== id));
  }, []);

  const focusIndex = focusId ? frames.findIndex((f) => f.id === focusId) : -1;

  const next = useCallback(() => {
    if (focusIndex < 0 || frames.length === 0) return;
    setFocusId(frames[(focusIndex + 1) % frames.length].id);
  }, [focusIndex, frames]);

  const prev = useCallback(() => {
    if (focusIndex < 0 || frames.length === 0) return;
    setFocusId(frames[(focusIndex - 1 + frames.length) % frames.length].id);
  }, [focusIndex, frames]);

  useEffect(() => {
    const onKey = (e) => {
      if (focusId == null) return;
      if (e.key === "Escape") setFocusId(null);
      else if (e.key === "ArrowRight") next();
      else if (e.key === "ArrowLeft") prev();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [focusId, next, prev]);

  const focusFrame = focusId ? frames.find((f) => f.id === focusId) : null;

  return (
    <FocusContext.Provider value={{ register, setFocusId, focusId }}>
      {children}
      {focusFrame ? (
        <FocusOverlay
          frame={focusFrame}
          onClose={() => setFocusId(null)}
          onNext={next}
          onPrev={prev}
          index={focusIndex}
          total={frames.length}
        />
      ) : null}
    </FocusContext.Provider>
  );
}

function FocusOverlay({ frame, onClose, onNext, onPrev, index, total }) {
  return (
    <div className="dc-overlay" onClick={onClose}>
      <div className="dc-overlay-bar">
        <button className="dc-overlay-btn" onClick={(e) => { e.stopPropagation(); onPrev(); }}>← Prev</button>
        <div className="dc-overlay-label">
          <span className="dc-overlay-counter">{String(index + 1).padStart(2, "0")} / {String(total).padStart(2, "0")}</span>
          <span className="dc-overlay-title">{frame.label}</span>
        </div>
        <button className="dc-overlay-btn" onClick={(e) => { e.stopPropagation(); onNext(); }}>Next →</button>
        <button className="dc-overlay-btn dc-overlay-close" onClick={(e) => { e.stopPropagation(); onClose(); }}>Esc</button>
      </div>
      <div className="dc-overlay-stage" onClick={(e) => e.stopPropagation()}>
        <div
          className="dc-overlay-frame"
          style={{ width: frame.width, height: frame.height }}
        >
          {frame.render()}
        </div>
      </div>
    </div>
  );
}

function DCArtboard({ id, label, width, height, children }) {
  const ctx = React.useContext(FocusContext);
  const renderRef = useRef(null);
  renderRef.current = () => children;

  useEffect(() => {
    return ctx.register(id, { id, label, width, height, render: () => renderRef.current() });
  }, [id, label, width, height]);

  // Scale to fit a max preview width while keeping the actual board at design size.
  const previewMaxW = Math.min(width, 560);
  const scale = previewMaxW / width;
  const previewH = height * scale;

  return (
    <figure className="dc-artboard" onClick={() => ctx.setFocusId(id)}>
      <div className="dc-artboard-preview" style={{ width: previewMaxW, height: previewH }}>
        <div
          className="dc-artboard-inner"
          style={{
            width,
            height,
            transform: `scale(${scale})`,
            transformOrigin: "top left",
          }}
        >
          {children}
        </div>
      </div>
      <figcaption className="dc-artboard-cap">
        <span className="dc-artboard-id">{id}</span>
        <span className="dc-artboard-label">{label}</span>
        <span className="dc-artboard-dim">{width}×{height}</span>
      </figcaption>
    </figure>
  );
}

window.DCRoot = DCRoot;
window.DCSection = DCSection;
window.DCArtboard = DCArtboard;
window.DCFrameProvider = DCFrameProvider;
