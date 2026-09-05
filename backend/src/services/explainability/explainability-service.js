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

function explainRisk(result) {
  const risk = result.risk
  const liquidity = result.liquidity
  const breaches = result.breaches || []
  const reasons = []
  const actions = []

  if (result.isWithinLimits) {
    reasons.push(`Portfolio volatility is ${percentage(risk?.portfolioVolatility)} against a maximum risk of ${percentage(risk?.maximumRisk)}.`)
    reasons.push(`Portfolio liquidity is ${percentage(liquidity?.liquidityScore)} against a minimum requirement of ${percentage(liquidity?.minimumLiquidity)}.`)
    actions.push('No corrective allocation change is required.')
  } else {
    for (const breach of breaches) {
      const difference = isNumber(breach.actual) && isNumber(breach.limit) ? Math.abs(breach.actual - breach.limit) : null
      reasons.push(`${breach.message}${difference === null ? '' : ` Difference: ${percentage(difference)}.`}`)
    }
    actions.push('Review the control recommendation for a feasible corrective allocation.')
  }

  if (result.status === 'MODERATE') {
    reasons.push(`Risk utilization is ${percentage(risk?.riskUtilization)}; this is elevated monitoring territory without a hard limit breach.`)
    actions.push('Continue monitoring the portfolio.')
  }

  return {
    summary: result.status === 'MODERATE'
      ? `Risk utilization is elevated at ${percentage(risk?.riskUtilization)}, but no hard risk or liquidity limit is breached.`
      : result.isWithinLimits
      ? 'Portfolio remains within configured risk and liquidity limits, so no rebalancing action is required.'
      : `Portfolio is classified as ${result.status} because one or more configured limits require attention.`,
    decision: result.status === 'MODERATE' ? 'MODERATE' : result.isWithinLimits ? 'NO_ACTION' : result.status,
    reasons,
    metrics: [
      { label: 'Portfolio volatility', value: percentage(risk?.portfolioVolatility) },
      { label: 'Risk utilization', value: percentage(risk?.riskUtilization) },
      { label: 'Liquidity score', value: percentage(liquidity?.liquidityScore) },
      { label: 'Liquidity buffer', value: percentage(liquidity?.liquidityBuffer) },
    ],
    actions,
    impact: [],
    confidence: 'DETERMINISTIC',
  }
}

function explainOptimization(result) {
  return {
    summary: `Capital Guardian selected this allocation with a risk-adjusted score of ${isNumber(result.metrics?.riskAdjustedScore) ? result.metrics.riskAdjustedScore.toFixed(2) : 'unavailable'}.`,
    decision: 'OPTIMIZATION_RESULT',
    reasons: [
      'The selected allocation was preferred among the feasible allocations evaluated by the existing optimizer.',
      `Expected return is ${percentage(result.metrics?.expectedReturn)}, volatility is ${percentage(result.metrics?.volatility)}, and liquidity is ${percentage(result.metrics?.liquidityScore)}.`,
      'The result satisfies the configured asset allocation, risk, and liquidity constraints.',
    ],
    metrics: [
      { label: 'Expected return', value: percentage(result.metrics?.expectedReturn) },
      { label: 'Volatility', value: percentage(result.metrics?.volatility) },
      { label: 'Liquidity', value: percentage(result.metrics?.liquidityScore) },
      { label: 'Risk-adjusted score', value: isNumber(result.metrics?.riskAdjustedScore) ? result.metrics.riskAdjustedScore.toFixed(2) : 'unavailable' },
    ],
    actions: ['Use this as a recommendation for review; no trades are executed.'],
    impact: [],
    confidence: 'DETERMINISTIC',
  }
}

