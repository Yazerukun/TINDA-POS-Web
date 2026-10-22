import React, { useState } from 'react'
import {
  Sun,
  Moon,
  Sunset,
  CloudRain,
  Volume2,
  Sparkles,
  Zap,
  Plane,
  Store
} from 'lucide-react'
import { playJeepneyHorn, playStoreChime, playScanSuccess } from '../lib/sound'
import { StreetPanoramicSvg } from './StreetPanoramicSvg'
import './CyberStreetScene.css'

export type TimeOfDay = 'DAWN' | 'NOON' | 'SUNSET' | 'NIGHT'

interface CyberStreetSceneProps {
  onQuickDemo?: () => void
  onOpenLogin?: () => void
}

export function CyberStreetScene({
  onQuickDemo,
  onOpenLogin
}: CyberStreetSceneProps): React.JSX.Element {
  const [timeOfDay, setTimeOfDay] = useState<TimeOfDay>('NIGHT')
  const [isRaining, setIsRaining] = useState(false)
  const [activeBubble, setActiveBubble] = useState<string | null>(null)
  const [soundEnabled, setSoundEnabled] = useState(true)

  // Map to data-phase for CSS engine
  const phaseMap: Record<TimeOfDay, string> = {
    DAWN: 'morning',
    NOON: 'noon',
    SUNSET: 'afternoon',
    NIGHT: 'night'
  }
  const currentPhase = phaseMap[timeOfDay]

  // Trigger speech bubbles with auto-dismiss
  const showBubble = (text: string) => {
    setActiveBubble(text)
    setTimeout(() => {
      setActiveBubble((curr) => (curr === text ? null : curr))
    }, 4500)
  }

  const handleJeepneyClick = () => {
    if (soundEnabled) {
      try {
        playJeepneyHorn()
      } catch {}
    }
    showBubble('Beep-beep! 📯 Para po sa kanto! TINDA POS 100% Offline Engine onboard!')
  }

  const handleStoreClick = () => {
    if (soundEnabled) {
      try {
        playStoreChime()
      } catch {}
    }
    showBubble('Suki! Bili na! 🏪 Malamig na softdrinks, GCash Cash-In/Out, at 172 DTI SRP price ceilings active!')
  }

  const handlePlaneClick = () => {
    if (soundEnabled) {
      try {
        playScanSuccess()
      } catch {}
    }
    showBubble('✈️ PAL Flight 8891: TINDA Dual-Cloud Sync streaming at 35,000 ft (D1 + Supabase auto-failover)!')
  }

  return (
    <div className="relative w-full overflow-hidden rounded-3xl border border-white/[0.1] bg-obsidian-950 shadow-[0_25px_80px_-15px_rgba(0,0,0,0.9),0_0_50px_-10px_rgba(16,185,129,0.18)] select-none">
      {/* ── 1. Top Scene Control HUD ── */}
      <div className="relative z-30 flex flex-wrap items-center justify-between gap-3 px-4 sm:px-6 py-3.5 bg-obsidian-950/85 backdrop-blur-xl border-b border-white/[0.08]">
        {/* Time-of-Day Switcher Pills */}
        <div className="flex items-center gap-1 sm:gap-1.5 p-1 rounded-2xl bg-white/[0.04] border border-white/[0.06] text-xs font-mono">
          <button
            type="button"
            onClick={() => setTimeOfDay('DAWN')}
            className={`px-2.5 py-1.5 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer ${
              timeOfDay === 'DAWN'
                ? 'bg-amber-500/25 text-amber-300 font-bold border border-amber-500/40 shadow-sm'
                : 'text-stone-400 hover:text-stone-200'
            }`}
            title="Arawan (Dawn 6:00 AM)"
          >
            <SunriseIcon className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">Arawan</span>
            <span className="text-[0.625rem] opacity-75">6AM</span>
          </button>

          <button
            type="button"
            onClick={() => setTimeOfDay('NOON')}
            className={`px-2.5 py-1.5 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer ${
              timeOfDay === 'NOON'
                ? 'bg-sky-500/25 text-sky-300 font-bold border border-sky-500/40 shadow-sm'
                : 'text-stone-400 hover:text-stone-200'
            }`}
            title="Tanghali (Noon 12:00 PM)"
          >
            <Sun className="w-3.5 h-3.5 text-yellow-400" />
            <span className="hidden sm:inline">Tanghali</span>
            <span className="text-[0.625rem] opacity-75">12PM</span>
          </button>

          <button
            type="button"
            onClick={() => setTimeOfDay('SUNSET')}
            className={`px-2.5 py-1.5 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer ${
              timeOfDay === 'SUNSET'
                ? 'bg-orange-500/25 text-orange-300 font-bold border border-orange-500/40 shadow-sm'
                : 'text-stone-400 hover:text-stone-200'
            }`}
            title="Takipsilim (Sunset 5:30 PM)"
          >
            <Sunset className="w-3.5 h-3.5 text-orange-400" />
            <span className="hidden sm:inline">Hapon</span>
            <span className="text-[0.625rem] opacity-75">5PM</span>
          </button>

          <button
            type="button"
            onClick={() => setTimeOfDay('NIGHT')}
            className={`px-2.5 py-1.5 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer ${
              timeOfDay === 'NIGHT'
                ? 'bg-emerald-500/25 text-emerald-300 font-bold border border-emerald-500/40 shadow-[0_0_12px_rgba(16,185,129,0.3)]'
                : 'text-stone-400 hover:text-stone-200'
            }`}
            title="Cyber-Gabi (Night 8:00 PM)"
          >
            <Moon className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden sm:inline">Cyber-Gabi</span>
            <span className="text-[0.625rem] opacity-75">8PM</span>
          </button>
        </div>

        {/* Rain Toggle & Sound Hint */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsRaining(!isRaining)}
            className={`btn-press px-3 py-1.5 rounded-xl text-xs font-mono transition-all flex items-center gap-1.5 border cursor-pointer ${
              isRaining
                ? 'bg-teal-500/20 text-teal-300 border-teal-500/40 font-bold shadow-sm'
                : 'bg-white/[0.03] text-stone-400 border-white/[0.08] hover:text-stone-200'
            }`}
            title="Toggle Monsoon Rain"
          >
            <CloudRain className={`w-3.5 h-3.5 ${isRaining ? 'text-teal-400 animate-bounce' : 'text-stone-400'}`} />
            <span>{isRaining ? 'Ulan: Active' : 'Ulan: Off'}</span>
          </button>

          <div
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 text-xs font-mono cursor-pointer hover:bg-emerald-500/20 transition-all"
            title="Toggle audio effects"
          >
            <Volume2 className={`w-3.5 h-3.5 ${soundEnabled ? 'animate-pulse' : 'opacity-40'}`} />
            <span>Interactive: Click Jeep, Store, or Plane!</span>
          </div>
        </div>
      </div>

      {/* ── 2. The Living Philippine Canvas ── */}
      <section className="tinda-street-hero" data-phase={currentPhase}>
        {/* Sky Backdrop & Color Phases */}
        <div className="tinda-street-backdrop" aria-hidden="true">
          <div className="tinda-street-sky tinda-street-skyMorning" />
          <div className="tinda-street-sky tinda-street-skyNoon" />
          <div className="tinda-street-sky tinda-street-skyAfternoon" />
          <div className="tinda-street-sky tinda-street-skyNight" />

          {/* Twinkling Stars (Active during Night) */}
          <div className="tinda-street-stars">
            {[
              { left: '2%', top: '22%', delay: '0.2s', size: '1.5px' },
              { left: '12%', top: '15%', delay: '1.8s', size: '2px' },
              { left: '24%', top: '35%', delay: '0.9s', size: '1.2px' },
              { left: '38%', top: '10%', delay: '2.5s', size: '1.8px' },
              { left: '49%', top: '28%', delay: '1.4s', size: '1.6px' },
              { left: '61%', top: '8%', delay: '3.1s', size: '2.2px' },
              { left: '72%', top: '32%', delay: '0.7s', size: '1.4px' },
              { left: '85%', top: '18%', delay: '2.0s', size: '1.9px' },
              { left: '94%', top: '25%', delay: '1.1s', size: '1.5px' }
            ].map((star, i) => (
              <span
                key={i}
                className="tinda-street-star"
                style={{
                  left: star.left,
                  top: star.top,
                  width: star.size,
                  height: star.size,
                  animationDelay: star.delay
                }}
              />
            ))}
          </div>

          {/* Sun & Glowing Moon */}
          <div className="tinda-street-sun" />
          <div className="tinda-street-moon" />

          {/* Drifting Clouds */}
          <div className="tinda-street-clouds">
            <div className="tinda-street-cloud" style={{ top: '8%', animationDuration: '110s', animationDelay: '-20s' }}>
              <svg width="150" viewBox="0 0 120 50" fill="currentColor">
                <path d="M20 40 Q25 20 45 22 Q55 8 75 16 Q92 10 102 26 Q115 32 110 42 Q95 48 20 40Z" opacity="0.8" />
              </svg>
            </div>
            <div className="tinda-street-cloud" style={{ top: '22%', animationDuration: '140s', animationDelay: '-75s' }}>
              <svg width="120" viewBox="0 0 120 50" fill="currentColor">
                <path d="M15 38 Q22 18 42 20 Q50 6 70 14 Q88 8 98 24 Q110 30 105 40 Q90 46 15 38Z" opacity="0.65" />
              </svg>
            </div>
          </div>

          {/* Flight of Birds */}
          <div className="tinda-street-birds">
            <div className="tinda-street-bird" style={{ top: '14%', animationDuration: '38s', animationDelay: '-6s' }}>
              <svg width="22" viewBox="0 0 24 12" className="tinda-street-birdFlap">
                <path d="M2 10 Q7 2 12 7 Q17 2 22 10 Q17 6 12 9 Q7 6 2 10Z" fill="currentColor" opacity="0.75" />
              </svg>
            </div>
            <div className="tinda-street-bird" style={{ top: '18%', animationDuration: '38s', animationDelay: '-7.5s' }}>
              <svg width="16" viewBox="0 0 24 12" className="tinda-street-birdFlap" style={{ animationDelay: '-0.2s' }}>
                <path d="M2 10 Q7 2 12 7 Q17 2 22 10 Q17 6 12 9 Q7 6 2 10Z" fill="currentColor" opacity="0.7" />
              </svg>
            </div>
          </div>

          {/* ── 3. High-Altitude Passenger Airliner (Airplane with Contrail & Nav Lights) ── */}
          <div
            className="tinda-street-plane"
            onClick={handlePlaneClick}
            title="Click to inspect PAL Flight 8891 Cloud Telemetry"
          >
            {/* White Vapor Contrail Trail */}
            <div className="tinda-street-contrail" />

            {/* Aerodynamic Airliner Vector Body */}
            <svg viewBox="0 0 120 40" className="tinda-street-planeBody">
              {/* Stabilizer Fin / Tail */}
              <path d="M30 4 L40 4 L52 18 L30 18Z" fill="#cbd5e1" />
              {/* Fuselage Main Body */}
              <path d="M14 19 Q10 19 10 22 Q10 25 14 25 L100 25 Q112 25 116 21.5 Q112 18 100 18 L14 18Z" fill="#f8fafc" />
              {/* Fuselage Underside Shading */}
              <path d="M10 22 Q10 25 14 25 L100 25 Q108 25 113 23 Z" fill="#cbd5e1" />
              {/* Lower Swept Wing */}
              <path d="M50 22 L66 22 L52 36 L44 36Z" fill="#94a3b8" />
              {/* Cabin Windows (Cyan Tint) */}
              <circle cx="30" cy="20.6" r="1" fill="#38bdf8" />
              <circle cx="38" cy="20.6" r="1" fill="#38bdf8" />
              <circle cx="46" cy="20.6" r="1" fill="#38bdf8" />
              <circle cx="54" cy="20.6" r="1" fill="#38bdf8" />
              <circle cx="62" cy="20.6" r="1" fill="#38bdf8" />
              <circle cx="70" cy="20.6" r="1" fill="#38bdf8" />
              <circle cx="78" cy="20.6" r="1" fill="#38bdf8" />
              <circle cx="86" cy="20.6" r="1" fill="#38bdf8" />
              <circle cx="94" cy="20.6" r="1" fill="#38bdf8" />
              {/* Cockpit Windshield */}
              <path d="M105 19.4 L111 19.4 L113 21 L105 21Z" fill="#1e293b" />
              {/* TINDA Emerald Livery Stripe */}
              <rect x="20" y="21" width="80" height="1.3" fill="#10b981" />
              {/* Wingtip Navigation Lights (Port Red / Starboard Green) */}
              <circle className="tinda-street-navLight" cx="36" cy="4.5" r="1.6" fill="#ef4444" />
              <circle className="tinda-street-navLight" cx="48" cy="35.5" r="1.6" fill="#22c55e" style={{ animationDelay: '-0.6s' }} />
            </svg>
          </div>

          {/* Manananggal Mythical Night Flyer (Visible in Cyber-Gabi) */}
          <div className="tinda-street-manananggal">
            <svg className="tinda-street-manananggalBody" viewBox="0 0 120 80">
              <g className="tinda-street-wing">
                <path d="M60 30 L20 10 L25 21 L10 22 L22 31 L12 39 L28 38 L40 45Z" fill="#2e1065" />
                <path d="M60 30 L102 8 L97 20 L112 21 L100 31 L110 39 L93 38 L80 45Z" fill="#3b0764" />
              </g>
              <path d="M48 16 Q62 10 70 20 Q78 32 96 30 Q84 40 70 33 Q62 29 58 34Z" fill="#0b0b0f" />
              <circle cx="49.5" cy="22.5" r="1.4" fill="#ef4444" />
              <circle cx="53.5" cy="22.5" r="1.4" fill="#ef4444" />
            </svg>
          </div>

          {/* ── 4. The Full Panoramic Philippine Neighborhood Street SVG ── */}
          <div className="tinda-street-street">
            <StreetPanoramicSvg
              onJeepneyClick={handleJeepneyClick}
              onStoreClick={handleStoreClick}
            />
          </div>

          {/* ── 5. Monsoon Rain & Thunder Lightning Overlay ── */}
          {isRaining && (
            <>
              <div className="tinda-street-rainShade" />
              <div className="tinda-street-rain">
                {[...Array(26)].map((_, i) => (
                  <span
                    key={i}
                    className="tinda-street-drop"
                    style={{
                      left: `${(i * 3.8) % 100}%`,
                      height: `${16 + (i % 14)}px`,
                      opacity: 0.6 + (i % 4) * 0.1,
                      animationDelay: `${(i * 0.08) % 1.2}s`,
                      animationDuration: `${0.6 + (i % 3) * 0.15}s`
                    }}
                  />
                ))}
              </div>
              <div className="tinda-street-lightning">
                <div className="tinda-street-flash tinda-street-strikeA" />
                <div className="tinda-street-flash tinda-street-strikeB" />
                <svg className="tinda-street-bolt tinda-street-boltA tinda-street-strikeA" viewBox="0 0 60 160" preserveAspectRatio="none">
                  <path d="M36 0 L16 72 L30 72 L10 160 L48 60 L33 60 L50 0Z" fill="#fef08a" />
                </svg>
              </div>
            </>
          )}
        </div>

        {/* ── 6. Interactive Floating Speech Bubble ── */}
        {activeBubble && (
          <div className="absolute top-8 left-1/2 -translate-x-1/2 z-40 max-w-md w-[92%] sm:w-auto px-4 py-2.5 rounded-2xl bg-obsidian-950/95 border border-emerald-500/40 text-stone-100 text-xs font-sans font-medium shadow-[0_10px_30px_rgba(0,0,0,0.85),0_0_25px_rgba(16,185,129,0.35)] animate-fade-in flex items-center gap-2.5 backdrop-blur-xl">
            <Sparkles className="w-4 h-4 text-emerald-400 shrink-0 animate-pulse" />
            <p className="leading-snug">{activeBubble}</p>
          </div>
        )}
      </section>

      {/* ── 7. Bottom Telemetry Ticker (Philippine Retail Standard) ── */}
      <div className="px-4 sm:px-6 py-3 bg-obsidian-950 border-t border-white/[0.08] flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
        <div className="flex items-center gap-2 text-stone-400">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          <span className="text-emerald-400 font-bold">STATION: CEBU-BRGY-01</span>
          <span className="text-stone-600">·</span>
          <span>Dexie DB 100% Offline-1st</span>
          <span className="hidden md:inline text-stone-600">·</span>
          <span className="hidden md:inline text-stone-300">172 DTI SRP Ceilings Active</span>
          <span className="hidden lg:inline text-stone-600">·</span>
          <span className="hidden lg:inline text-amber-300">Live Jeepney &amp; Neighborhood Simulation</span>
        </div>

        <div className="flex items-center gap-2">
          {onQuickDemo && (
            <button
              type="button"
              onClick={onQuickDemo}
              className="px-3 py-1 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              <span>Launch 1-Click Demo</span>
            </button>
          )}

          {onOpenLogin && (
            <button
              type="button"
              onClick={onOpenLogin}
              className="px-3 py-1 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-obsidian-950 font-bold transition-all cursor-pointer shadow-[0_0_15px_rgba(16,185,129,0.4)]"
            >
              Sign In →
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

function SunriseIcon(props: React.SVGProps<SVGSVGElement>): React.JSX.Element {
  return (
    <svg
      {...props}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 2v6" />
      <path d="m4.93 10.93 4.24-4.24" />
      <path d="m19.07 10.93-4.24-4.24" />
      <path d="M2 18h20" />
      <path d="M20 18a8 8 0 0 0-16 0" />
    </svg>
  )
}
