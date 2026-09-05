import { useState } from 'react'

export default function Onboarding({ runAction, setPortfolioData }) {
  const [displayValue, setDisplayValue] = useState('')
  const [numericValue, setNumericValue] = useState(0)

  const handleDisplayChange = (e) => {
    // Remove all non-digits
    const raw = e.target.value.replace(/\D/g, '')
    if (!raw) {
      setDisplayValue('')
      setNumericValue(0)
      return
    }
    const num = parseInt(raw, 10)
    setNumericValue(num)
    // Format to Indian locale for display
    setDisplayValue(new Intl.NumberFormat('en-IN').format(num))
  }

  const handleSetup = async (e) => {
    e.preventDefault()
    if (!numericValue || numericValue <= 0 || !Number.isFinite(numericValue)) {
      alert('Capital must be a positive number greater than ₹0.')
      return
    }
    if (numericValue > 100000000000) {
      alert('Capital exceeds maximum allowable value for this prototype (₹10,000 crores).')
      return
    }

    runAction('portfolio', 
      async () => {
        const { savePortfolio } = await import('../services/api.js')
        return savePortfolio({ totalCapital: numericValue })
      },
      (newPortfolioData) => {
        setPortfolioData(newPortfolioData)
      }
    )
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] max-w-md mx-auto text-center px-4 motion-safe:animate-[fade-in-up_0.4s_ease-out_forwards]">
      <div className="mb-6">
        <span className="brand-mark mb-4 mx-auto !w-16 !h-16 !text-2xl flex items-center justify-center bg-[#0d282b] text-[#5eead4] rounded-lg shadow-md">CG</span>
        <h1 className="text-3xl font-bold tracking-tight text-[#173b3d] mb-2">Let's set up your capital</h1>
        <p className="text-[#71817e] text-sm">Enter the total capital you want Capital Guardian to analyze.</p>
      </div>

      <form onSubmit={handleSetup} className="w-full space-y-6">
        <div className="text-left">
          <label htmlFor="capital" className="block text-[10px] uppercase tracking-wider font-['DM_Mono',monospace] text-[#5f7771] font-bold mb-2">
            Total Capital (₹)
          </label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">₹</span>
            <input
              id="capital"
              type="text"
              inputMode="numeric"
              required
              placeholder="10,00,000"
              className="w-full bg-[#f8fbf9] border border-[#cadbd4] rounded-lg pl-9 pr-4 py-3 focus:outline-none focus:ring-1 focus:ring-[#0f766e] focus:border-[#0f766e] text-[#244449] font-medium text-lg transition-all"
              value={displayValue}
              onChange={handleDisplayChange}
            />
          </div>
        </div>
        
        <button
          type="submit"
          className="w-full h-12 bg-[#14383b] hover:bg-[#0f766e] text-white font-bold rounded-lg transition-all hover:-translate-y-px shadow-md"
        >
          Analyze My Capital
        </button>
      </form>
    </div>
  )
}
