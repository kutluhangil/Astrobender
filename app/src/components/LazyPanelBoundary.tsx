import { Component, Suspense, type ErrorInfo, type ReactNode } from 'react'
import { pickLanguage, type UiLanguage } from '@/lib/ui-language'

interface LazyPanelBoundaryProps {
  language: UiLanguage
  /** Shown in the failure notice so the user knows which panel did not load. */
  label: string
  onClose?: () => void
  children: ReactNode
}

interface LazyPanelBoundaryState {
  error: Error | null
}

/**
 * Panels load as separate chunks. A chunk can fail to arrive (offline first
 * visit, or a tab left open across a deploy that removed the old hashes); this
 * boundary keeps that failure inside the panel instead of unmounting the globe,
 * and states the cause.
 */
export default class LazyPanelBoundary extends Component<LazyPanelBoundaryProps, LazyPanelBoundaryState> {
  state: LazyPanelBoundaryState = { error: null }

  static getDerivedStateFromError(error: Error): LazyPanelBoundaryState {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(`Panel "${this.props.label}" failed to load`, error, info.componentStack)
  }

  render() {
    const { error } = this.state
    if (!error) return <Suspense fallback={null}>{this.props.children}</Suspense>
    const t = (tr: string, en: string) => pickLanguage(this.props.language, tr, en)
    return (
      <div
        role="alert"
        data-hud-surface
        className="pointer-events-auto max-w-[340px] rounded-xl border border-amber-300/30 bg-[#140f05]/95 p-3 font-mono text-[10px] text-amber-100 shadow-lg backdrop-blur-xl"
      >
        <p className="font-semibold">{t(`${this.props.label} yüklenemedi`, `${this.props.label} could not load`)}</p>
        <p className="mt-1 break-words text-[9px] text-amber-200/75">{error.message}</p>
        <div className="mt-2 flex gap-2">
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="rounded border border-amber-200/40 px-2 py-1 hover:bg-amber-200/10"
          >
            {t('Sayfayı yenile', 'Reload page')}
          </button>
          {this.props.onClose && (
            <button
              type="button"
              onClick={this.props.onClose}
              className="rounded border border-white/15 px-2 py-1 text-slate-300 hover:bg-white/5"
            >
              {t('Kapat', 'Close')}
            </button>
          )}
        </div>
      </div>
    )
  }
}
