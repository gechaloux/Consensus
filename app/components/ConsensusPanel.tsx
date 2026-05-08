'use client'

import { ConsensusResult, MODELS, ModelId } from '@/types'

interface Props {
  result: ConsensusResult
  error?: string
}

function modelInfo(id: ModelId) {
  return MODELS.find(m => m.id === id)!
}

export default function ConsensusPanel({ result, error }: Props) {
  if (error) {
    return (
      <div className="cq-consensus-unavail">
        Consensus unavailable — {error}
      </div>
    )
  }

  const reached = result.consensusReached
  const modelIds = Object.keys(result.similarityMatrix) as ModelId[]

  return (
    <section className="cq-consensus">
      <div className="cq-consensus-head">
        <div className="cq-consensus-title">
          <span
            className="cq-consensus-dot"
            style={{ backgroundColor: reached ? '#10B981' : '#EAB308' }}
          />
          <span>{reached ? 'Consensus reached' : 'No consensus'}</span>
          <span className="cq-consensus-sub">
            {reached
              ? 'Models converge on a shared answer'
              : 'Responses diverge across models'}
          </span>
        </div>
        <div className="cq-consensus-pct">
          <span className="cq-consensus-pct-num">{Math.round(result.agreementPct)}%</span>
          <span className="cq-consensus-pct-lbl">avg agreement</span>
        </div>
      </div>

      <div className="cq-consensus-chips">
        <div className="cq-chip-group">
          <div className="cq-chip-label">In agreement ({result.largestClusterModels.length})</div>
          <div className="cq-chip-row">
            {result.largestClusterModels.length === 0 ? (
              <div className="cq-chip-empty">— none —</div>
            ) : result.largestClusterModels.map(id => {
              const m = modelInfo(id)
              return (
                <span key={id} className="cq-chip cq-chip-pos">
                  <span className="cq-chip-mark" style={{ backgroundColor: m.color }} />
                  {m.name}
                </span>
              )
            })}
          </div>
        </div>
        <div className="cq-chip-group">
          <div className="cq-chip-label">Dissenting ({result.outlierModels.length})</div>
          <div className="cq-chip-row">
            {result.outlierModels.length === 0 ? (
              <div className="cq-chip-empty">— none —</div>
            ) : result.outlierModels.map(id => {
              const m = modelInfo(id)
              return (
                <span key={id} className="cq-chip cq-chip-neg">
                  <span className="cq-chip-mark" style={{ backgroundColor: m.color }} />
                  {m.name}
                </span>
              )
            })}
          </div>
        </div>
      </div>

      <div className="cq-matrix-wrap">
        <div className="cq-matrix-label">Pairwise similarity</div>
        <table className="cq-matrix">
          <thead>
            <tr>
              <th />
              {modelIds.map(id => (
                <th key={id}>{modelInfo(id).name}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {modelIds.map(rowId => (
              <tr key={rowId}>
                <th>{modelInfo(rowId).name}</th>
                {modelIds.map(colId => {
                  if (rowId === colId) {
                    return <td key={colId} className="cq-cell cq-cell-self">—</td>
                  }
                  const score = result.similarityMatrix[rowId][colId]
                  const cls = score >= 0.85 ? 'cq-cell-hi' : score >= 0.70 ? 'cq-cell-mid' : 'cq-cell-lo'
                  return (
                    <td key={colId} className={`cq-cell ${cls}`}>
                      {score.toFixed(2)}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}
