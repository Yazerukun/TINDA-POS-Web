import React, { useState, useEffect } from 'react'
import {
  Sun,
  Moon,
  Sunset,
  CloudRain,
  Volume2,
  Sparkles,
  Zap,
  Tag,
  Radio,
  QrCode,
  Store,
  ChevronDown
} from 'lucide-react'
import { playJeepneyHorn, playStoreChime, playScanSuccess } from '../lib/sound'

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
  const [jeepneyHonked, setJeepneyHonked] = useState(false)
  const [storeInteracted, setStoreInteracted] = useState(false)

  // Trigger speech bubbles with auto-dismiss
  const showBubble = (text: string) => {
    setActiveBubble(text)
    setTimeout(() => {
      setActiveBubble((curr) => (curr === text ? null : curr))
    }, 3800)
  }

  const handleJeepneyClick = () => {
    try {
      playJeepneyHorn()
    } catch {}
    setJeepneyHonked(true)
    showBubble('Beep-beep! Para po sa kanto! 100% Offline POS onboard!')
    setTimeout(() => setJeepneyHonked(false), 800)
  }

  const handleStoreClick = () => {
    try {
      playStoreChime()
    } catch {}
    setStoreInteracted(true)
    showBubble('Suki! Bili na! May malamig na softdrinks, GCash Cash-In, at sariwang tinapay!')
    setTimeout(() => setStoreInteracted(false), 800)
  }

  const handleGcashClick = () => {
    try {
      playScanSuccess()
    } catch {}
    showBubble('GCash & Maya Express: Cash-in/Out recorded with ₱15 convenience fee in digital ledger!')
  }

  return (
    <div className="relative w-full overflow-hidden rounded-3xl border border-white/[0.1] bg-obsidian-950 shadow-[0_25px_80px_-15px_rgba(0,0,0,0.9),0_0_50px_-10px_rgba(16,185,129,0.18)] select-none">
      {/* ── 1. Top Scene Control HUD ── */}
      <div className="relative z-30 flex flex-wrap items-center justify-between gap-3 px-4 sm:px-6 py-3.5 bg-obsidian-950/80 backdrop-blur-xl border-b border-white/[0.08]">
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

          <div className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 text-xs font-mono">
            <Volume2 className="w-3.5 h-3.5 animate-pulse" />
            <span>Interactive: Click Jeepney or Store!</span>
          </div>
        </div>
      </div>

      {/* ── 2. The Living Philippine Canvas ── */}
      <div
        className={`relative w-full h-[340px] sm:h-[400px] lg:h-[430px] overflow-hidden transition-all duration-1000 ${
          timeOfDay === 'DAWN'
            ? 'bg-gradient-to-b from-indigo-950 via-rose-950/80 to-amber-900/60'
            : timeOfDay === 'NOON'
            ? 'bg-gradient-to-b from-sky-900 via-teal-900/40 to-emerald-950/70'
            : timeOfDay === 'SUNSET'
            ? 'bg-gradient-to-b from-purple-950 via-pink-950/70 to-orange-900/60'
            : 'bg-gradient-to-b from-[#03060a] via-[#061210] to-[#071713]'
        }`}
      >
        {/* Sky Elements: Stars for Night */}
        {timeOfDay === 'NIGHT' && (
          <div className="absolute inset-0 pointer-events-none">
            {[...Array(24)].map((_, i) => (
              <div
                key={i}
                className="absolute w-1 h-1 bg-white rounded-full animate-ping opacity-60"
                style={{
                  top: `${(i * 17) % 65}%`,
                  left: `${(i * 23) % 96}%`,
                  animationDuration: `${2 + (i % 3)}s`,
                  animationDelay: `${(i * 0.4) % 3}s`
                }}
              />
            ))}
            {/* Glowing Moon */}
            <div className="absolute top-6 right-16 w-14 h-14 rounded-full bg-emerald-100 shadow-[0_0_40px_rgba(52,211,153,0.5)] flex items-center justify-center opacity-90 pointer-events-none">
              <div className="w-11 h-11 rounded-full bg-[#03060a] translate-x-2.5 -translate-y-1.5" />
            </div>
          </div>
        )}

        {/* Sun for Noon / Dawn */}
        {(timeOfDay === 'NOON' || timeOfDay === 'DAWN') && (
          <div
            className={`absolute rounded-full pointer-events-none transition-all duration-1000 ${
              timeOfDay === 'NOON'
                ? 'top-8 right-24 w-16 h-16 bg-yellow-100 shadow-[0_0_80px_rgba(250,204,21,0.8)] opacity-95'
                : 'top-16 right-36 w-14 h-14 bg-amber-200 shadow-[0_0_60px_rgba(251,191,36,0.7)] opacity-85'
            }`}
          />
        )}

        {/* Drifting Clouds */}
        <div className="absolute inset-x-0 top-6 pointer-events-none animate-cloud-drift opacity-40">
          <svg className="w-full h-24" viewBox="0 0 1200 120" fill="none">
            <path
              d="M100 60 Q130 30 180 40 Q220 20 270 45 Q310 30 340 60 Z"
              fill={timeOfDay === 'NIGHT' ? '#0f2922' : '#ffffff'}
              opacity={timeOfDay === 'NIGHT' ? 0.3 : 0.4}
            />
            <path
              d="M700 70 Q740 35 800 45 Q840 25 890 50 Q930 35 970 70 Z"
              fill={timeOfDay === 'NIGHT' ? '#0f2922' : '#ffffff'}
              opacity={timeOfDay === 'NIGHT' ? 0.25 : 0.35}
            />
          </svg>
        </div>

        {/* Monsoon Rain Overlay */}
        {isRaining && (
          <div className="absolute inset-0 pointer-events-none z-20 overflow-hidden">
            {[...Array(30)].map((_, i) => (
              <div
                key={i}
                className="absolute w-0.5 bg-gradient-to-b from-transparent via-teal-300 to-emerald-400 animate-rain-fall"
                style={{
                  height: `${24 + (i % 18)}px`,
                  left: `${(i * 3.4) % 100}%`,
                  top: `-${(i * 12) % 40}px`,
                  animationDuration: `${0.6 + (i % 4) * 0.1}s`,
                  animationDelay: `${(i * 0.05) % 0.8}s`
                }}
              />
            ))}
          </div>
        )}

        {/* Distant Silhouette: Philippine Mountain Ranges & Coconut Palms */}
        <div className="absolute bottom-28 inset-x-0 h-32 pointer-events-none opacity-40">
          <svg className="w-full h-full" viewBox="0 0 1200 120" preserveAspectRatio="none">
            <path
              d="M0 120 L0 80 Q150 40 300 75 T600 60 T900 70 T1200 50 L1200 120 Z"
              fill={timeOfDay === 'NIGHT' ? '#020d09' : '#062d21'}
            />
            {/* Coconut Palm Silhouettes */}
            <path
              d="M180 85 Q185 50 190 20 M190 20 Q170 15 155 25 M190 20 Q190 5 200 10 M190 20 Q210 20 220 30 M190 20 Q175 30 165 40"
              stroke={timeOfDay === 'NIGHT' ? '#031710' : '#0a3f2f'}
              strokeWidth="2.5"
              fill="none"
            />
            <path
              d="M840 80 Q845 45 850 15 M850 15 Q830 10 815 20 M850 15 Q850 0 860 5 M850 15 Q870 15 880 25 M850 15 Q835 25 825 35"
              stroke={timeOfDay === 'NIGHT' ? '#031710' : '#0a3f2f'}
              strokeWidth="2.5"
              fill="none"
            />
          </svg>
        </div>

        {/* ── 3. The Authentic Sari-Sari Store Front ("TIENDA DE ORO") ── */}
        <div
          onClick={handleStoreClick}
          className={`absolute bottom-20 left-4 sm:left-10 lg:left-16 z-15 w-[210px] sm:w-[260px] cursor-pointer group transition-transform ${
            storeInteracted ? 'scale-105' : 'hover:scale-[1.02]'
          }`}
          title="Click to interact with Sari-Sari Store counter!"
        >
          {/* Corrugated Tin Awning / Roof (Yero) with Tires on top */}
          <div className="relative">
            <div className="h-6 sm:h-7 bg-gradient-to-r from-zinc-700 via-stone-600 to-zinc-700 rounded-t-lg border-b-2 border-stone-800 shadow-lg relative overflow-hidden">
              {/* Tin corrugation lines */}
              <div className="absolute inset-0 bg-[repeating-linear-gradient(90deg,rgba(0,0,0,0.3)_0px,rgba(0,0,0,0.3)_6px,transparent_6px,transparent_12px)] opacity-60" />
            </div>
            {/* Rubber tires on roof (Authentic Pinoy Sari-Sari Detail!) */}
            <div className="absolute -top-2 left-6 w-5 h-3.5 rounded-full border-2 border-zinc-900 bg-zinc-800 shadow-sm" />
            <div className="absolute -top-2 right-10 w-5 h-3.5 rounded-full border-2 border-zinc-900 bg-zinc-800 shadow-sm" />
          </div>

          {/* Store Marquee & Brand Sign */}
          <div className="px-3 py-1.5 bg-zinc-900 border-x border-zinc-700 text-center relative overflow-hidden">
            <p className="text-[0.625rem] sm:text-xs font-serif font-black tracking-[0.2em] text-emerald-300 uppercase animate-neon-flicker">
              TINDA POS · TIENDA DE ORO
            </p>
            <p className="text-[0.5625rem] font-mono text-amber-300 tracking-wider uppercase">
              BARANGAY EXPRESS COUNTER
            </p>
          </div>

          {/* Wooden Counter Frame with Security Wire Grille (Rehas) */}
          <div className="h-28 sm:h-32 bg-stone-900 border-x border-b border-zinc-700 p-2.5 flex flex-col justify-between relative shadow-2xl">
            {/* Metal Grille Texture */}
            <div className="absolute inset-0 bg-[radial-gradient(#3f3f46_1px,transparent_1px)] [background-size:8px_8px] opacity-40 pointer-events-none" />

            {/* Hanging Sachets (Chips, Shampoo, 3-in-1 Coffee) */}
            <div className="relative z-10 flex items-start justify-between px-1">
              <div className="flex gap-1.5 animate-sachet-sway">
                <div className="w-3.5 h-10 rounded-sm bg-gradient-to-b from-yellow-500 to-red-500 shadow-sm border border-yellow-300/40" title="Chichirya" />
                <div className="w-3.5 h-9 rounded-sm bg-gradient-to-b from-emerald-500 to-teal-600 shadow-sm border border-emerald-300/40" title="Shampoo" />
                <div className="w-3.5 h-8 rounded-sm bg-gradient-to-b from-amber-600 to-orange-700 shadow-sm border border-amber-300/40" title="3-in-1 Coffee" />
              </div>

              {/* Munin the Store Cat lounging on shelf */}
              <div className="relative" title="Munin the Store Cat">
                <div className="w-6 h-4 bg-orange-400 rounded-full shadow-sm relative">
                  <div className="absolute -top-1 left-0.5 w-1.5 h-1.5 bg-orange-500 rotate-45" />
                  <div className="absolute -top-1 left-3.5 w-1.5 h-1.5 bg-orange-500 rotate-45" />
                  {/* Swishing Tail */}
                  <div className="absolute bottom-0 right-0 w-3 h-1 bg-orange-500 rounded-full animate-cat-tail" />
                </div>
              </div>
            </div>

            {/* Counter Surface with Thermal Printer & GCash QR */}
            <div className="relative z-10 pt-2 border-t border-zinc-700 flex items-center justify-between">
              {/* Thermal Printer with Receipt Out */}
              <div className="flex items-center gap-1.5">
                <div className="w-6 h-5 rounded bg-zinc-800 border border-zinc-600 relative flex items-center justify-center">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  {/* Receipt Paper coming out */}
                  <div className="absolute -top-2 left-1 right-1 h-2 bg-stone-100 rounded-t-sm shadow-sm" />
                </div>
                <span className="text-[0.5625rem] font-mono text-emerald-400">58mm ESC</span>
              </div>

              {/* GCash / Maya QR Stand */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  handleGcashClick()
                }}
                className="px-1.5 py-0.5 rounded bg-sky-500/20 border border-sky-400/40 text-[0.5625rem] font-mono font-bold text-sky-300 flex items-center gap-1 hover:bg-sky-500/30 transition-all cursor-pointer"
              >
                <QrCode className="w-3 h-3 text-sky-400" />
                <span>GCash QR</span>
              </button>
            </div>
          </div>

          {/* Beverage Crates Outside (Coke / San Miguel) */}
          <div className="absolute -bottom-4 right-2 flex gap-1 pointer-events-none">
            <div className="w-8 h-4 rounded-sm bg-red-700 border border-red-500/50 shadow-md flex items-center justify-center">
              <span className="text-[0.45rem] font-black text-white uppercase">COKE</span>
            </div>
            <div className="w-7 h-4 rounded-sm bg-amber-700 border border-amber-500/50 shadow-md flex items-center justify-center">
              <span className="text-[0.45rem] font-black text-white uppercase">SMB</span>
            </div>
          </div>
        </div>

        {/* ── 4. The Iconic Philippine Jeepney (Cruising smoothly on highway) ── */}
        <div
          onClick={handleJeepneyClick}
          className={`absolute bottom-6 z-25 cursor-pointer animate-jeepney-drive group ${
            jeepneyHonked ? 'scale-110' : 'hover:scale-105'
          } transition-transform`}
          title="Click the Jeepney to beep horn!"
        >
          <div className="relative w-[180px] sm:w-[220px]">
            {/* Speech bubble indicator when honked */}
            {jeepneyHonked && (
              <div className="absolute -top-10 left-6 px-2.5 py-1 rounded-full bg-amber-400 text-obsidian-950 font-mono text-xs font-black shadow-lg animate-bounce whitespace-nowrap z-30">
                BEEP-BEEP! 📯
              </div>
            )}

            {/* Jeepney Body Vector Frame */}
            <svg viewBox="0 0 240 100" className="w-full h-auto drop-shadow-[0_15px_25px_rgba(0,0,0,0.8)]">
              {/* Night Headlight Beams */}
              {timeOfDay === 'NIGHT' && (
                <polygon
                  points="225,60 340,30 340,95 225,75"
                  fill="url(#headlightBeam)"
                  opacity="0.35"
                />
              )}

              <defs>
                <linearGradient id="jeepneyChrome" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#e2e8f0" />
                  <stop offset="25%" stopColor="#94a3b8" />
                  <stop offset="50%" stopColor="#f8fafc" />
                  <stop offset="75%" stopColor="#64748b" />
                  <stop offset="100%" stopColor="#e2e8f0" />
                </linearGradient>
                <linearGradient id="jeepneyEmerald" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#34d399" />
                  <stop offset="50%" stopColor="#10b981" />
                  <stop offset="100%" stopColor="#065f46" />
                </linearGradient>
                <linearGradient id="headlightBeam" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#fef08a" stopOpacity="0.8" />
                  <stop offset="100%" stopColor="#fef08a" stopOpacity="0" />
                </linearGradient>
              </defs>

              {/* Jeepney Roof and Stainless Luggage Rack */}
              <rect x="25" y="15" width="160" height="7" rx="3" fill="url(#jeepneyChrome)" />
              <line x1="35" y1="13" x2="175" y2="13" stroke="#cbd5e1" strokeWidth="2.5" />
              <line x1="45" y1="13" x2="45" y2="16" stroke="#94a3b8" strokeWidth="2" />
              <line x1="90" y1="13" x2="90" y2="16" stroke="#94a3b8" strokeWidth="2" />
              <line x1="140" y1="13" x2="140" y2="16" stroke="#94a3b8" strokeWidth="2" />

              {/* Main Cabin & Windows */}
              <rect x="20" y="22" width="170" height="42" rx="4" fill="url(#jeepneyEmerald)" />

              {/* Open Air Passenger Windows */}
              <rect x="28" y="27" width="120" height="18" rx="2" fill="#0f172a" />
              {/* Passengers inside silhouette */}
              <circle cx="45" cy="36" r="4.5" fill="#f87171" opacity="0.8" />
              <circle cx="75" cy="36" r="4.5" fill="#38bdf8" opacity="0.8" />
              <circle cx="105" cy="36" r="4.5" fill="#facc15" opacity="0.8" />
              <circle cx="130" cy="36" r="4.5" fill="#a7f3d0" opacity="0.8" />

              {/* Front Windshield with Driver */}
              <polygon points="152,27 185,27 195,45 152,45" fill="#1e293b" />
              <circle cx="168" cy="36" r="5" fill="#fbbf24" />

              {/* Front Chrome Hood & Grille */}
              <path d="M185 38 L220 45 L225 66 L185 66 Z" fill="url(#jeepneyChrome)" />
              {/* Classic Chrome Horse Mascot on Hood */}
              <circle cx="218" cy="42" r="2" fill="#ffffff" />

              {/* Route Signboard Banner */}
              <rect x="50" y="47" width="85" height="11" rx="2" fill="#ffffff" stroke="#e2e8f0" strokeWidth="0.8" />
              <text x="53" y="55" fontSize="6.5" fontWeight="bold" fill="#dc2626" fontFamily="sans-serif">
                DIVISORIA · TINDA
              </text>

              {/* Front Heavy Duty Bumper & Headlight */}
              <rect x="218" y="60" width="10" height="12" rx="2" fill="#e2e8f0" />
              <circle cx="223" cy="66" r="4.5" fill="#fef08a" stroke="#ca8a04" strokeWidth="1" />

              {/* Spinning Front Wheel */}
              <g className="animate-wheel-spin" style={{ transformOrigin: '190px 72px' }}>
                <circle cx="190" cy="72" r="14" fill="#09090b" stroke="#3f3f46" strokeWidth="2" />
                <circle cx="190" cy="72" r="7" fill="url(#jeepneyChrome)" />
                <line x1="190" y1="58" x2="190" y2="86" stroke="#e2e8f0" strokeWidth="1.5" />
                <line x1="176" y1="72" x2="204" y2="72" stroke="#e2e8f0" strokeWidth="1.5" />
              </g>

              {/* Spinning Rear Wheel */}
              <g className="animate-wheel-spin" style={{ transformOrigin: '65px 72px' }}>
                <circle cx="65" cy="72" r="14" fill="#09090b" stroke="#3f3f46" strokeWidth="2" />
                <circle cx="65" cy="72" r="7" fill="url(#jeepneyChrome)" />
                <line x1="65" y1="58" x2="65" y2="86" stroke="#e2e8f0" strokeWidth="1.5" />
                <line x1="51" y1="72" x2="79" y2="72" stroke="#e2e8f0" strokeWidth="1.5" />
              </g>

              {/* Exhaust Pipe & Smoke */}
              <rect x="14" y="66" width="8" height="3" fill="#64748b" />
            </svg>
          </div>
        </div>

        {/* ── 5. The Stainless Tricycle (Passing smoothly from opposite lane) ── */}
        <div className="absolute bottom-16 z-20 animate-tricycle-drive pointer-events-none">
          <div className="w-[120px] sm:w-[140px] opacity-90">
            <svg viewBox="0 0 160 90" className="w-full h-auto drop-shadow-lg">
              {/* Tricycle Roof & Stainless Cab */}
              <rect x="20" y="20" width="70" height="5" rx="2" fill="#cbd5e1" />
              <rect x="25" y="25" width="60" height="30" rx="3" fill="#0284c7" opacity="0.85" />
              <rect x="30" y="30" width="30" height="14" rx="2" fill="#0f172a" />
              {/* Motorcycle Section */}
              <circle cx="115" cy="42" r="4" fill="#fbbf24" /> {/* Rider */}
              <polygon points="95,45 130,40 135,62 100,62" fill="#475569" />
              {/* Wheels */}
              <circle cx="45" cy="68" r="10" fill="#09090b" stroke="#64748b" strokeWidth="2" />
              <circle cx="125" cy="68" r="10" fill="#09090b" stroke="#64748b" strokeWidth="2" />
            </svg>
          </div>
        </div>

        {/* ── 6. Two-Lane Asphalt Highway & Sidewalk Curb ── */}
        <div className="absolute bottom-0 inset-x-0 h-16 bg-[#12151a] border-t-2 border-stone-700/80">
          {/* Dashed Center Road Line */}
          <div className="absolute top-1/2 left-0 right-0 h-1 border-b-2 border-dashed border-amber-400/70" />
          {/* Asphalt Texture */}
          <div className="absolute inset-0 bg-[radial-gradient(#262626_1px,transparent_1px)] [background-size:12px_12px] opacity-40 pointer-events-none" />
        </div>

        {/* ── 7. Interactive Floating Speech Bubble ── */}
        {activeBubble && (
          <div className="absolute top-16 left-1/2 -translate-x-1/2 z-40 max-w-md w-[90%] sm:w-auto px-4 py-2.5 rounded-2xl bg-obsidian-950/95 border border-emerald-500/40 text-stone-100 text-xs font-sans font-medium shadow-[0_10px_30px_rgba(0,0,0,0.8),0_0_20px_rgba(16,185,129,0.3)] animate-fade-in flex items-center gap-2.5 backdrop-blur-xl">
            <Sparkles className="w-4 h-4 text-emerald-400 shrink-0 animate-pulse" />
            <p className="leading-snug">{activeBubble}</p>
          </div>
        )}
      </div>

      {/* ── 8. Bottom Telemetry Ticker (Philippine Retail Standard) ── */}
      <div className="px-4 sm:px-6 py-3 bg-obsidian-950 border-t border-white/[0.08] flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
        <div className="flex items-center gap-2 text-stone-400">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          <span className="text-emerald-400 font-bold">EDGE STATION: BRGY-01</span>
          <span className="text-stone-600">·</span>
          <span>Dexie DB 100% Offline-1st</span>
          <span className="hidden md:inline text-stone-600">·</span>
          <span className="hidden md:inline text-stone-300">172 DTI SRP Ceilings Active</span>
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
              className="px-3 py-1 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-obsidian-950 font-bold transition-all cursor-pointer"
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
