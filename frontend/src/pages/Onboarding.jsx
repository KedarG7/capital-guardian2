import { useMemo, useState } from 'react'

const presets = {
  equity: { expectedReturn: 0.12, volatility: 0.22, liquidityScore: 0.9, ticker: '^NSEI' },
  bonds: { expectedReturn: 0.07, volatility: 0.08, liquidityScore: 0.8, ticker: 'INDA' },
  gold: { expectedReturn: 0.08, volatility: 0.15, liquidityScore: 0.7, ticker: 'GC=F' },
  cash: { expectedReturn: 0.04, volatility: 0.01, liquidityScore: 1, ticker: 'INR=X' },
}
const starter = ['equity', 'bonds', 'gold', 'cash'].map((id, index) => ({ assetId: id, label: id, allocation: [40, 25, 15, 20][index], ...presets[id] }))

export default function Onboarding({ onComplete }) {
  const [capital, setCapital] = useState('1000000')
  const [assets, setAssets] = useState(starter)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const total = useMemo(() => assets.reduce((sum, asset) => sum + Number(asset.allocation || 0), 0), [assets])
  const edit = (index, key, value) => setAssets((current) => current.map((asset, itemIndex) => itemIndex === index ? { ...asset, [key]: value } : asset))
  const add = () => setAssets((current) => [...current, { assetId: `asset-${current.length + 1}`, label: 'Custom asset', allocation: 0, expectedReturn: 0.08, volatility: 0.16, liquidityScore: 0.6, ticker: '' }])
  const submit = async (event) => {
    event.preventDefault()
    setError('')
    if (total !== 100) return setError('Allocations must add to 100%.')
    if (!Number(capital) || Number(capital) <= 0) return setError('Enter a capital amount greater than zero.')
    const normalized = assets.map((asset, index) => ({ ...asset, assetId: (asset.assetId || asset.label || `asset-${index + 1}`).trim().toLowerCase().replace(/[^a-z0-9]+/g, '-'), allocation: Number(asset.allocation) / 100, expectedReturn: Number(asset.expectedReturn), volatility: Number(asset.volatility), liquidityScore: Number(asset.liquidityScore), minimumAllocation: 0, maximumAllocation: 1 }))
    if (new Set(normalized.map((asset) => asset.assetId)).size !== normalized.length) return setError('Each asset needs a distinct name.')
    setSaving(true)
    try {
      await onComplete({ totalCapital: Number(capital), maximumRisk: 0.35, minimumLiquidity: 0.15, allocations: Object.fromEntries(normalized.map((asset) => [asset.assetId, asset.allocation])), assets: normalized })
    } catch (saveError) {
      setError(saveError.message || 'Unable to save this plan.')
    } finally {
      setSaving(false)
    }
  }
  return (
    <main className="onboarding-shell">
      <form className="onboarding-card" onSubmit={submit}>
        <span className="eyebrow">Capital Guardian / Founder setup</span>
        <h1>Build your first capital plan.</h1>
        <p>Set the investable capital and mix. Every number remains editable after setup, so you can explore risk before you commit funds.</p>
        <label>Investable capital (₹)<input type="number" min="1" value={capital} onChange={(event) => setCapital(event.target.value)} required /></label>
        <div className="onboarding-assets">
          <div><span>Asset</span><span>Allocation</span><span>Market assumptions</span></div>
          {assets.map((asset, index) => (
            <div className="onboarding-asset" key={index}>
              <input aria-label="Asset name" value={asset.label} onChange={(event) => { edit(index, 'label', event.target.value); edit(index, 'assetId', event.target.value) }} />
              <div className="percent-input"><input aria-label="Allocation percentage" type="number" min="0" max="100" value={asset.allocation} onChange={(event) => edit(index, 'allocation', event.target.value)} /><b>%</b></div>
              <small>Return {(Number(asset.expectedReturn) * 100).toFixed(0)}% · risk {(Number(asset.volatility) * 100).toFixed(0)}% · liquid {(Number(asset.liquidityScore) * 100).toFixed(0)}%</small>
            </div>
          ))}
        </div>
        <div className="allocation-total">Allocated <strong className={total === 100 ? 'positive' : 'negative'}>{total}%</strong></div>
        <button type="button" className="add-asset" onClick={add}>+ Add a custom asset</button>
        {error ? <p className="auth-error">{error}</p> : null}
        <button className="auth-submit" type="submit" disabled={saving}>{saving ? 'Saving plan...' : 'Save plan and enter workspace'}</button>
        <small className="onboarding-note">Planning assumptions can be adjusted in Profile. Market indicators are refreshed separately and never execute trades.</small>
      </form>
    </main>
  )
}
