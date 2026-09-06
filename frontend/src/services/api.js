export const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5001/api').replace(/\/$/, '')

async function request(path, options = {}) {
  const token = localStorage.getItem('token')
  const response = await fetch(`${API_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
    ...options,
  })

  const body = await response.json().catch(() => null)
  if (response.status === 401) {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    window.dispatchEvent(new Event('auth:unauthorized'))
  }
  if (!response.ok || body?.success === false) {
    throw new Error(body?.error?.message || 'The backend request could not be completed.')
  }

  return body?.data ?? body
}

function post(path, body) {
  return request(path, {
    method: 'POST',
    body: JSON.stringify(body),
  })
}
function patch(path, body) { return request(path, { method: 'PATCH', body: JSON.stringify(body) }) }

export const getPortfolio = () => request('/portfolio')
export const savePortfolio = (portfolio) => post('/portfolio', portfolio)
export const getScenarios = () => request('/scenarios')
export const optimizePortfolio = (portfolio) => post('/optimize', portfolio)
export const assessRisk = (portfolio) => post('/risk', portfolio)
export const simulateScenario = (portfolio, scenario) => post('/simulate', { portfolio, scenario })
export const generateControlRecommendation = (portfolio, riskAssessment, shockedPortfolio) => post('/control', {
  portfolio,
  riskAssessment,
  shockedPortfolio,
})
export const runFullAnalysis = (portfolio) => post('/analyze', portfolio)
export const getExplanation = (result) => post('/explain', result)
export const login = (credentials) => post('/auth/login', credentials)
export const register = (credentials) => post('/auth/register', credentials)
export const requestLoginOtp = (credentials) => post('/auth/login/request-otp', credentials)
export const resendRegistrationOtp = (email) => post('/auth/register/resend-otp', { email })
export const verifyOtp = (payload) => post('/auth/verify-otp', payload)
export const getCurrentUser = () => request('/auth/me')
export const updateCurrentUser = (profile) => patch('/auth/me', profile)
export const deleteCurrentUser = () => request('/auth/me', { method: 'DELETE' })
export const getMarketIntelligence = (portfolio) => post('/market-intelligence', { portfolio })
export const saveAnalysis = (result) => post('/analysis', { result })
export const saveSimulation = (result) => post('/scenarios/results', { result })
export const saveControl = (result) => post('/control/history', { result })
export const getAnalysisHistory = () => request('/analysis/history')
export const getSimulationHistory = () => request('/scenarios/history')
export const getControlHistory = () => request('/control/history')
export async function downloadReport(payload) {
  const token = localStorage.getItem('token')
  const response = await fetch(`${API_URL}/report`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify(payload) })
  if (!response.ok) throw new Error('The PDF report could not be generated.')
  const url = URL.createObjectURL(await response.blob()); const link = document.createElement('a')
  link.href = url; link.download = 'capital-guardian-report.pdf'; link.click(); URL.revokeObjectURL(url)
}
