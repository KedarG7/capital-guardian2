import test from 'node:test'
import assert from 'node:assert/strict'
import jwt from 'jsonwebtoken'
import app from '../src/app.js'
import { demoPortfolio } from '../src/models/portfolio.js'

process.env.JWT_SECRET = 'test-only-jwt-secret'
const testToken = jwt.sign({ sub: '507f1f77bcf86cd799439011', email: 'test@example.com' }, process.env.JWT_SECRET)

let server
let baseUrl

const marketCrash = {
  name: 'Market Crash',
  shocks: [
    { assetId: 'stocks', shockPercentage: -0.20 },
    { assetId: 'bonds', shockPercentage: -0.05 },
    { assetId: 'gold', shockPercentage: 0.10 },
    { assetId: 'cash', shockPercentage: 0 },
  ],
}

async function request(path, options) {
  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: { Authorization: `Bearer ${testToken}`, ...options?.headers },
  })
  const body = response.status === 204 ? null : await response.json()
  return { response, body }
}

function jsonOptions(method, body) {
  return {
    method,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${testToken}` },
    body: JSON.stringify(body),
  }
}

test.before(async () => {
  server = app.listen(0)
  const address = server.address()
  baseUrl = `http://127.0.0.1:${address.port}`
})

test.after(async () => {
  await new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()))
  })
})

test('GET /api/health returns 200 and preserves the health contract', async () => {
  const { response, body } = await request('/api/health')

  assert.equal(response.status, 200)
  assert.deepEqual(body, {
    status: 'ok',
    service: 'capital-guardian-backend',
  })
})

test('protected API routes reject missing and invalid tokens', async () => {
  const missing = await fetch(`${baseUrl}/api/portfolio`)
  const invalid = await fetch(`${baseUrl}/api/portfolio`, { headers: { Authorization: 'Bearer invalid' } })

  assert.equal(missing.status, 401)
  assert.equal(invalid.status, 401)
})

test('CORS preflight allows the configured local frontend origin', async () => {
  const { response } = await request('/api/health', {
    method: 'OPTIONS',
    headers: { Origin: 'http://localhost:5173', Authorization: `Bearer ${testToken}` },
  })

  assert.equal(response.status, 204)
  assert.equal(response.headers.get('access-control-allow-origin'), 'http://localhost:5173')
})

test('GET /api/portfolio returns demo portfolio data', async () => {
  const { response, body } = await request('/api/portfolio')

  assert.equal(response.status, 200)
  assert.equal(body.success, true)
  assert.equal(body.data.metrics.portfolioValue, demoPortfolio.totalCapital)
  assert.equal(body.data.risk.status, 'LOW')
})

test('POST /api/portfolio reports unavailable persistence when MongoDB is not configured', async () => {
  const { response, body } = await request('/api/portfolio', jsonOptions('POST', demoPortfolio))

  assert.equal(response.status, 503)
  assert.deepEqual(body, {
    success: false,
    error: { code: 'DATABASE_UNAVAILABLE', message: 'MongoDB is not configured.' },
  })
})

test('POST /api/optimize returns an optimization result', async () => {
  const { response, body } = await request('/api/optimize', jsonOptions('POST', demoPortfolio))

  assert.equal(response.status, 200)
  assert.equal(body.success, true)
  assert.ok(body.data.allocation)
  assert.ok(body.data.metrics.riskAdjustedScore)
})

test('POST /api/risk returns a risk assessment', async () => {
  const { response, body } = await request('/api/risk', jsonOptions('POST', demoPortfolio))

  assert.equal(response.status, 200)
  assert.equal(body.success, true)
  assert.equal(body.data.status, 'LOW')
  assert.equal(body.data.isWithinLimits, true)
})

test('POST /api/explain returns a deterministic structured explanation', async () => {
  const { response, body } = await request('/api/explain', jsonOptions('POST', {
    status: 'LOW',
    isWithinLimits: true,
    risk: { portfolioVolatility: 0.09, maximumRisk: 0.4, riskUtilization: 0.225 },
    liquidity: { liquidityScore: 0.855, minimumLiquidity: 0.15, liquidityBuffer: 0.705 },
    breaches: [],
  }))

  assert.equal(response.status, 200)
  assert.equal(body.success, true)
  assert.equal(body.data.decision, 'NO_ACTION')
  assert.equal(body.data.confidence, 'DETERMINISTIC')
})

test('POST /api/simulate returns shocked portfolio and risk data', async () => {
  const { response, body } = await request('/api/simulate', jsonOptions('POST', {
    portfolio: demoPortfolio,
    scenario: marketCrash,
  }))

  assert.equal(response.status, 200)
  assert.equal(body.success, true)
  assert.equal(body.data.scenario.name, 'Market Crash')
  assert.equal(body.data.shockedPortfolio.totalValue, 9200000)
  assert.ok(body.data.riskAssessment)
})

test('POST /api/control returns a control result', async () => {
  const { response, body } = await request('/api/control', jsonOptions('POST', {
    portfolio: { ...demoPortfolio, maximumRisk: 0.05 },
  }))

  assert.equal(response.status, 200)
  assert.equal(body.success, true)
  assert.equal(body.data.controlAction, 'REBALANCE_RECOMMENDED')
  assert.ok(body.data.recommended)
})

test('POST /api/analyze returns the complete analysis sections', async () => {
  const { response, body } = await request('/api/analyze', jsonOptions('POST', demoPortfolio))

  assert.equal(response.status, 200)
  assert.equal(body.success, true)
  assert.ok(body.data.portfolio)
  assert.ok(body.data.optimization)
  assert.ok(body.data.risk)
  assert.ok(body.data.control)
})

test('GET /api/scenarios returns demo scenarios', async () => {
  const { response, body } = await request('/api/scenarios')

  assert.equal(response.status, 200)
  assert.equal(body.success, true)
  assert.deepEqual(body.data.map((scenario) => scenario.name), [
    'Market Crash',
    'Inflation Shock',
    'Positive Market',
  ])
})

test('invalid JSON returns a clean 400 response', async () => {
  const { response, body } = await request('/api/simulate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '{invalid',
  })

  assert.equal(response.status, 400)
  assert.deepEqual(body, {
    success: false,
    error: { code: 'INVALID_JSON', message: 'Request body contains invalid JSON.' },
  })
})

test('invalid shock returns a clean domain error', async () => {
  const { response, body } = await request('/api/simulate', jsonOptions('POST', {
    scenario: { name: 'Invalid', shocks: [{ assetId: 'stocks', shockPercentage: 1.1 }] },
  }))

  assert.equal(response.status, 422)
  assert.equal(body.success, false)
  assert.equal(body.error.code, 'INVALID_DOMAIN_INPUT')
})

test('invalid allocation returns a clean domain error', async () => {
  const { response, body } = await request('/api/risk', jsonOptions('POST', {
    ...demoPortfolio,
    allocations: { stocks: 0.9, bonds: 0.9 },
  }))

  assert.equal(response.status, 422)
  assert.equal(body.success, false)
  assert.match(body.error.message, /sum to 1/)
})

test('unknown route returns a clean 404 response', async () => {
  const { response, body } = await request('/api/unknown')

  assert.equal(response.status, 404)
  assert.deepEqual(body, {
    success: false,
    error: { code: 'NOT_FOUND', message: 'API route not found.' },
  })
})
