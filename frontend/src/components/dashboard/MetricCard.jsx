function MetricCard({ label, value, detail, accent = 'teal' }) {
  return (
    <article className={`metric-card metric-card-${accent}`}>
      <span className="eyebrow">{label}</span>
      <strong>{value}</strong>
      <span className="metric-detail">{detail}</span>
    </article>
  )
}

export default MetricCard
