import { explainWithGemini } from './geminiProvider.js'

export async function explainWithProvider(payload) {
  // If we had multiple providers, we could select based on config.
  // For now, default to Gemini.
  return explainWithGemini(payload)
}
