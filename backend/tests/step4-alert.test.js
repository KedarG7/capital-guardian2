import test from 'node:test'
import assert from 'node:assert/strict'
import { Alert } from '../src/models/persistence/Alert.js'
import { getMarketResponseController, getAlertsController, markAlertReadController } from '../src/controllers/api-controller.js'
import mongoose from 'mongoose'

const userId = new mongoose.Types.ObjectId()

test('alert schema supports required fields and timestamps', async () => {
  const document = new Alert({
    userId,
    eventId: 'evt-1',
    type: 'RISK_BREACH',
    severity: 'HIGH',
    title: 'Risk Increased',
    message: 'Your portfolio risk is now HIGH.'
  })

  await assert.doesNotReject(document.validate())
  assert.equal(document.read, false)
})

test('alert schema rejects invalid documents', async () => {
  const document = new Alert({
    userId,
    // missing required fields
  })

  const error = await document.validate().catch((e) => e)
  assert.ok(error instanceof mongoose.Error.ValidationError)
})

test('getAlertsController returns empty array when DB not configured', async () => {
  let responseData = null
  const res = { json: (data) => { responseData = data } }
  
  await getAlertsController({ user: { id: userId } }, res)
  assert.strictEqual(responseData.success, true)
  assert.deepEqual(responseData.data, [])
})

test('markAlertReadController returns error when DB not configured', async () => {
  let responseData = null
  const res = { json: (data) => { responseData = data } }
  
  await markAlertReadController({ user: { id: userId }, params: { id: 'alert1' } }, res)
  assert.strictEqual(responseData.success, false)
  assert.strictEqual(responseData.error, 'Database not configured')
})
