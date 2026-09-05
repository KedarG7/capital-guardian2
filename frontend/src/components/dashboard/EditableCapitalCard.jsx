import { useState } from 'react'
import { amount } from './Shared.jsx'

export default function EditableCapitalCard({ currentCapital, runAction, setPortfolioData, clearDependentState, simulation }) {
  const [isEditing, setIsEditing] = useState(false)
  const [displayValue, setDisplayValue] = useState('')
  const [numericValue, setNumericValue] = useState(0)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const startEdit = () => {
    setIsEditing(true)
    setNumericValue(currentCapital)
    setDisplayValue(new Intl.NumberFormat('en-IN').format(currentCapital))
    setError('')
    setSuccess(false)
  }

  const cancelEdit = () => {
    setIsEditing(false)
    setError('')
  }

  const handleDisplayChange = (e) => {
    const raw = e.target.value.replace(/\D/g, '')
    if (!raw) {
      setDisplayValue('')
      setNumericValue(0)
      return
    }
    const num = parseInt(raw, 10)
    setNumericValue(num)
    setDisplayValue(new Intl.NumberFormat('en-IN').format(num))
  }

  const saveEdit = async (e) => {
    e.preventDefault()
    setError('')
    if (!numericValue || numericValue <= 0 || !Number.isFinite(numericValue)) {
      setError('Invalid capital.')
      return
    }
    setIsSaving(true)
    runAction('portfolioUpdate',
      async () => {
        const { savePortfolio } = await import('../../services/api.js')
        return savePortfolio({ totalCapital: numericValue })
      },
      (newPortfolioData) => {
        setPortfolioData(newPortfolioData)
        clearDependentState() // Clear stale calculations based on old capital
        setIsEditing(false)
        setSuccess(true)
        setTimeout(() => setSuccess(false), 3000)
      }
    )
    setIsSaving(false)
  }

  return (
    <article className="metric-card metric-card-teal relative min-h-[100px] overflow-hidden">
      <span className="eyebrow flex justify-between items-center w-full">
        Total Capital
        {!isEditing && (
          <button type="button" onClick={startEdit} className="text-[#0f766e] hover:underline text-[10px] ml-2 cursor-pointer bg-transparent border-0 p-0 m-0 font-bold uppercase tracking-wider">
            [ Edit ]
          </button>
        )}
      </span>

      {!isEditing ? (
        <>
          <strong>{amount(currentCapital)}</strong>
          <span className="metric-detail">{simulation ? 'After selected scenario' : 'Current portfolio value'}</span>
          {success && (
            <div className="absolute top-3 right-3 text-green-700 bg-green-50 px-2 py-1 rounded text-[10px] animate-[fade-in-up_0.3s_ease-out_forwards] font-bold border border-green-200">
              ✓ Updated
            </div>
          )}
        </>
      ) : (
        <form onSubmit={saveEdit} className="mt-2 flex flex-col gap-2 relative z-10">
          <div className="relative">
            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-500 font-bold text-sm">₹</span>
            <input 
              type="text" 
              inputMode="numeric" 
              className="w-full bg-white border border-[#cadbd4] rounded px-6 py-1.5 text-sm font-bold focus:outline-none focus:ring-1 focus:ring-[#0f766e] focus:border-[#0f766e] text-[#10242a]"
              value={displayValue}
              onChange={handleDisplayChange}
              autoFocus
              disabled={isSaving}
            />
          </div>
          {error && <span className="text-red-600 text-[10px] font-bold">{error}</span>}
          <div className="flex gap-2 mt-1">
            <button type="button" onClick={cancelEdit} disabled={isSaving} className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded text-[11px] py-1.5 font-bold transition-colors disabled:opacity-50">Cancel</button>
            <button type="submit" disabled={isSaving} className="flex-1 bg-[#14383b] hover:bg-[#0f766e] text-white rounded text-[11px] py-1.5 font-bold transition-colors disabled:opacity-50">
              {isSaving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      )}
    </article>
  )
}
