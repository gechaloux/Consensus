/* Consensus — main app: design canvas with 12 artboards.
   The "idle page" artboard is fully interactive when focused. */
const { useState, useEffect, useRef, useMemo } = React;

// === sample data =========================================================

const SAMPLE_QUESTION =
  "Should I learn TypeScript in 2026 if I already know JavaScript?";

const RESPONSES = {
  gpt4o: {
    text:
      "Yes — TypeScript is effectively the default for serious JavaScript work in 2026. Static typing catches a class of bugs at edit time, the editor tooling (autocomplete, refactors, navigation) is dramatically better, and most popular libraries ship with first-class types. Adoption is widespread and the cost to opt in is small if you already know JS.",
    latency: "2.1s",
  },
  claude: {
    text:
      "Yes, you should. If you already write JavaScript, TypeScript is a low-friction upgrade — the syntax is a strict superset, so existing code keeps working while you progressively add types. The real win is the tooling: large refactors become safe, and the type system catches a meaningful share of bugs before they ever run. Most modern frameworks assume TS.",
    latency: "2.4s",
  },
  gemini: {
    text:
      "Yes. TypeScript has become the standard for large JavaScript codebases. Coming from JS you'll be productive within a few days — the runtime is identical, you're really just learning the type annotations. Benefits: fewer runtime errors, better IDE support, easier refactors, and most teams now expect it.",
    latency: "1.8s",
  },
  llama: {
    text:
      "Yes. TypeScript is essentially a requirement for professional JS work today. Since it's a superset of JavaScript, the learning curve is gentle: you can adopt types incrementally. The payoff is significant — better tooling, safer refactors, and clearer interfaces between modules. The ecosystem (React, Node, Vue, etc.) is fully on board.",
    latency: "2.7s",
  },
};

// matrix for "consensus reached"
const MATRIX_REACHED = [
  [1.00, 0.91, 0.86, 0.88],
  [0.91, 1.00, 0.84, 0.89],
  [0.86, 0.84, 1.00, 0.85],
  [0.88, 0.89, 0.85, 1.00],
];
const PERCENT_REACHED = 87;

// matrix for "no consensus" — Gemini dissents
const MATRIX_DIVIDED = [
  [1.00, 0.93, 0.41, 0.89],
  [0.93, 1.00, 0.43, 0.87],
  [0.41, 0.43, 1.00, 0.39],
  [0.89, 0.87, 0.39, 1.00],
];
const PERCENT_DIVIDED = 65;

const STREAMING_PARTIAL =
  "Yes, you should. If you already write JavaScript, TypeScript is a low-friction upgrade — the syntax is a strict superset, so existing code keeps working while you progressively add";

const ERROR_MSG = "ECONNRESET — connection reset after 12.4s. Check your API key or network.";

// === Page renderers (composed from primitives) ===========================

function PageIdle() {
  return (
    <FullPage>
      <QueryForm value="" onChange={() => {}} loading={false} />
      <div className="cq-grid cq-grid-force-4">
        {MODELS.map((m) => (
          <ModelCard key={m.id} model={m} state="waiting" />
        ))}
      </div>
      <div className="cq-consensus-unavail" style={{ borderStyle: "dashed", color: "var(--text-faint)" }}>
        Consensus will appear here after all models respond.
      </div>
    </FullPage>
  );
}

function PageLoading() {
  // partial streams across the four cards at varying levels
  const partials = {
    gpt4o:  "Yes — TypeScript is effectively the default for serious JavaScript work in 2026. Static typing catches a class of bugs at edit time, the editor tooling",
    claude: "Yes, you should. If you already write JavaScript, TypeScript is a low-friction upgrade — the syntax is a strict superset, so existing code keeps working",
    gemini: RESPONSES.gemini.text, // gemini finished early
    llama:  "Yes. TypeScript is essentially a",
  };
  const states = {
    gpt4o:  "streaming",
    claude: "streaming",
    gemini: "done",
    llama:  "streaming",
  };
  return (
    <FullPage>
      <QueryForm value={SAMPLE_QUESTION} onChange={() => {}} loading={true} />
      <div className="cq-grid cq-grid-force-4">
        {MODELS.map((m) => (
          <ModelCard
            key={m.id}
            model={m}
            state={states[m.id]}
            text={partials[m.id]}
            latency={m.id === "gemini" ? RESPONSES.gemini.latency : undefined}
          />
        ))}
      </div>
      <div className="cq-consensus-unavail">
        Computing consensus once all models have responded…
      </div>
    </FullPage>
  );
}

