import { useEffect, useState } from 'react'
import HeroFinancialGraph from '../components/dashboard/HeroFinancialGraph.jsx'

export default function Landing({ onLogin, onRegister }) {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    // Trigger entrance animations shortly after mount
    const timer = setTimeout(() => setIsVisible(true), 100)
    return () => clearTimeout(timer)
  }, [])

  return (
    <div className="min-h-screen bg-[#eef4f1] text-[#10242a] font-['Manrope',sans-serif] selection:bg-[#0f766e] selection:text-white overflow-x-hidden">
      
      {/* HEADER */}
      <header className={`sticky top-0 z-50 transition-all duration-700 ease-out bg-[#f7fbf9]/90 backdrop-blur-md border-b border-[#d9e4df] px-6 py-4 flex items-center justify-between ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'}`}>
        <div className="flex items-center gap-3">
          <div className="grid place-items-center w-8 h-8 rounded-lg text-[#f4fbf7] bg-[#0f766e] font-['DM_Mono',monospace] text-[10px] font-bold">CG</div>
          <span className="font-extrabold text-sm tracking-tight hidden sm:block">Capital Guardian</span>
        </div>
        <nav className="flex items-center gap-4">
          <button onClick={onLogin} className="text-[#71817e] hover:text-[#10242a] font-bold text-xs transition-colors px-2 py-2">Log In</button>
          <button onClick={onRegister} className="bg-[#14383b] hover:bg-[#0f766e] text-white text-xs font-bold px-4 py-2 rounded-md transition-all duration-200 hover:-translate-y-[1px] shadow-sm">Sign Up</button>
        </nav>
      </header>

      <main className="w-full max-w-7xl mx-auto px-6 pt-16 pb-24">
        
        {/* HERO SECTION */}
        <section className="flex flex-col lg:flex-row items-center justify-between gap-12 lg:gap-8 pt-12 pb-24">
          <div className={`w-full lg:w-1/2 max-w-2xl transition-all duration-1000 ease-out delay-150 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            <span className="block text-[#6b807b] font-['DM_Mono',monospace] text-[10px] uppercase tracking-[0.12em] mb-6">Workspace Engine</span>
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold leading-[1.05] tracking-tight mb-8 text-[#10242a]">
              Turn market volatility into<br />
              <span className="text-[#0f766e] font-serif font-normal italic">controlled decisions.</span>
            </h1>
            <p className="text-[#5f7771] text-lg sm:text-xl leading-relaxed mb-10 max-w-xl">
              Capital Guardian continuously evaluates portfolio risk, liquidity and market conditions to identify when capital allocation needs attention.
            </p>
            <div className="flex flex-wrap items-center gap-4">
              <button onClick={onRegister} className="bg-[#14383b] hover:bg-[#0f766e] text-white text-sm font-bold px-8 py-4 rounded-lg transition-all duration-200 hover:-translate-y-[2px] shadow-lg">Get Started</button>
              <button onClick={onLogin} className="text-[#0f766e] bg-[#f5faf7] border border-[#b9d1c9] hover:bg-[#0f766e] hover:text-white hover:border-[#0f766e] text-sm font-bold px-8 py-4 rounded-lg transition-all duration-200">Log In</button>
            </div>
          </div>

          {/* HERO VISUAL */}
          <div className={`w-full lg:w-1/2 max-w-2xl lg:max-w-none transition-all duration-1000 ease-out delay-300 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'}`}>
            <HeroFinancialGraph />
          </div>
        </section>

        {/* TRUST STATEMENT */}
        <section className={`py-16 text-center transition-all duration-1000 ease-out delay-500 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <div className="inline-block px-6 py-3 rounded-full bg-[#e8f2ed] border border-[#d5e2dc] mb-8">
            <span className="text-[#50726a] font-['DM_Mono',monospace] text-[10px] uppercase tracking-widest">Continuous Workflow</span>
          </div>
          <p className="text-xl sm:text-2xl text-[#173b3d] font-medium max-w-4xl mx-auto leading-relaxed">
            From initial capital allocation to dynamic risk response, Capital Guardian connects every phase of your financial operation.
          </p>
          <div className="flex flex-wrap justify-center items-center gap-2 sm:gap-4 mt-12 text-[#849590] font-['DM_Mono',monospace] text-[10px] sm:text-xs uppercase tracking-widest font-bold">
            <span>Capital</span>
            <span className="text-[#0f766e]">→</span>
            <span>Allocation</span>
            <span className="text-[#0f766e]">→</span>
            <span>Risk</span>
            <span className="text-[#0f766e]">→</span>
            <span>Scenario</span>
            <span className="text-[#0f766e]">→</span>
            <span>Control</span>
          </div>
        </section>

        {/* FEATURES */}
        <section className="py-24">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <FeatureCard 
              title="OPTIMIZE"
              description="Allocate capital under constraints."
              delay="100ms"
            />
            <FeatureCard 
              title="MONITOR"
              description="Track risk, liquidity and market conditions."
              delay="200ms"
            />
            <FeatureCard 
              title="SIMULATE"
              description="Test market shocks before acting."
              delay="300ms"
            />
            <FeatureCard 
              title="CONTROL"
              description="Generate risk-aware rebalancing recommendations."
              delay="400ms"
            />
            <FeatureCard 
              title="EXPLAIN"
              description="Understand why each decision was made."
              delay="500ms"
            />
          </div>
        </section>

        {/* CTA SECTION */}
        <section className="py-24 text-center">
          <div className="max-w-2xl mx-auto bg-gradient-to-b from-[#f7fbf9] to-[#eaf4ef] p-12 sm:p-16 rounded-3xl border border-[#d9e4df] shadow-sm">
            <h2 className="text-3xl sm:text-4xl font-bold text-[#10242a] tracking-tight mb-6">Ready to take control of your capital?</h2>
            <p className="text-[#5f7771] mb-10 max-w-lg mx-auto">Create a secure workspace and simulate intelligent capital management today.</p>
            <button onClick={onRegister} className="bg-[#14383b] hover:bg-[#0f766e] text-white text-sm font-bold px-8 py-4 rounded-lg transition-all duration-200 hover:-translate-y-[2px] shadow-lg">Get Started</button>
          </div>
        </section>

      </main>

      {/* FOOTER */}
      <footer className="border-t border-[#d9e4df] bg-[#f7fbf9] py-12">
        <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="grid place-items-center w-6 h-6 rounded-md text-[#f4fbf7] bg-[#71817e] font-['DM_Mono',monospace] text-[8px] font-bold">CG</div>
            <span className="font-bold text-xs text-[#10242a]">Capital Guardian</span>
          </div>
          <p className="text-[#849590] text-xs font-['DM_Mono',monospace] tracking-wider uppercase">Intelligent capital management and risk control.</p>
        </div>
      </footer>
    </div>
  )
}

function FeatureCard({ title, description, delay }) {
  return (
    <div 
      className="bg-[#fafcfa]/90 border border-[#d9e4df] p-8 rounded-2xl shadow-[0_8px_28px_rgba(32,67,58,0.035)] hover:-translate-y-1 transition-transform duration-300"
      style={{ animationDelay: delay }}
    >
      <div className="w-10 h-10 rounded-lg bg-[#eaf4ef] border border-[#cce5d9] flex items-center justify-center mb-6 text-[#0f766e]">
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      </div>
      <h3 className="text-xl font-bold text-[#173b3d] mb-3 tracking-tight">{title}</h3>
      <p className="text-[#71817e] text-sm leading-relaxed">{description}</p>
    </div>
  )
}
