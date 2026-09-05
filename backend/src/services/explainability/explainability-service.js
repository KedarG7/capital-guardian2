const isNumber = (value) => typeof value === 'number' && Number.isFinite(value)
const percentage = (value) => isNumber(value) ? `${(value * 100).toFixed(1)}%` : 'unavailable'
const signedPercentage = (value) => isNumber(value) ? `${value >= 0 ? '+' : ''}${percentage(value)}` : 'unavailable'

function unavailableExplanation() {
  return {
    summary: 'An explanation is unavailable because the decision result is incomplete.',
    decision: 'UNAVAILABLE',
    reasons: ['Provide a completed engine result to generate a deterministic explanation.'],
    metrics: [],
    actions: [],
    impact: [],
    confidence: 'DETERMINISTIC',
  }
}

function getBaseRichFormat(result) {
  return {
    decisionId: `dec-${Date.now()}`,
    summary: '',
    decision: '',
    urgency: 'LOW',
    trigger: null,
    marketImpact: null,
    portfolioImpact: null,
    riskAssessment: null,
    recommendation: { summary: '', actions: [] },
    expectedImpact: null,
    constraints: { satisfied: [], notSatisfied: [] },
    dataSource: { mode: 'LIVE/DEMO', timestamp: new Date().toISOString() },
    confidence: 'DETERMINISTIC',
    reasons: [],
    metrics: [],
    actions: [],
    impact: []
  }
}

function explainRisk(result) {
  const risk = result.risk
  const liquidity = result.liquidity
  const breaches = result.breaches || []
  
  const rich = getBaseRichFormat()

  if (result.isWithinLimits) {
    rich.reasons.push(`Portfolio volatility is ${percentage(risk?.portfolioVolatility)} against a maximum risk of ${percentage(risk?.maximumRisk)}.`)
    rich.reasons.push(`Portfolio liquidity is ${percentage(liquidity?.liquidityScore)} against a minimum requirement of ${percentage(liquidity?.minimumLiquidity)}.`)
    rich.actions.push('No corrective allocation change is required.')
    
    rich.constraints.satisfied.push(`Risk limit (${percentage(risk?.portfolioVolatility)} ≤ ${percentage(risk?.maximumRisk)})`)
    rich.constraints.satisfied.push(`Liquidity requirement (${percentage(liquidity?.liquidityScore)} ≥ ${percentage(liquidity?.minimumLiquidity)})`)
  } else {
    for (const breach of breaches) {
      const difference = isNumber(breach.actual) && isNumber(breach.limit) ? Math.abs(breach.actual - breach.limit) : null
      const explanation = `${breach.message}${difference === null ? '' : ` Difference: ${percentage(difference)}.`}`
      rich.reasons.push(explanation)
      rich.constraints.notSatisfied.push(breach.message)
    }
    rich.actions.push('Review the control recommendation for a feasible corrective allocation.')
  }

  if (result.status === 'MODERATE') {
    rich.reasons.push(`Risk utilization is ${percentage(risk?.riskUtilization)}; this is elevated monitoring territory without a hard limit breach.`)
    rich.actions.push('Continue monitoring the portfolio.')
  }

  rich.summary = result.status === 'MODERATE'
    ? `Risk utilization is elevated at ${percentage(risk?.riskUtilization)}, but no hard risk or liquidity limit is breached.`
    : result.isWithinLimits
    ? 'Portfolio remains within configured risk and liquidity limits, so no rebalancing action is required.'
    : `Portfolio is classified as ${result.status} because one or more configured limits require attention.`
    
  rich.decision = result.status === 'MODERATE' ? 'MODERATE' : result.isWithinLimits ? 'NO_ACTION' : result.status
  
  rich.portfolioImpact = {
    before: {
      risk: percentage(risk?.portfolioVolatility),
      riskUtilization: percentage(risk?.riskUtilization),
      liquidity: percentage(liquidity?.liquidityScore)
    }
  }

  rich.metrics = [
    { label: 'Portfolio volatility', value: percentage(risk?.portfolioVolatility) },
    { label: 'Risk utilization', value: percentage(risk?.riskUtilization) },
    { label: 'Liquidity score', value: percentage(liquidity?.liquidityScore) },
    { label: 'Liquidity buffer', value: percentage(liquidity?.liquidityBuffer) },
  ]
  
  rich.trigger = {
    title: 'Risk Evaluation',
    description: 'Manual or scheduled portfolio risk evaluation.'
  }

  return rich
}

