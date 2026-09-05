function StatusPill({ status }) {
  return <span className={`status-pill status-${status?.toLowerCase() || 'unknown'}`}>{status || 'UNKNOWN'}</span>
}

export default StatusPill