function PageComplete({ matrix = MATRIX_REACHED, percent = PERCENT_REACHED, status = "reached", agreeing, dissenting }) {
  return (
    <FullPage>
      <QueryForm value={SAMPLE_QUESTION} onChange={() => {}} loading={false} />
      <div className="cq-grid cq-grid-force-4">
        {MODELS.map((m) => (
          <ModelCard
            key={m.id}
            model={m}
            state="done"
            text={RESPONSES[m.id].text}
            latency={RESPONSES[m.id].latency}
          />
        ))}
      </div>
      <ConsensusPanel
        status={status}
        percent={percent}
        models={MODELS}
        matrix={matrix}
        agreeing={agreeing ?? MODELS}
        dissenting={dissenting ?? []}
      />
    </FullPage>
  );
}

// Fully interactive page: you can actually type & submit & watch streams
function PageInteractive() {
  const [q, setQ] = useState(SAMPLE_QUESTION);
  // per-model state + accumulated text + latency
  const [states, setStates] = useState(() =>
    Object.fromEntries(MODELS.map((m) => [m.id, { state: "waiting", text: "", latency: null }]))
  );
  const [phase, setPhase] = useState("idle"); // idle | running | complete
  const timersRef = useRef([]);

  const reset = () => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
    setStates(Object.fromEntries(MODELS.map((m) => [m.id, { state: "waiting", text: "", latency: null }])));
    setPhase("idle");
  };

  const run = () => {
    reset();
    setPhase("running");

    // schedule each model: starts after small delay, streams chunked text, finishes
    MODELS.forEach((m, idx) => {
      const startDelay = 120 + idx * 90 + Math.random() * 200;
      const finishAt = 1400 + idx * 300 + Math.random() * 600;
      const fullText = RESPONSES[m.id].text;
      // begin streaming
      timersRef.current.push(setTimeout(() => {
        setStates((prev) => ({ ...prev, [m.id]: { ...prev[m.id], state: "streaming", text: "" } }));
      }, startDelay));

      // chunked text — split into ~20-char chunks
      const chunkSize = 22;
      const chunks = [];
      for (let i = 0; i < fullText.length; i += chunkSize) {
        chunks.push(fullText.slice(0, i + chunkSize));
      }
      chunks.forEach((partial, ci) => {
        const t = startDelay + 60 + (ci * (finishAt - startDelay - 60)) / chunks.length;
        timersRef.current.push(setTimeout(() => {
          setStates((prev) => prev[m.id].state === "streaming"
            ? { ...prev, [m.id]: { ...prev[m.id], text: partial } }
            : prev
          );
        }, t));
      });

      // finish
      timersRef.current.push(setTimeout(() => {
        setStates((prev) => ({
          ...prev,
          [m.id]: { state: "done", text: fullText, latency: RESPONSES[m.id].latency },
        }));
      }, finishAt));
    });

    // overall complete
    const overall = 1400 + (MODELS.length - 1) * 300 + 700;
    timersRef.current.push(setTimeout(() => setPhase("complete"), overall));
  };

  useEffect(() => () => timersRef.current.forEach(clearTimeout), []);

  const allWaiting = phase === "idle";
  const showConsensus = phase === "complete";

  return (
    <FullPage>
      <QueryForm
        value={q}
        onChange={setQ}
        onSubmit={run}
        loading={phase === "running"}
      />
      <div className="cq-grid cq-grid-force-4">
        {MODELS.map((m) => {
          const s = states[m.id];
          return (
            <ModelCard
              key={m.id}
              model={m}
              state={s.state}
              text={s.text}
              latency={s.latency}
            />
          );
        })}
      </div>

      {showConsensus ? (
        <ConsensusPanel
          status="reached"
          percent={PERCENT_REACHED}
          models={MODELS}
          matrix={MATRIX_REACHED}
          agreeing={MODELS}
          dissenting={[]}
        />
      ) : (
        <div className="cq-consensus-unavail" style={{ borderStyle: "dashed", color: allWaiting ? "var(--text-faint)" : "var(--text-mute)" }}>
          {allWaiting
            ? "Consensus will appear here after all models respond."
            : "Computing consensus once all models have responded…"}
        </div>
      )}

      {showConsensus && (
        <div style={{ display: "flex", justifyContent: "center", marginTop: -8 }}>
          <button className="cq-btn-primary" onClick={reset}
            style={{ background: "transparent", color: "var(--text-soft)", border: "1px solid var(--border-strong)" }}>
            ↻ Reset
          </button>
        </div>
      )}
    </FullPage>
  );
}

