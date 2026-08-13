import { pickLanguage, type UiLanguage } from '@/lib/ui-language'

interface MeteorFlowOverlayProps {
  language: UiLanguage
  onClose: () => void
}

export default function MeteorFlowOverlay({ language, onClose }: MeteorFlowOverlayProps) {
  const t = (tr: string, en: string) => pickLanguage(language, tr, en)

  return (
    <>
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-[15] overflow-hidden">
        <span className="perseid-flow perseid-flow--one" />
        <span className="perseid-flow perseid-flow--two" />
        <span className="perseid-flow perseid-flow--three" />
        <span className="perseid-flow perseid-flow--four" />
      </div>
      <aside data-hud-surface className="pointer-events-auto absolute right-3 top-[168px] z-30 flex max-w-[calc(100vw-24px)] rounded-lg border border-amber-200/30 bg-[#0b0d12]/84 px-2.5 py-2 shadow-[0_0_26px_rgba(251,191,36,0.16)] backdrop-blur-xl md:right-7 md:top-[128px] md:max-w-[260px]">
        <div className="flex items-center gap-2">
          <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-amber-200 shadow-[0_0_8px_rgba(253,230,138,1)]" />
          <span className="font-mono text-[8px] uppercase tracking-[0.16em] text-amber-100">{t('Perseid · görsel simülasyon', 'Perseid · visual simulation')}</span>
          <button type="button" onClick={onClose} className="rounded px-1 text-[11px] text-amber-100/70 hover:bg-white/10 hover:text-amber-50" aria-label={t('Meteor akışı simülasyonunu kapat', 'Close meteor flow simulation')}>×</button>
        </div>
      </aside>
    </>
  )
}
