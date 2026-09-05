import { useEffect, useState } from 'react'
import { getControlHistory } from '../../services/api.js'

export function DecisionTimeline() {
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getControlHistory()
      .then((data) => {
        setHistory(data || [])
        setLoading(false)
      })
      .catch((err) => {
        console.error(err)
        setLoading(false)
      })
  }, [])

  if (loading) {
    return <div className="p-6 text-sm text-gray-500">Loading decision history...</div>
  }

  if (!history.length) {
    return (
      <div className="p-6">
        <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4 border-b pb-2">Recent Decisions</h3>
        <div className="text-sm text-gray-500 italic">No recent decisions found.</div>
      </div>
    )
  }

  return (
    <div className="p-6">
      <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4 border-b pb-2">Recent Decisions</h3>
      <div className="space-y-4">
        {history.slice(0, 5).map((decision, idx) => (
          <div key={idx} className="relative pl-4 border-l-2 border-gray-200">
            <span className="absolute -left-[5px] top-1.5 w-2 h-2 rounded-full bg-gray-400"></span>
            <div className="text-xs text-gray-500 mb-1">{new Date(decision.createdAt || decision.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
            <div className="text-sm font-medium text-gray-900">{decision.action?.replaceAll('_', ' ') || decision.controlAction?.replaceAll('_', ' ')}</div>
            <div className="text-xs text-gray-600 mt-1">{decision.summary || 'Control decision recorded'}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