// === App: lays out 12 artboards across 4 sections ========================

function App() {
  return (
    <DCFrameProvider>
      <DCRoot>
        <DCSection
          id="pages"
          title="Page states"
          subtitle="Three states the user moves through. Click the first to interact."
        >
          <DCArtboard id="P1" label="Idle (interactive)" width={1280} height={920}>
            <PageInteractive />
          </DCArtboard>
          <DCArtboard id="P2" label="Loading — partial streams" width={1280} height={920}>
            <PageLoading />
          </DCArtboard>
          <DCArtboard id="P3" label="Complete — consensus reached" width={1280} height={1380}>
            <PageComplete />
          </DCArtboard>
        </DCSection>

        <DCSection
          id="form"
          title="Query form"
          subtitle="Idle and submitting."
        >
          <DCArtboard id="F1" label="Default" width={920} height={240}>
            <div className="cq-frame-pad">
              <QueryForm value="" onChange={() => {}} loading={false} />
            </div>
          </DCArtboard>
          <DCArtboard id="F2" label="Loading" width={920} height={240}>
            <div className="cq-frame-pad">
              <QueryForm value={SAMPLE_QUESTION} onChange={() => {}} loading={true} />
            </div>
          </DCArtboard>
        </DCSection>

        <DCSection
          id="card"
          title="Model card"
          subtitle="Four content states. Fixed 288px height; body scrolls when long."
        >
          <DCArtboard id="C1" label="Waiting" width={520} height={344}>
            <div className="cq-frame-pad-tight">
              <ModelCard model={MODELS[0]} state="waiting" />
            </div>
          </DCArtboard>
          <DCArtboard id="C2" label="Streaming" width={520} height={344}>
            <div className="cq-frame-pad-tight">
              <ModelCard
                model={MODELS[1]}
                state="streaming"
                text={STREAMING_PARTIAL}
              />
            </div>
          </DCArtboard>
          <DCArtboard id="C3" label="Done" width={520} height={344}>
            <div className="cq-frame-pad-tight">
              <ModelCard
                model={MODELS[2]}
                state="done"
                text={RESPONSES.gemini.text}
                latency="1.8s"
              />
            </div>
          </DCArtboard>
          <DCArtboard id="C4" label="Error" width={520} height={344}>
            <div className="cq-frame-pad-tight">
              <ModelCard
                model={MODELS[3]}
                state="error"
                error={ERROR_MSG}
              />
            </div>
          </DCArtboard>
        </DCSection>

        <DCSection
          id="consensus"
          title="Consensus panel"
          subtitle="Reached, divided, and unavailable."
        >
          <DCArtboard id="X1" label="Consensus reached" width={920} height={620}>
            <div className="cq-frame-pad">
              <ConsensusPanel
                status="reached"
                percent={PERCENT_REACHED}
                models={MODELS}
                matrix={MATRIX_REACHED}
                agreeing={MODELS}
                dissenting={[]}
              />
            </div>
          </DCArtboard>
          <DCArtboard id="X2" label="No consensus" width={920} height={620}>
            <div className="cq-frame-pad">
              <ConsensusPanel
                status="none"
                percent={PERCENT_DIVIDED}
                models={MODELS}
                matrix={MATRIX_DIVIDED}
                agreeing={[MODELS[0], MODELS[1], MODELS[3]]}
                dissenting={[MODELS[2]]}
              />
            </div>
          </DCArtboard>
          <DCArtboard id="X3" label="Unavailable (Ollama offline)" width={920} height={140}>
            <div className="cq-frame-pad">
              <ConsensusPanel
                status="unavailable"
                reason="Ollama embedding service offline"
                models={MODELS}
              />
            </div>
          </DCArtboard>
        </DCSection>
      </DCRoot>
    </DCFrameProvider>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
