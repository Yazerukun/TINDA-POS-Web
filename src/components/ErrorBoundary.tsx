import React, { Component, type ErrorInfo, type ReactNode } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'

interface Props {
  children: ReactNode
  fallbackTitle?: string
}

interface State {
  hasError: boolean
  error: Error | null
  errorInfo: ErrorInfo | null
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null }
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an unhandled error:', error, errorInfo)
    this.setState({ errorInfo })
  }

  public handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null })
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="max-w-2xl mx-auto my-8 p-6 rounded-3xl glass-vault border border-rose-500/40 text-stone-100 shadow-vault">
          <div className="flex items-center gap-3 mb-4 text-rose-400">
            <AlertTriangle className="w-6 h-6 shrink-0" />
            <h2 className="font-serif text-lg font-bold">
              {this.props.fallbackTitle || 'Component Encountered an Issue'}
            </h2>
          </div>
          <p className="text-xs text-stone-300 mb-3 font-mono">
            {this.state.error?.message || 'An unexpected rendering error occurred.'}
          </p>
          {this.state.error?.stack && (
            <pre className="p-3 rounded-xl bg-black/60 border border-white/10 text-[10px] font-mono text-stone-400 overflow-x-auto max-h-48 mb-4">
              {this.state.error.stack}
            </pre>
          )}
          <div className="flex items-center gap-3">
            <button
              onClick={this.handleReset}
              className="btn-gold px-4 py-2 rounded-xl text-xs font-mono font-bold flex items-center gap-2"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Retry Component</span>
            </button>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 rounded-xl bg-zinc-900 border border-white/10 text-stone-300 text-xs font-mono hover:text-white"
            >
              Reload Page
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
