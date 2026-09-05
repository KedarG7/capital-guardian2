import test from 'node:test'
import assert from 'node:assert/strict'
import { User } from '../src/models/User.js'
import bcrypt from 'bcryptjs'

test('User schema requires timestamps and protects passwordHash by default', () => {
  assert.equal(User.schema.options.timestamps, true)
  assert.equal(User.schema.path('passwordHash').options.select, false)
  assert.equal(User.schema.path('email').options.unique, true)
})

test('password hashes do not equal the plaintext password', async () => {
  const password = 'Demo@123'
  const hash = await bcrypt.hash(password, 4)

  assert.notEqual(hash, password)
  assert.equal(await bcrypt.compare(password, hash), true)
})