function explainOptimization(result) {
  const rich = getBaseRichFormat()
  rich.summary = `Capital Guardian selected this allocation with a risk-adjusted score of ${isNumber(result.metrics?.riskAdjustedScore) ? result.metrics.riskAdjustedScore.toFixed(2) : 'unavailable'}.`
  rich.decision = 'OPTIMIZATION_RESULT'
  rich.reasons = [
    'The selected allocation was preferred among the feasible allocations evaluated by the existing optimizer.',
    `Expected return is ${percentage(result.metrics?.expectedReturn)}, volatility is ${percentage(result.metrics?.volatility)}, and liquidity is ${percentage(result.metrics?.liquidityScore)}.`,
    'The result satisfies the configured asset allocation, risk, and liquidity constraints.',
  ]
  rich.metrics = [
    { label: 'Expected return', value: percentage(result.metrics?.expectedReturn) },
    { label: 'Volatility', value: percentage(result.metrics?.volatility) },
    { label: 'Liquidity', value: percentage(result.metrics?.liquidityScore) },
    { label: 'Risk-adjusted score', value: isNumber(result.metrics?.riskAdjustedScore) ? result.metrics.riskAdjustedScore.toFixed(2) : 'unavailable' },
  ]
  rich.actions = ['Use this as a recommendation for review; no trades are executed.']
  
  rich.constraints.satisfied.push('Configured asset allocation limits.')
  rich.constraints.satisfied.push('Risk and liquidity constraints.')
  
  return rich
}

function explainControl(result) {
  if (!result.before) return unavailableExplanation()
  
  const rich = getBaseRichFormat()
  const recommended = result.recommended

  if (recommended) {
    rich.expectedImpact = {
      riskChange: `${percentage(result.before.volatility)} → ${percentage(recommended.volatility)}`,
      liquidityChange: `${percentage(result.before.liquidity)} → ${percentage(recommended.liquidity)}`,
      returnChange: `${percentage(result.before.expectedReturn)} → ${percentage(recommended.expectedReturn)}`,
      allocationChanges: (result.changes || []).map(c => ({
        assetId: c.assetId,
        oldWeight: percentage(c.oldWeight),
        newWeight: percentage(c.newWeight),
        changePercent: c.change * 100
      }))
    }
    
    for (const change of result.changes || []) {
      const direction = change.change > 0 ? 'increased' : change.change < 0 ? 'decreased' : 'unchanged'
      rich.reasons.push(`${change.assetId} allocation ${direction} from ${percentage(change.oldWeight)} to ${percentage(change.newWeight)}.`)
    }
    rich.impact.push(`Risk changed from ${percentage(result.before.volatility)} to ${percentage(recommended.volatility)} (${signedPercentage(result.impact?.riskChange)}).`)
    rich.impact.push(`Liquidity changed from ${percentage(result.before.liquidity)} to ${percentage(recommended.liquidity)} (${signedPercentage(result.impact?.liquidityChange)}).`)
    rich.impact.push(`Expected return changed by ${signedPercentage(result.impact?.returnChange)}.`)
  }

  rich.summary = result.controlAction === 'NO_ACTION'
    ? 'No corrective allocation change is required because the portfolio is within configured limits.'
    : result.explanation?.summary || 'A control decision was generated from the current portfolio assessment.'
  
  rich.decision = result.controlAction
  rich.reasons.push(...(result.reason || []))
  
  if (result.controlAction === 'NO_ACTION') {
    rich.constraints.satisfied.push('Risk limits met')
    rich.constraints.satisfied.push('Liquidity limits met')
    rich.constraints.satisfied.push('Allocation boundaries met')
  } else if (recommended) {
    rich.constraints.satisfied.push('Recommended allocation satisfies all bounds')
    rich.reasons.push('The Control Engine found a feasible allocation that improves the portfolio risk profile.')
  } else {
    rich.constraints.notSatisfied.push('No feasible portfolio configuration found')
  }

  if (rich.reasons.length === 0) {
    rich.reasons.push('The control engine reported no breach requiring action.')
  }

  rich.metrics = [
    { label: 'Before risk', value: percentage(result.before.volatility) },
    { label: 'Before liquidity', value: percentage(result.before.liquidity) },
    { label: 'After risk', value: percentage(recommended?.volatility) },
    { label: 'After liquidity', value: percentage(recommended?.liquidity) },
  ]
  
  rich.actions = recommended ? ['Review the recommended allocation; no trades are executed automatically.'] : []

  return rich
}