function explainControl(result) {
  if (!result.before) return unavailableExplanation()
  const reasons = [...(result.reason || [])]
  const impact = []
  const recommended = result.recommended

  if (recommended) {
    for (const change of result.changes || []) {
      const direction = change.change > 0 ? 'increased' : change.change < 0 ? 'decreased' : 'unchanged'
      reasons.push(`${change.assetId} allocation ${direction} from ${percentage(change.oldWeight)} to ${percentage(change.newWeight)}.`)
    }
    impact.push(`Risk changed from ${percentage(result.before.volatility)} to ${percentage(recommended.volatility)} (${signedPercentage(result.impact?.riskChange)}).`)
    impact.push(`Liquidity changed from ${percentage(result.before.liquidity)} to ${percentage(recommended.liquidity)} (${signedPercentage(result.impact?.liquidityChange)}).`)
    impact.push(`Expected return changed by ${signedPercentage(result.impact?.returnChange)}.`)
  }

  return {
    summary: result.controlAction === 'NO_ACTION'
      ? 'No corrective allocation change is required because the portfolio is within configured limits.'
      : result.explanation?.summary || 'A control decision was generated from the current portfolio assessment.',
    decision: result.controlAction,
    reasons: reasons.length ? reasons : ['The control engine reported no breach requiring action.'],
    metrics: [
      { label: 'Before risk', value: percentage(result.before.volatility) },
      { label: 'Before liquidity', value: percentage(result.before.liquidity) },
      { label: 'After risk', value: percentage(recommended?.volatility) },
      { label: 'After liquidity', value: percentage(recommended?.liquidity) },
    ],
    actions: recommended ? ['Review the recommended allocation; no trades are executed automatically.'] : [],
    impact,
    confidence: 'DETERMINISTIC',
  }
}

function explainSimulation(result) {
  const scenario = result.scenario
  const impacts = (result.assetImpacts || []).map((asset) => `${asset.assetId} moved ${signedPercentage(asset.shockPercentage)} from ${asset.originalValue} to ${asset.shockedValue}.`)
  const risk = result.riskAssessment
  return {
    summary: `${scenario?.name || 'Market shock'} changed portfolio value by ${signedPercentage(result.shockedPortfolio?.gainLossPercentage)}.`,
    decision: risk?.status || 'SIMULATION_RESULT',
    reasons: impacts.length ? impacts : ['The scenario contains no asset impact details.'],
    metrics: [
      { label: 'Original value', value: result.originalPortfolio?.totalValue ?? 'unavailable' },
      { label: 'Shocked value', value: result.shockedPortfolio?.totalValue ?? 'unavailable' },
      { label: 'Shocked risk', value: percentage(result.shockedPortfolio?.volatility) },
      { label: 'Shocked liquidity', value: percentage(result.shockedPortfolio?.liquidity) },
    ],
    actions: risk?.isWithinLimits ? ['No control action is required for this simulated result.'] : ['Review the control recommendation for the simulated result.'],
    impact: [
      `Expected return after the scenario is ${percentage(result.shockedPortfolio?.expectedReturn)}.`,
      `Risk assessment status is ${risk?.status || 'unavailable'}.`,
    ],
    confidence: 'DETERMINISTIC',
  }
}

function explainAnalysis(result) {
  const riskExplanation = result.risk ? explainRisk(result.risk) : unavailableExplanation()
  const controlExplanation = result.control ? explainControl(result.control) : unavailableExplanation()
  return {
    ...controlExplanation,
    summary: `Full analysis decision: ${controlExplanation.decision}. ${riskExplanation.summary}`,
    reasons: [...riskExplanation.reasons, ...controlExplanation.reasons],
    metrics: [...riskExplanation.metrics, ...controlExplanation.metrics],
    actions: [...riskExplanation.actions, ...controlExplanation.actions],
    confidence: 'DETERMINISTIC',
  }
}

export function generateExplanation(result) {
  if (!result || typeof result !== 'object') return unavailableExplanation()
  if (result.portfolio && result.risk && result.control) return explainAnalysis(result)
  if (result.controlAction || result.before) return explainControl(result)
  if (result.scenario && result.shockedPortfolio) return explainSimulation(result)
  if (result.status && result.risk && result.liquidity) return explainRisk(result)
  if (result.allocation && result.metrics?.riskAdjustedScore !== undefined) return explainOptimization(result)
  return unavailableExplanation()
}
