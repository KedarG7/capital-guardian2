import React, { useEffect, useState } from 'react'
import { SectionHeading, amount, signedPercent, percent } from '../components/dashboard/Shared.jsx'
import { getDecisionHistory } from '../services/api.js'

export default function DecisionHistory({ navigate }) {
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  
  useEffect(() => {
    let mounted = true
    
    async function loadHistory() {
      try {
        setLoading(true)
        const response = await getDecisionHistory()
        if (mounted) {
          setHistory(response.decisions || [])
        }
      } catch (e) {
        if (mounted) setError('Unable to load decision history.')
      } finally {
        if (mounted) setLoading(false)
      }
    }
    
    loadHistory()
    
    return () => { mounted = false }
  }, [])
  
  if (loading) {
    return (
      <section className="panel">
        <SectionHeading kicker="Audit Trail" title="Decision History" />
        <p>Loading decision history...</p>
      </section>
    )
  }
  
  if (error) {
    return (
      <section className="panel">
        <SectionHeading kicker="Audit Trail" title="Decision History" />
        <p>{error}</p>
      </section>
    )
  }
  
  if (!history.length) {
    return (
      <section className="panel">
        <SectionHeading kicker="Audit Trail" title="Decision History" />
        <p>No decisions yet. Capital Guardian will record meaningful risk events and recommendations here.</p>
      </section>
    )
  }
  
  return (
    <section className="panel">
      <SectionHeading kicker="Audit Trail" title="Decision History" />
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        {history.map((decision, i) => (
          <div key={decision.eventId || i} style={{ border: '1px solid var(--border-color)', padding: '24px', borderRadius: '12px', background: 'var(--card-background)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
              <strong>{new Date(decision.timestamp).toLocaleString()}</strong>
              <div style={{ display: 'flex', gap: '8px' }}>
                <span className={`pill ${decision.riskAssessment?.status?.toLowerCase()}`}>{decision.riskAssessment?.status} RISK</span>
                <span className={`pill ${decision.mode === 'DEMO' || decision.mode === 'HYPOTHETICAL' ? 'demo' : ''}`}>{decision.mode}</span>
              </div>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '32px' }}>
              <div>
                <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', color: 'var(--text-secondary)' }}>Market Event</h4>
                {decision.marketEvent?.type && <p style={{ margin: '4px 0' }}>Type: {decision.marketEvent.type}</p>}
                {decision.marketEvent?.severity && <p style={{ margin: '4px 0' }}>Severity: {decision.marketEvent.severity}</p>}
                {decision.marketEvent?.affectedAssets && decision.marketEvent.affectedAssets.map(asset => (
                  <p key={asset.symbol} style={{ margin: '4px 0', display: 'flex', justifyContent: 'space-between' }}>
                    <span>{asset.symbol}</span>
                    <strong className={asset.changePercent < 0 ? 'negative-text' : 'positive-text'}>
                      {signedPercent(asset.changePercent)}
                    </strong>
                  </p>
                ))}
              </div>
              
              <div>
                <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', color: 'var(--text-secondary)' }}>Portfolio Snapshot</h4>
                <p style={{ margin: '4px 0', display: 'flex', justifyContent: 'space-between' }}>
                  <span>Value</span>
                  <strong>{amount(decision.portfolioSnapshot?.portfolioValue)}</strong>
                </p>
                <p style={{ margin: '4px 0', display: 'flex', justifyContent: 'space-between' }}>
                  <span>Risk</span>
                  <strong>{percent(decision.riskAssessment?.riskBefore)} &rarr; {percent(decision.riskAssessment?.riskAfter)}</strong>
                </p>
                <p style={{ margin: '4px 0', display: 'flex', justifyContent: 'space-between' }}>
                  <span>Liquidity</span>
                  <strong>{percent(decision.riskAssessment?.liquidityBefore)} &rarr; {percent(decision.riskAssessment?.liquidityAfter)}</strong>
                </p>
              </div>
              
              <div>
                <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', color: 'var(--text-secondary)' }}>Decision</h4>
                <p style={{ margin: '4px 0' }}><strong>{decision.recommendation?.state?.replace(/_/g, ' ')}</strong></p>
                {decision.recommendation?.state !== 'NO_RECOMMENDATION' && (
                  <div style={{ marginTop: '12px' }}>
                    <button className="button-secondary" onClick={() => navigate('overview')}>View details</button>
                  </div>
                )}
              </div>
            </div>
            
            {decision.explanation && (
              <div style={{ marginTop: '24px', padding: '16px', background: 'var(--surface-color)', borderRadius: '8px', borderLeft: '4px solid var(--accent-color)' }}>
                <h5 style={{ margin: '0 0 8px 0', fontSize: '16px' }}>{decision.explanation.headline}</h5>
                <p style={{ margin: '0', color: 'var(--text-secondary)' }}>{decision.explanation.summary}</p>
                <div style={{ marginTop: '12px', fontSize: '12px', color: 'var(--text-tertiary)' }}>
                  Source: {decision.explanation.type === 'AI_EXPLANATION' ? '🤖 AI Generated' : '🔒 Deterministic System'}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  )
}