function explainSimulation(result) {
  const rich = getBaseRichFormat()
  const scenario = result.scenario
  const impacts = (result.assetImpacts || []).map((asset) => `${asset.assetId} moved ${signedPercentage(asset.shockPercentage)} from ${asset.originalValue} to ${asset.shockedValue}.`)
  const risk = result.riskAssessment
  
  rich.summary = `${scenario?.name || 'Market shock'} changed portfolio value by ${signedPercentage(result.shockedPortfolio?.gainLossPercentage)}.`
  rich.decision = risk?.status || 'SIMULATION_RESULT'
  rich.reasons = impacts.length ? impacts : ['The scenario contains no asset impact details.']
  
  rich.trigger = {
    title: 'SIMULATED SCENARIO',
    description: `User projected: ${scenario?.name || 'Market shock'}`
  }
  
  if (result.originalPortfolio && result.shockedPortfolio) {
    rich.portfolioImpact = {
      before: {
        risk: percentage(result.originalPortfolio.volatility),
        riskUtilization: 'N/A', // not exposed here typically
        liquidity: percentage(result.originalPortfolio.liquidity)
      },
      after: {
        risk: percentage(result.shockedPortfolio.volatility),
        riskUtilization: percentage(risk?.risk?.riskUtilization),
        liquidity: percentage(result.shockedPortfolio.liquidity)
      }
    }
  }

  rich.actions = risk?.isWithinLimits ? ['No control action is required for this simulated result.'] : ['Review the control recommendation for the simulated result.']
  
  return rich
}

function explainAnalysis(result) {
  const riskExplanation = result.risk ? explainRisk(result.risk) : unavailableExplanation()
  const controlExplanation = result.control ? explainControl(result.control) : unavailableExplanation()
  
  // Merge rich outputs
  const rich = getBaseRichFormat()
  rich.summary = `Full analysis decision: ${controlExplanation.decision}. ${riskExplanation.summary}`
  rich.decision = controlExplanation.decision
  rich.reasons = [...riskExplanation.reasons, ...controlExplanation.reasons]
  rich.metrics = [...riskExplanation.metrics, ...controlExplanation.metrics]
  rich.actions = [...riskExplanation.actions, ...controlExplanation.actions]
  
  rich.expectedImpact = controlExplanation.expectedImpact
  rich.constraints = controlExplanation.constraints
  rich.portfolioImpact = riskExplanation.portfolioImpact
  rich.trigger = riskExplanation.trigger

  return rich
}

function explainMarketResponse(result) {
  const rich = getBaseRichFormat()
  
  rich.summary = result.recommendation?.summary || `Market response generated due to ${result.marketStatus} conditions.`
  rich.decision = result.responseLevel
  rich.reasons = result.recommendation?.reasons || []
  
  if (result.events && result.events.length > 0) {
    rich.trigger = {
      title: 'Market Movement Detected',
      description: result.events.join(', ')
    }
  } else if (result.marketStatus) {
    rich.trigger = {
      title: 'Market Condition',
      description: `Market is ${result.marketStatus}`
    }
  }

  if (result.risk) {
    rich.portfolioImpact = {
      before: {
        risk: 'unknown',
        riskUtilization: percentage(result.risk.riskUtilization),
        liquidity: percentage(result.risk.liquidityBuffer)
      },
      after: {
        risk: 'unknown',
        riskUtilization: percentage(result.risk.riskUtilization),
        liquidity: percentage(result.risk.liquidityBuffer)
      }
    }
  }

  // If a control decision was made, embed its impact
  if (result.controlDecision && result.controlDecision.action !== 'NO_ACTION') {
    const rec = result.controlDecision.recommended
    const bef = result.controlDecision.before
    if (rec && bef) {
      rich.expectedImpact = {
        riskChange: `${percentage(bef.volatility)} → ${percentage(rec.volatility)}`,
        liquidityChange: `${percentage(bef.liquidity)} → ${percentage(rec.liquidity)}`,
        returnChange: `${percentage(bef.expectedReturn)} → ${percentage(rec.expectedReturn)}`,
        allocationChanges: (result.controlDecision.changes || []).map(c => ({
          assetId: c.assetId,
          oldWeight: percentage(c.oldWeight),
          newWeight: percentage(c.newWeight),
          changePercent: c.change * 100
        }))
      }
    }
  }

  if (result.responseLevel === 'MONITOR') {
    rich.actions = ['Continue monitoring the portfolio. No immediate intervention required.']
  } else {
    rich.actions = ['Review the recommended control intervention.']
  }

  return rich
}

export function generateExplanation(result) {
  if (!result || typeof result !== 'object') return unavailableExplanation()
  if (result.marketStatus && result.responseLevel) return explainMarketResponse(result)
  if (result.portfolio && result.risk && result.control) return explainAnalysis(result)
  if (result.controlAction || result.before) return explainControl(result)
  if (result.scenario && result.shockedPortfolio) return explainSimulation(result)
  if (result.status && result.risk && result.liquidity) return explainRisk(result)
  if (result.allocation && result.metrics?.riskAdjustedScore !== undefined) return explainOptimization(result)
  return unavailableExplanation()
}

