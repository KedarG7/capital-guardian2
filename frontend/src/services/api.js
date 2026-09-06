const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

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

export const getPortfolio = () => request('/portfolio')
export const savePortfolio = (portfolio) => post('/portfolio', portfolio)
export const getMarketData = () => request('/market-data')
export const getMarketResponse = () => request('/market-response')
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
export const getControlHistory = () => request('/control/history')
export const saveControlDecision = (decision) => post('/control/history', decision)
export const getAlerts = () => request('/alerts')
export const markAlertRead = (id) => request(`/alerts/${id}/read`, { method: 'PATCH' })
export const getDecisionHistory = () => request('/decision-history')
export const login = (credentials) => post('/auth/login', credentials)
export const register = (credentials) => post('/auth/register', credentials)
export const getCurrentUser = () => request('/auth/me')
