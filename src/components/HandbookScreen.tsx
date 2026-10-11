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
    subtitle: 'The 4-step daily cashier flow: Barcode scan, Credit check, Tender checkout, and Drawer balancing',
    readTime: '3 min read',
    content: {
      summary: 'Every cashier shift begins with counting the opening cash float and concludes with Z-Reading drawer reconciliation.',
      keyPoints: [
        'Step 1: Verify the Opening Cash Float before serving your first customer.',
        'Step 2: Utilize the barcode scanner or instant search bar for each product.',
        'Step 3: If a credit customer purchases on account, verify their remaining credit limit first.',
        'Step 4: Confirm exact tendered payment, hand over change, and issue thermal receipt.'
      ],
      bestPractices: [
        'Never leave the cash drawer unattended or open while handling merchandise.',
        'Always enter the correct tendered denomination to prevent drawer cash discrepancies.'
      ]
    }
  },
  {
    id: 'barcode-hardware',
    number: 2,
    title: 'Barcode Scanning & POS Hardware',
    subtitle: 'Connecting USB scanners, mobile camera scanners, and thermal receipt printers',
    readTime: '4 min read',
    content: {
      summary: 'TINDA POS provides native plug-and-play support for standard USB barcode scanners, Bluetooth devices, and mobile phone cameras.',
      keyPoints: [
        'USB barcode scanners automatically input barcodes and submit with an Enter keystroke.',
        'Ensure barcode labels on packaging are clean and unbent for instant recognition.',
        'For unbarcoded loose goods (e.g., eggs, sugar, salt), utilize Quick Fast Buttons on the counter.'
      ],
      bestPractices: [
        'Keep scanner audio confirmation enabled to immediately verify item detection.',
        'Generate and print shelf barcode tags from the Thermal & Label Studio for unbranded goods.'
      ]
    }
  },
  {
    id: 'inventory-restock',
    number: 3,
    title: 'Inventory & Stock Reordering',
    subtitle: 'Preventing stockouts using low-stock safety thresholds and expiration tracking',
    readTime: '3 min read',
    content: {
      summary: 'Accurate inventory control ensures your retail store never runs out of fast-moving products or loses profit to expired goods.',
      keyPoints: [
        'Configure a Low Stock Threshold (e.g., 5 units) on every active inventory item.',
        'Review the Expiration Radar weekly for dairy, bread, and perishable canned items.',
        'Immediately log new supplier delivery batches so shelf inventory matches cashier records.'
      ],
      bestPractices: [
        'FIFO Rule: First In, First Out. Place newer batches at the rear and nearest expiration items in front.',
        'Archive discontinued products rather than deleting them to safeguard past transaction reports.'
      ]
    }
  },
  {
    id: 'utang-management',
    number: 4,
    title: 'Store Credit & Utang Etiquette',
    subtitle: 'Maintaining strong customer loyalty while protecting vital daily retail cashflow',
    readTime: '5 min read',
    content: {
      summary: 'Store credit is a proven community sales driver, but strict credit discipline is required to avoid cashflow shortages.',
      keyPoints: [
        'Assign a Credit Limit to each credit account (e.g., ₱500 to ₱1,500 based on repayment history).',
        'Hold further credit extensions once an account reaches or exceeds its assigned limit.',
        'Utilize the Courteous Reminder generator in the Utang Ledger for respectful SMS or messaging updates.'
      ],
      bestPractices: [
        'Schedule reminders around local salary periods (15th and 30th of each month).',
        'Immediately record each partial payment in front of the customer to maintain full transparency.'
      ]
    }
  },
  {
    id: 'loss-prevention',
    number: 5,
    title: 'Loss Prevention & Cash Security',
    subtitle: 'Safeguarding against shrinkage, counterfeit bills, and cash drawer discrepancies',
    readTime: '4 min read',
    content: {
      summary: 'Keep daily retail earnings secure through systematic cash audits and cashier shift handovers.',
      keyPoints: [
        'Perform mid-day X-Readings during cashier shift transitions.',
        'Inspect ₱500 and ₱1,000 bills against light for security watermarks and embedded threads.',
        'Avoid keeping excessive loose cash in the drawer; perform cash drops or bank transfers above ₱5,000.'
      ],
      bestPractices: [
        'Lock the terminal screen with Staff PIN whenever stepping away from the counter.',
        'Record all items taken for personal consumption or staff meals as Operating Expenses.'
      ]
    }
  },
  {
    id: 'bir-zreadings',
    number: 6,
    title: 'Compliance & End-of-Day Z-Reading',
    subtitle: 'Generating daily audit reports and applying statutory Senior Citizen and PWD discounts',
    readTime: '3 min read',
    content: {
      summary: 'The Z-Reading serves as the official daily sales summary, closing the fiscal period and balancing recorded cash against the drawer.',
      keyPoints: [
        'Generate and print the Z-Reading every evening prior to store closure.',
        'Cross-check recorded drawer cash against physical currency counted in the drawer.',
        'Grant the 20% statutory discount to Senior Citizens and PWDs presenting valid government IDs.'
      ],
      bestPractices: [
        'Store printed thermal Z-Reading tapes in a dedicated binder for monthly tax and audit filings.',
        'Download a monthly offline database backup archive from the Data & Backup Hub.'
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
                Policy Summary &amp; Overview:
              </span>
              {activeChapter.content.summary}
            </div>

            {/* Key Operational Points */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-stone-200 uppercase tracking-wider font-sans flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Standard Operating Procedures</span>
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
                <span>Operational Best Practices &amp; Pro Tips</span>
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
