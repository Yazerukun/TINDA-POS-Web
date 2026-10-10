import React, { useState } from 'react'
import {
  Bot,
  X,
  Send,
  Sparkles,
  TrendingUp,
  Package,
  Wallet,
  AlertTriangle,
  Lightbulb
} from 'lucide-react'

interface AiAssistantModalProps {
  open: boolean
  onClose: () => void
  storeName?: string
}

interface ChatMessage {
  id: string
  sender: 'user' | 'bot'
  text: string
  timestamp: string
}

const PRESET_QUERIES = [
  'Paano magpalaki ng kita sa Sari-Sari store?',
  'Anong mga paninda ang mabilis masira o mag-expire?',
  'Paano sumingil ng utang nang magalang?',
  'Ano ang tamang markup sa paninda?'
]

export function AiAssistantModal({
  open,
  onClose,
  storeName = 'TINDA SARI-SARI & MINIMART'
}: AiAssistantModalProps): React.JSX.Element | null {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      sender: 'bot',
      text: `Kumusta! Ako si TindaBot, ang inyong Retail AI Assistant sa ${storeName}. May maitutulong ba ako sa pagpapatakbo ng inyong tindahan, imbentaryo, o paniningil sa suki?`,
      timestamp: 'Ngayon'
    }
  ])
  const [inputText, setInputText] = useState('')
  const [isThinking, setIsThinking] = useState(false)

  if (!open) return null

  const handleSend = (textToSend?: string) => {
    const q = (textToSend || inputText).trim()
    if (!q) return

    const userMsg: ChatMessage = {
      id: String(Date.now()),
      sender: 'user',
      text: q,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }

    setMessages((prev) => [...prev, userMsg])
    if (!textToSend) setInputText('')
    setIsThinking(true)

    // Intelligent retail assistant logic
    setTimeout(() => {
      let reply = ''
      const lower = q.toLowerCase()

      if (lower.includes('kita') || lower.includes('profit') || lower.includes('palaki')) {
        reply = 'Para mapalaki ang kita: 1) Mag-alok ng complementary items (hal. kape at asuk, noodles at itlog). 2) Magdagdag ng high-margin services tulad ng E-Wallet bills cash-in at document printing. 3) Iwasan ang overstocking sa mga matamlay na paninda gamit ang Z-Reading analytics!'
      } else if (lower.includes('expire') || lower.includes('sira') || lower.includes('panis')) {
        reply = 'Gamitin ang FIFO (First In, First Out) rule! Ilagay sa pinakaharapan ng estante ang mga gatas, tinapay, at de-lata na may pinakamaagang expiration date. Tingnan din ang Shelf Expiration Watch sa Fast Tools dock linggo-linggo.'
      } else if (lower.includes('utang') || lower.includes('singil') || lower.includes('suki')) {
        reply = 'Sa paniningil ng utang, maging magalang ngunit parehas: Magpadala ng paalala sa araw ng suweldo (15/30) gamit ang "Courteous Reminder" sa Utang Ledger. Magtakda rin ng mahigpit na credit limit para hindi maubos ang inyong working capital.'
      } else if (lower.includes('markup') || lower.includes('presyo') || lower.includes('srp')) {
        reply = 'Para sa basic commodities (bigas, mantika, asuk), panatilihin ang markup sa 5% hanggang 10% sang-ayon sa DTI Bantay Presyo. Para sa meryenda, chichirya, at inumin, maaari kang mag-markup ng 15% hanggang 25% para sa magandang kita.'
      } else {
        reply = `Naiintindihan ko! Para sa pinakamahusay na operasyon sa ${storeName}, laging panatilihing updated ang Counter at mag-print ng pang-araw-araw na Z-Reading tuwing gabi para tugma ang inyong pera sa kaha.`
      }

      const botMsg: ChatMessage = {
        id: String(Date.now() + 1),
        sender: 'bot',
        text: reply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }

      setMessages((prev) => [...prev, botMsg])
      setIsThinking(false)
    }, 700)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-obsidian-950/80 backdrop-blur-md animate-fade-in select-none">
      <div className="relative w-full max-w-xl bg-obsidian-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col h-[600px] max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.08] bg-obsidian-950">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-stone-100 uppercase tracking-wider">
                  TindaBot Retail AI Copilot
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[0.625rem] font-mono font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  RETAIL AI
                </span>
              </div>
              <p className="text-xs text-stone-400">Philippine retail advisor &amp; smart cashier assistant</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-white/[0.04] hover:bg-white/[0.1] text-stone-400 hover:text-stone-100 flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Message Stream */}
        <div className="flex-1 p-6 overflow-y-auto space-y-4 custom-scrollbar">
          {messages.map((m) => (
            <div
              key={m.id}
              className={`flex ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[85%] p-4 rounded-2xl text-xs leading-relaxed font-sans ${
                  m.sender === 'user'
                    ? 'bg-emerald-500 text-obsidian-950 font-bold rounded-tr-none'
                    : 'bg-obsidian-850 text-stone-200 border border-slate-800 rounded-tl-none'
                }`}
              >
                <p>{m.text}</p>
                <span
                  className={`text-[0.5625rem] font-mono mt-1 block ${
                    m.sender === 'user' ? 'text-obsidian-900/80 text-right' : 'text-stone-500'
                  }`}
                >
                  {m.timestamp}
                </span>
              </div>
            </div>
          ))}

          {isThinking && (
            <div className="flex justify-start">
              <div className="p-3 rounded-2xl bg-obsidian-850 border border-slate-800 text-xs text-indigo-400 flex items-center gap-2">
                <Sparkles className="w-4 h-4 animate-spin" />
                <span>Nagiisip si TindaBot...</span>
              </div>
            </div>
          )}
        </div>

        {/* Presets Chips */}
        <div className="px-6 py-2 bg-obsidian-950 border-t border-white/[0.04] flex items-center gap-2 overflow-x-auto custom-scrollbar">
          {PRESET_QUERIES.map((pq, idx) => (
            <button
              key={idx}
              onClick={() => handleSend(pq)}
              className="text-[0.6875rem] text-stone-400 hover:text-stone-200 bg-obsidian-850 border border-slate-800 hover:border-slate-700 px-3 py-1.5 rounded-full shrink-0 font-sans transition-all active:scale-95"
            >
              {pq}
            </button>
          ))}
        </div>

        {/* Input Bar */}
        <div className="p-4 bg-obsidian-950 border-t border-white/[0.08] flex items-center gap-2">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Magtanong kay TindaBot tungkol sa inyong tindahan..."
            className="flex-1 px-4 py-2.5 rounded-2xl bg-obsidian-900 border border-slate-800 text-stone-200 text-xs outline-none focus:border-indigo-500"
          />
          <button
            onClick={() => handleSend()}
            disabled={!inputText.trim()}
            className="p-2.5 rounded-2xl bg-indigo-500 hover:bg-indigo-400 disabled:opacity-40 text-obsidian-950 transition-all shadow-glow-indigo"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
