import { SectionHeading, ActionButton, SimulationResult } from '../components/dashboard/Shared.jsx'

export default function WhatIf({ 
  portfolio,
  scenarios,
  selectedScenario,
  setSelectedScenario,
  shockDraft,
  setShockDraft,
  simulation,
  assets,
  loading,
  runAction,
  setSimulation,
  setExplanation,
  setControl
}) {

  const selectScenario = (name) => {
    const scenario = scenarios.find((item) => item.name === name)
    setSelectedScenario(name)
    setShockDraft(Object.fromEntries((scenario?.shocks || []).map((shock) => [
      shock.assetId,
      shock.shockPercentage * 100,
    ])))
  }

  const scenarioPayload = {
    name: selectedScenario,
    shocks: assets.map((asset) => ({
      assetId: asset.assetId,
      shockPercentage: Number(shockDraft[asset.assetId] || 0) / 100,
    })),
  }

  return (
    <div className="max-w-4xl mx-auto pt-6 pb-12">
      <article className="panel action-panel mb-8">
        <SectionHeading kicker="Scenario lab" title="What-if market simulator"><span className="panel-index">02</span></SectionHeading>
        <div className="mb-6 bg-blue-50/50 border border-blue-100 rounded-lg p-4">
          <p className="text-sm text-blue-800 m-0">
            <strong>Note:</strong> This is a hypothetical simulation laboratory. To see real-time detected market conditions and their actual impact, see the <strong>Market Guardian</strong> section on the Overview page.
          </p>
        </div>
        <p className="panel-copy">Test how the portfolio behaves under hypothetical market conditions.</p>
        
        <label className="field-label" htmlFor="scenario">Scenario</label>
        <select id="scenario" value={selectedScenario} onChange={(event) => selectScenario(event.target.value)}>
          {scenarios.map((item) => <option key={item.name}>{item.name}</option>)}
        </select>
        
        <div className="shock-grid">
          {assets.map((asset) => (
            <label key={asset.assetId}>
              <span>{asset.assetId}</span>
              <div className="percent-input">
                <input 
                  type="number" 
                  value={shockDraft[asset.assetId] ?? 0} 
                  onChange={(event) => setShockDraft((current) => ({ ...current, [asset.assetId]: event.target.value }))} 
                />
                <b>%</b>
              </div>
            </label>
          ))}
        </div>
        
        <ActionButton 
          loading={loading.simulation} 
          onClick={() => runAction('simulation', 
            async () => { 
              const { simulateScenario, getExplanation } = await import('../services/api.js');
              const result = await simulateScenario(portfolio, scenarioPayload); 
              return { result, explanation: await getExplanation({ type: 'WHAT_IF', scenario: scenarioPayload }) } 
            }, 
            ({ result, explanation: nextExplanation }) => { 
              setSimulation(result); 
              setExplanation(nextExplanation) 
            }
          )} 
          tone="outline"
        >
          Run Simulation
        </ActionButton>

        {simulation ? (
          <>
            <SimulationResult simulation={simulation} />
            <div className="mt-8 border-t border-gray-100 pt-6 text-center">
              <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-2">Evaluate Risk Response</h4>
              <p className="text-sm text-gray-600 mb-4">See how the Control Engine would respond to this hypothetical scenario.</p>
              <ActionButton 
                loading={loading.control} 
                onClick={async () => {
                  await runAction('control', 
                    async () => { 
                      const { generateControlRecommendation, getExplanation } = await import('../services/api.js');
                      const result = await generateControlRecommendation(portfolio, simulation.riskAssessment, simulation); 
                      return { result, explanation: await getExplanation({ type: 'CONTROL', scenario: scenarioPayload, eventId: result.decisionEventId }) } 
                    }, 
                    ({ result, explanation: nextExplanation }) => { 
                      setControl(result)
                      setExplanation(nextExplanation)
                      window.history.pushState({}, '', '/controls')
                      window.dispatchEvent(new Event('popstate'))
                    }
                  )
                }} 
              >
                Evaluate Recommended Control
              </ActionButton>
            </div>
          </>
        ) : null}
      </article>
    </div>
  )
}
