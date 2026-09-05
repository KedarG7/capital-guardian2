function AllocationDonut({ assets }) {
  let cursor = 0
  const stops = assets.map((asset) => {
    const start = cursor
    cursor += asset.allocation * 100
    return `${asset.color} ${start}% ${cursor}%`
  }).join(', ')

  return (
    <div className="allocation-visual" aria-label="Portfolio asset allocation">
      <div className="donut" style={{ background: `conic-gradient(${stops})` }}>
        <div className="donut-hole">
          <strong>100%</strong>
          <span>allocated</span>
        </div>
      </div>
      <div className="allocation-legend">
        {assets.map((asset) => (
          <div className="legend-row" key={asset.assetId}>
            <span className="legend-name"><i style={{ background: asset.color }} />{asset.assetId}</span>
            <strong>{Math.round(asset.allocation * 100)}%</strong>
          </div>
        ))}
      </div>
    </div>
  )
}

export default AllocationDonut
