export const assetConfiguration = Object.freeze({
  stocks: Object.freeze({
    assetId: 'stocks',
    expectedReturn: 0.12,
    volatility: 0.22,
    liquidityScore: 0.90,
    minimumAllocation: 0.10,
    maximumAllocation: 0.60,
  }),
  bonds: Object.freeze({
    assetId: 'bonds',
    expectedReturn: 0.07,
    volatility: 0.08,
    liquidityScore: 0.80,
    minimumAllocation: 0.10,
    maximumAllocation: 0.60,
  }),
  gold: Object.freeze({
    assetId: 'gold',
    expectedReturn: 0.08,
    volatility: 0.15,
    liquidityScore: 0.70,
    minimumAllocation: 0.05,
    maximumAllocation: 0.30,
  }),
  cash: Object.freeze({
    assetId: 'cash',
    expectedReturn: 0.04,
    volatility: 0.01,
    liquidityScore: 1.00,
    minimumAllocation: 0.05,
    maximumAllocation: 0.40,
  }),
})
