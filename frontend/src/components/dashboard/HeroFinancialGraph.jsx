import { useState, useEffect } from 'react'

export default function HeroFinancialGraph() {
  const [step, setStep] = useState(0)

  useEffect(() => {
    // Respect prefers-reduced-motion
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    if (mediaQuery.matches) {
      setStep(4) // Skip to final stabilized state
      return
    }

    const sequence = [
      { step: 0, delay: 2000 },
      { step: 1, delay: 3000 },
      { step: 2, delay: 2000 },
      { step: 3, delay: 3500 },
      { step: 4, delay: 5000 }
    ]
    
    let isCancelled = false
    
    const runSequence = async () => {
      while (!isCancelled) {
        for (const s of sequence) {
          if (isCancelled) break
          setStep(s.step)
          await new Promise(r => setTimeout(r, s.delay))
        }
      }
    }
    
    runSequence()
    return () => { isCancelled = true }
  }, [])

  const getClipWidth = (s) => {
    if (s === 0) return 60
    if (s === 1) return 310
    if (s === 2) return 360
    if (s === 3) return 360
    return 800
  }

  const getTransition = (s) => {
    if (s === 0) return 'width 0.5s ease-out'
    if (s === 1) return 'width 2.5s ease-in-out'
    if (s === 2) return 'width 0.5s cubic-bezier(0.5, 0, 1, 1)' // fast drop
    if (s === 3) return 'width 0s'
    if (s === 4) return 'width 2.5s ease-in-out'
    return 'width 0s'
  }

  return (
    <div className="relative w-full max-w-2xl mx-auto aspect-video sm:aspect-[2/1] bg-white rounded-2xl border border-[#d9e4df] shadow-[0_20px_60px_rgba(32,67,58,0.06)] overflow-hidden">
      {/* BACKGROUND GRID */}
      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 800 400" preserveAspectRatio="none">
        <defs>
          <pattern id="graph-grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#eef4f1" strokeWidth="1"/>
          </pattern>
          <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#0f766e" stopOpacity="0.15" />
            <stop offset="100%" stopColor="#0f766e" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="lineGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#0f766e" />
            <stop offset="40%" stopColor="#0f766e" />
            <stop offset="45%" stopColor="#ef4444" />
            <stop offset="48%" stopColor="#ef4444" />
            <stop offset="60%" stopColor="#0f766e" />
            <stop offset="100%" stopColor="#0f766e" />
          </linearGradient>
          
          <clipPath id="chart-clip">
            <rect 
              x="0" 
              y="0" 
              height="400" 
              width={getClipWidth(step)} 
              style={{ transition: getTransition(step) }} 
            />
          </clipPath>
        </defs>

        <rect width="100%" height="100%" fill="url(#graph-grid)" />

        <g clipPath="url(#chart-clip)">
          {/* AREA FILL */}
          <path 
            d="M 50 400 L 50 300 C 150 280, 200 240, 300 220 L 350 340 C 450 340, 500 260, 600 240 C 650 230, 700 210, 750 200 L 750 400 Z" 
            fill="url(#areaGrad)" 
          />
          {/* MAIN LINE */}
          <path 
            d="M 50 300 C 150 280, 200 240, 300 220 L 350 340 C 450 340, 500 260, 600 240 C 650 230, 700 210, 750 200" 
            fill="none" 
            stroke="url(#lineGrad)" 
            strokeWidth="3" 
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          
          {/* DOTS */}
          {/* Capital */}
          <circle cx="50" cy="300" r="4" fill="#0f766e" />
          {/* Normal */}
          <circle cx="300" cy="220" r="4" fill="#0f766e" />
          {/* Shock */}
          <circle cx="350" cy="340" r="4" fill="#ef4444" />
          {/* Recovery */}
          <circle cx="750" cy="200" r="4" fill="#0f766e" />
        </g>
      </svg>

      {/* HTML OVERLAYS */}
      <div className="absolute inset-0 pointer-events-none">
        
        {/* Step 0: Capital Label */}
        <div className={`absolute left-[4%] sm:left-[6%] top-[78%] transition-opacity duration-500 ${step >= 0 ? 'opacity-100' : 'opacity-0'}`}>
          <div className="bg-[#10242a] text-white text-[9px] sm:text-[10px] font-bold px-2 py-1 rounded shadow-md whitespace-nowrap">
            Illustrative: ₹1 Cr Capital
          </div>
        </div>

        {/* Step 1: Normal Market */}
        <div className={`absolute left-[30%] sm:left-[35%] top-[45%] transition-opacity duration-500 ${step >= 1 ? 'opacity-100' : 'opacity-0'}`}>
          <div className="bg-[#eaf4ef] border border-[#a4d4be] text-[#147057] text-[9px] sm:text-[10px] font-bold px-2 py-1 rounded shadow-sm whitespace-nowrap flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#147057] animate-pulse"></span>
            Risk: Controlled
          </div>
        </div>

        {/* Step 2: Market Shock */}
        <div className={`absolute left-[38%] sm:left-[41%] top-[88%] transition-opacity duration-300 ${step >= 2 ? 'opacity-100' : 'opacity-0'}`}>
          <div className="bg-[#fbe8c8] border border-[#e5c18f] text-[#a05f11] text-[9px] sm:text-[10px] font-bold px-2 py-1 rounded shadow-sm whitespace-nowrap flex items-center gap-1">
            <span>⚠</span> Risk Detected
          </div>
        </div>

        {/* Step 3: Control Triggered */}
        <div className={`absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 transition-all duration-500 ${step === 3 ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}>
          <div className="bg-white/95 backdrop-blur-md border border-[#d9e4df] p-3 sm:p-4 rounded-xl shadow-2xl w-40 sm:w-48">
            <div className="text-[9px] sm:text-[10px] uppercase tracking-wider text-[#71817e] font-bold mb-2 sm:mb-3 flex justify-between items-center">
              <span>Analyzing Risk</span>
              <span className="animate-spin text-[#0f766e] text-lg leading-none">⟳</span>
            </div>
            <div className="space-y-1.5 sm:space-y-2">
              <div className="flex justify-between text-[10px] sm:text-xs font-medium text-gray-600"><span>Stocks</span> <span className="font-['DM_Mono',monospace] text-red-600">↓ 30%</span></div>
              <div className="flex justify-between text-[10px] sm:text-xs font-medium text-gray-600"><span>Bonds</span> <span className="font-['DM_Mono',monospace] text-green-600">↑ 35%</span></div>
              <div className="flex justify-between text-[10px] sm:text-xs font-medium text-gray-600"><span>Gold</span> <span className="font-['DM_Mono',monospace] text-green-600">↑ 20%</span></div>
            </div>
            <div className="mt-3 sm:mt-4 pt-2 border-t border-gray-100 text-center text-[9px] sm:text-[10px] font-bold text-[#147057] bg-[#eaf4ef] rounded py-1.5 uppercase tracking-wider">
              Control Triggered
            </div>
          </div>
        </div>

        {/* Step 4: Stabilized */}
        <div className={`absolute right-[4%] sm:right-[6%] top-[40%] transition-opacity duration-500 delay-500 ${step >= 4 ? 'opacity-100' : 'opacity-0'}`}>
          <div className="bg-[#10242a] text-[#5eead4] text-[9px] sm:text-[10px] font-bold px-2.5 py-1.5 rounded shadow-lg whitespace-nowrap flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#5eead4]"></span>
            Safer Allocation
          </div>
        </div>

      </div>
    </div>
  )
}
