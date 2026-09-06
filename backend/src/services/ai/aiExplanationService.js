import { explainWithProvider } from './providers/index.js'
import { generateExplanation } from '../explainability/explainability-service.js'

export async function explainDecision(payload) {
  try {
    let timeoutId
    const aiExplanation = await Promise.race([
      explainWithProvider(payload),
      new Promise((_, reject) => {
        timeoutId = setTimeout(() => reject(new Error('AI explanation timeout')), 10000)
      })
    ]).finally(() => clearTimeout(timeoutId))

    // Validate fields
    const requiredFields = ['headline', 'summary', 'trigger', 'marketImpact', 'portfolioImpact', 'riskAssessment', 'decisionExplanation', 'recommendationExplanation', 'constraintExplanation', 'expectedImpact', 'dataMode']
    for (const field of requiredFields) {
      if (typeof aiExplanation[field] !== 'string') {
        throw new Error(`Missing or invalid field: ${field}`)
      }
    }

    return {
      success: true,
      source: 'AI',
      explanation: aiExplanation
    }
  } catch (error) {
    console.error('AI Explanation failed, falling back to deterministic:', error.message)
    // Fall back to deterministic engine
    const deterministic = generateExplanation(payload)
    
    // Map deterministic to expected AI format somewhat closely so frontend can render
    // However, the frontend might have a generic renderer.
    // For now, return standard deterministic payload but wrapped appropriately.
    return {
      success: true,
      source: 'DETERMINISTIC_FALLBACK',
      explanation: deterministic
    }
  }
}
