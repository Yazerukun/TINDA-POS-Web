import React, { useState, useMemo } from 'react'
import {
  BookOpen,
  Search,
  Sparkles,
  Barcode,
  Boxes,
  Tag,
  Wallet,
  Printer,
  Keyboard,
  ShieldCheck,
  CheckCircle2,
  Clock,
  ArrowRight,
  ChevronRight
} from 'lucide-react'

interface Chapter {
  id: string
  number: number
  title: string
  subtitle: string
  readTime: string
  content: {
    summary: string
    keyPoints: string[]
    bestPractices: string[]
  }
}

const CHAPTERS: Chapter[] = [
  {
    id: 'cashier-flow',
    number: 1,
    title: 'Cashier Tour & Daily Flow',
    subtitle: 'Ang 4-step daily cashier flow: Scan, Utang check, Checkout, at Drawer balancing',
    readTime: '3 min read',
    content: {
      summary: 'Ang bawat cashier shift ay nagsisimula sa pagbilang ng opening float at nagtatapos sa Z-Reading cash balancing.',
      keyPoints: [
        'Hakbang 1: I-verify ang Opening Cash Float bago magsimulang magbenta.',
        'Hakbang 2: Gamitin ang barcode scanner o mabilisang search bar para sa bawat item.',
        'Hakbang 3: Kung suki ang bibili gamit ang utang, i-verify kung may available credit limit pa.',
        'Hakbang 4: Kumpirmahin ang eksaktong bayad at ibigay ang wastong sukli kasama ang resibo.'
      ],
      bestPractices: [
        'Huwag mag-iwan ng bukas na kaha habang nag-aabot ng paninda.',
        'Laging ipasok ang tamang denomination kapag nagsu-sukli para maiwasan ang short sa kaha.'
      ]
    }
  },
  {
    id: 'barcode-hardware',
    number: 2,
    title: 'Barcode Scanning & POS Hardware',
    subtitle: 'Paggamit ng USB Barcode Scanners, Camera Scanner, at thermal printers',
    readTime: '4 min read',
    content: {
      summary: 'Ang TINDA POS ay sumusuporta sa kahit anong standard USB plug-and-play barcode scanner at mobile phone cameras.',
      keyPoints: [
        'Ang USB scanner ay awtomatikong nagta-type ng barcode at nagpe-press ng Enter.',
        'Siguraduhing malinis ang barcode sa pakete ng paninda para sa mabilis na pagbasa.',
        'Kung walang barcode ang tingi (hal. itlog, asin, asuk), gamitin ang Quick Fast Buttons sa counter.'
      ],
      bestPractices: [
        'I-set ang scanner beep sound sa ON para marinig agad kapag pumasok ang item.',
        'Mag-print ng shelf barcode tags mula sa Thermal & Label Studio para sa mga unbranded goods.'
      ]
    }
  },
  {
    id: 'inventory-restock',
    number: 3,
    title: 'Inventory & Stock Reordering',
    subtitle: 'Pag-iwas sa out-of-stock sa tulong ng low stock thresholds at expiration tracker',
    readTime: '3 min read',
    content: {
      summary: 'Ang tamang pamamahala ng imbentaryo ay nagsisiguro na hindi mawawalan ng mabiling produkto ang inyong tindahan.',
      keyPoints: [
        'Maglagay ng Low Stock Threshold (halimbawa: 5 piraso) sa bawat produkto.',
        'Tingnan ang Expiration Radar tuwing Lunes para sa mga gatas, tinapay, at de lata.',
        'I-record agad ang bagong delivery ng supplier para tugma ang bilang sa kaha at istante.'
      ],
      bestPractices: [
        'FIFO Rule: First In, First Out. Ilagay sa unahan ang mga panindang mas maagang mag-e-expire.',
        'I-archive ang mga produktong hindi na ititinda sa halip na burahin para manatili ang lumang sales history.'
      ]
    }
  },
  {
    id: 'utang-management',
    number: 4,
    title: 'Utang & Credit Etiquette',
    subtitle: 'Pagpapanatili ng magandang samahan sa suki habang pinoprotektahan ang cashflow',
    readTime: '5 min read',
    content: {
      summary: 'Ang pautang ay sandata ng sari-sari store para lumago ang suki, ngunit kailangan ng disiplina para hindi malugi.',
      keyPoints: [
        'Magtakda ng Credit Limit sa bawat suki (hal. ₱500 hanggang ₱1,500 depende sa kakayahan).',
        'Huwag nang dagdagan ang pautang kung lampas na sa itinakdang limitasyon.',
        'Gamitin ang Courteous Reminder generator sa Utang Ledger para sa magalang na paniningil via SMS o Messenger.'
      ],
      bestPractices: [
        'Singilin ang suki sa araw ng kanilang suweldo (15th at 30th).',
        'Laging i-record ang bawat partial payment (hulog) agad-agad sa harap ng suki.'
      ]
    }
  },
  {
    id: 'loss-prevention',
    number: 5,
    title: 'Loss Prevention & Store Security',
    subtitle: 'Proteksyon laban sa kupit, fake bills, at short sa physical cash drawer',
    readTime: '4 min read',
    content: {
      summary: 'Panatilihing protektado ang kita sa pamamagitan ng regular na cash counts at shift balancing.',
      keyPoints: [
        'Magsagawa ng mid-day X-Reading kung magpapalitan ng kahera.',
        'Suriin ang mga ₱500 at ₱1,000 bills gamit ang watermark at security thread.',
        'Huwag magtago ng sobrang laking cash sa kaha; mag-cash drop o transfer kapag lumampas na sa ₱5,000.'
      ],
      bestPractices: [
        'Laging i-lock ang terminal gamit ang Staff PIN kapag aalis sa harap ng counter.',
        'I-record ang bawat kinuha para sa personal na gamit o meryenda bilang Operating Expense.'
      ]
    }
  },
  {
    id: 'bir-zreadings',
    number: 6,
    title: 'BIR Compliance & End-of-Day Z-Reading',
    subtitle: 'Pang-araw-araw na Z-Reading report at wastong diskwento para sa Senior at PWD',
    readTime: '3 min read',
    content: {
      summary: 'Ang Z-Reading ang opisyal na buod ng benta sa buong araw at nagre-reset ng daily running total.',
      keyPoints: [
        'I-print ang Z-Reading tuwing bago magsara ang tindahan sa gabi.',
        'I-check kung tugma ang Drawer Cash sa totoong perang pisikal sa kaha.',
        'Ibigay ang 20% discount sa mga Senior Citizens at PWD na may dalang valid ID para sa basic necessities.'
      ],
      bestPractices: [
        'Itabi ang na-print na thermal Z-Reading tapes sa isang ligtas na binder para sa buwanang filing.',
        'Mag-download ng buwanang backup mula sa Data & Backup Hub.'
      ]
    }
  }
]

