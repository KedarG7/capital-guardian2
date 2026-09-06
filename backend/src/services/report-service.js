function esc(value) { return String(value ?? '').replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)') }
const money = (value) => `INR ${Number(value || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`
const pct = (value) => `${(Number(value || 0) * 100).toFixed(1)}%`

// Branded, dependency-free vector PDF using Capital Guardian's teal visual system.
export function buildPortfolioPdf({ portfolio = {}, analysis, simulation, control }) {
  const c = []
  const box = (x, y, w, h, color) => c.push(`${color} rg ${x} ${y} ${w} ${h} re f`)
  const txt = (x, y, v, s = 10, color = '0.12 0.26 0.25', f = 'F1') => c.push(`BT /${f} ${s} Tf ${color} rg 1 0 0 1 ${x} ${y} Tm (${esc(v)}) Tj ET`)
  const metric = analysis?.portfolio?.metrics || {}; const mc = analysis?.optimization?.monteCarlo || control?.monteCarlo
  box(0, 0, 595, 842, '0.96 0.98 0.97'); box(0, 680, 595, 162, '0.05 0.27 0.26'); box(0, 674, 595, 6, '0.08 0.54 0.47')
  txt(48, 790, 'CAPITAL GUARDIAN', 9, '0.64 0.86 0.79', 'F2'); txt(48, 750, 'Founder investment', 27, '1 1 1', 'F2'); txt(48, 718, 'readiness report', 27, '1 1 1', 'F2'); txt(48, 695, `Prepared ${new Date().toLocaleDateString('en-IN')}`, 9, '0.77 0.89 0.85')
  txt(405, 782, 'SAVED CAPITAL PLAN', 8, '0.64 0.86 0.79', 'F2'); txt(405, 754, money(portfolio.totalCapital), 16, '1 1 1', 'F2')
  ;[['TOTAL CAPITAL', money(portfolio.totalCapital)], ['EXPECTED RETURN', pct(metric.expectedReturn)], ['RISK LIMIT', pct(portfolio.maximumRisk)], ['LIQUIDITY FLOOR', pct(portfolio.minimumLiquidity)]].forEach(([label, value], i) => { const x = 48 + i * 126; box(x, 605, 114, 50, '1 1 1'); txt(x + 10, 640, label, 7, '0.38 0.50 0.47', 'F2'); txt(x + 10, 619, value, 13, '0.08 0.29 0.28', 'F2') })
  txt(48, 568, 'Portfolio allocation', 16, '0.08 0.29 0.28', 'F2'); txt(48, 550, 'Saved asset mix used for your simulations and recommendations.', 9, '0.38 0.50 0.47')
  let y = 518; Object.entries(portfolio.allocations || {}).slice(0, 8).forEach(([asset, allocation], i) => { txt(48, y, asset.toUpperCase(), 9, '0.12 0.31 0.30', 'F2'); box(166, y - 3, 340, 8, '0.87 0.92 0.89'); box(166, y - 3, Math.max(4, Math.min(340, allocation * 340)), 8, i % 2 ? '0.08 0.54 0.47' : '0.11 0.42 0.40'); txt(520, y, pct(allocation), 9, '0.12 0.31 0.30', 'F2'); y -= 27 })
  box(48, 325, 499, 78, '0.89 0.95 0.92'); txt(66, 382, 'LATEST SIMULATED PORTFOLIO', 8, '0.08 0.45 0.39', 'F2')
  txt(66, 354, simulation ? (simulation.scenario?.name || 'Latest scenario') : 'No simulation recorded yet', 14, '0.08 0.29 0.28', 'F2'); txt(66, 336, simulation ? `After shock: ${money(simulation.shockedPortfolio?.totalValue)} | Change: ${pct(simulation.shockedPortfolio?.gainLossPercentage)}` : 'Run a What-if scenario to record an outcome here.', 9, '0.28 0.42 0.39')
  txt(48, 285, 'Optimization and control', 16, '0.08 0.29 0.28', 'F2'); txt(48, 264, control?.controlAction ? `Recommendation: ${control.controlAction.replaceAll('_', ' ')}` : 'No control recommendation generated.', 10, '0.28 0.42 0.39')
  box(48, 170, 499, 70, '1 1 1'); txt(66, 217, 'MONTE CARLO VALIDATION', 8, '0.08 0.45 0.39', 'F2'); txt(66, 190, mc ? `${mc.iterations.toLocaleString()} simulated paths` : 'Run optimization to add validation.', 12, '0.08 0.29 0.28', 'F2'); if (mc) { txt(265, 191, `Median ${money(mc.percentile50)}`, 10, '0.08 0.29 0.28', 'F2'); txt(265, 173, `95% downside ${money(mc.downsideValueAtRisk95)} | loss probability ${pct(mc.probabilityOfLoss)}`, 9, '0.28 0.42 0.39') }
  c.push('0.82 0.89 0.86 RG 0.7 w 48 110 m 547 110 l S'); txt(48, 88, 'Capital Guardian - founder-ready portfolio planning', 8, '0.38 0.50 0.47'); txt(48, 72, 'Decision-support only. Not investment advice. Market values and simulations are estimates.', 8, '0.38 0.50 0.47'); txt(520, 72, '1 / 1', 8, '0.38 0.50 0.47', 'F2')
  const stream = c.join('\n'); const objects = ['<< /Type /Catalog /Pages 2 0 R >>', '<< /Type /Pages /Kids [3 0 R] /Count 1 >>', '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 5 0 R /F2 6 0 R >> >> /Contents 4 0 R >>', `<< /Length ${Buffer.byteLength(stream)} >>\nstream\n${stream}\nendstream`, '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>', '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>']
  let pdf = '%PDF-1.4\n'; const offsets = [0]; objects.forEach((o, i) => { offsets.push(Buffer.byteLength(pdf)); pdf += `${i + 1} 0 obj\n${o}\nendobj\n` }); const start = Buffer.byteLength(pdf); pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n${offsets.slice(1).map((o) => `${String(o).padStart(10, '0')} 00000 n `).join('\n')}\ntrailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${start}\n%%EOF`; return Buffer.from(pdf)
}
