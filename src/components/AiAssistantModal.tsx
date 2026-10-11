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
  'How to maximize retail profit margins?',
  'Which inventory items expire fastest?',
  'How to manage customer debt professionally?',
  'What is the recommended markup per category?'
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
      text: `Hello! I am TindaBot, your Retail AI Assistant for ${storeName}. How can I assist you with store operations, inventory control, or customer accounts today?`,
      timestamp: 'Now'
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

      if (lower.includes('profit') || lower.includes('margin') || lower.includes('revenue') || lower.includes('income')) {
        reply = 'To boost store profits: 1) Suggest high-margin complementary items (e.g. coffee & creamers, snacks & cold drinks). 2) Offer digital counter services like bill payments, cash-in, and document printing. 3) Reduce holding costs on slow-moving inventory by auditing your daily Z-Readings!'
      } else if (lower.includes('expire') || lower.includes('spoil') || lower.includes('shelf') || lower.includes('damage')) {
        reply = 'Enforce the strict FIFO (First In, First Out) principle! Position products with earlier expiration dates right at the front edge of display shelves. Review the Shelf Expiration Watch in your Fast Tools dock weekly.'
      } else if (lower.includes('debt') || lower.includes('credit') || lower.includes('collect') || lower.includes('ledger')) {
        reply = 'To keep customer credit healthy: Send courteous reminders on salary dates (15th and 30th) using the "Copy Reminder" feature in the Utang Ledger. Always enforce firm credit limits per account to protect working capital.'
      } else if (lower.includes('markup') || lower.includes('price') || lower.includes('cost') || lower.includes('srp')) {
        reply = 'For essential commodities (rice, cooking oil, sugar), maintain modest 5% to 10% margins aligned with official SRP benchmarks. For convenience items, beverages, and specialty snacks, apply 15% to 25% margins for strong counter profitability.'
      } else {
        reply = `Understood! For peak retail efficiency at ${storeName}, keep your counter catalog synchronized and generate a daily Z-Reading every closing to balance your cash register.`
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
                <span>TindaBot is thinking...</span>
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
            placeholder="Ask TindaBot anything about your store operations..."
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