export function HandbookScreen(): React.JSX.Element {
  const [selectedChapterId, setSelectedChapterId] = useState<string>(CHAPTERS[0]!.id)
  const [searchQuery, setSearchQuery] = useState('')

  const activeChapter = useMemo(() => {
    return CHAPTERS.find((c) => c.id === selectedChapterId) || CHAPTERS[0]!
  }, [selectedChapterId])

  const filteredChapters = useMemo(() => {
    if (!searchQuery.trim()) return CHAPTERS
    const q = searchQuery.toLowerCase()
    return CHAPTERS.filter(
      (c) =>
        c.title.toLowerCase().includes(q) ||
        c.subtitle.toLowerCase().includes(q) ||
        c.content.summary.toLowerCase().includes(q)
    )
  }, [searchQuery])

  return (
    <div className="flex-1 flex flex-col h-screen overflow-y-auto bg-obsidian-950 p-4 sm:p-6 lg:p-8 space-y-6 custom-scrollbar select-none">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/[0.08]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-serif font-bold text-stone-100 tracking-wide">
              Store Handbook &amp; Standard SOPs
            </h1>
            <p className="text-xs text-stone-400">
              Cashier operational manual, loss prevention guidelines, utang etiquette, and retail best practices
            </p>
          </div>
        </div>

        {/* Search */}
        <div className="relative max-w-xs w-full">
          <Search className="w-4 h-4 text-stone-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search handbook topics..."
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-obsidian-900 border border-slate-800 text-stone-200 text-xs outline-none focus:border-amber-500"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Chapters Directory (4 Cols) */}
        <div className="lg:col-span-4 space-y-2">
          <h3 className="text-xs font-bold text-stone-400 uppercase tracking-wider font-sans mb-3">
            Handbook Table of Contents
          </h3>
          <div className="space-y-2">
            {filteredChapters.map((chap) => (
              <button
                key={chap.id}
                type="button"
                onClick={() => setSelectedChapterId(chap.id)}
                className={`w-full p-4 rounded-2xl border text-left transition-all ${
                  selectedChapterId === chap.id
                    ? 'bg-amber-500/15 border-amber-500 text-amber-200 font-bold shadow-sm'
                    : 'bg-obsidian-900 border-slate-800 text-stone-300 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[0.625rem] font-mono px-2 py-0.5 rounded bg-white/[0.04] text-stone-400 font-bold">
                    CHAPTER {chap.number}
                  </span>
                  <span className="text-[0.625rem] font-mono text-stone-500 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    <span>{chap.readTime}</span>
                  </span>
                </div>
                <h4 className="text-sm font-bold text-stone-100">{chap.title}</h4>
                <p className="text-xs text-stone-400 mt-1 line-clamp-1">{chap.subtitle}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Right Column: Chapter Reading Workspace (8 Cols) */}
        <div className="lg:col-span-8">
          <div className="p-6 sm:p-8 rounded-3xl bg-obsidian-900 border border-slate-800 space-y-6 shadow-2xl">
            <div className="border-b border-white/[0.08] pb-4">
              <div className="flex items-center gap-2 text-amber-400 font-mono text-xs font-bold uppercase tracking-wider mb-1">
                <span>Chapter {activeChapter.number}</span>
                <span>•</span>
                <span>{activeChapter.readTime}</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-serif font-bold text-stone-100">
                {activeChapter.title}
              </h2>
              <p className="text-xs text-stone-400 mt-1 font-sans">{activeChapter.subtitle}</p>
            </div>

            {/* Summary Banner */}
            <div className="p-4 rounded-2xl bg-amber-500/[0.06] border border-amber-500/20 text-stone-300 text-xs leading-relaxed font-sans">
              <span className="font-bold text-amber-300 uppercase tracking-wider block mb-1">
                Buod ng Alituntunin (Summary):
              </span>
              {activeChapter.content.summary}
            </div>

            {/* Key Operational Points */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-stone-200 uppercase tracking-wider font-sans flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Mga Mahalagang Hakbang (Standard Procedures)</span>
              </h3>
              <div className="space-y-2">
                {activeChapter.content.keyPoints.map((pt, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 rounded-xl bg-obsidian-950 border border-slate-800/80 text-xs text-stone-300 font-sans flex items-start gap-3"
                  >
                    <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-mono font-bold text-[0.6875rem] shrink-0 mt-0.5">
                      {idx + 1}
                    </span>
                    <span className="leading-relaxed">{pt}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Best Practices */}
            <div className="space-y-3 pt-2">
              <h3 className="text-xs font-bold text-amber-300 uppercase tracking-wider font-sans flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span>Mga Mungkahi at Paalala (Pro Tips)</span>
              </h3>
              <div className="space-y-2">
                {activeChapter.content.bestPractices.map((tip, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-xl bg-amber-500/[0.04] border border-amber-500/15 text-xs text-amber-200/90 font-sans leading-relaxed"
                  >
                    💡 {tip}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
