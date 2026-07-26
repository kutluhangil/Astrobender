import type { LandingSite } from '@/lib/landing-sites'
import { useDialogFocus } from '@/hooks/useDialogFocus'
import { pickLanguage, type UiLanguage } from '@/lib/ui-language'

interface LandingSiteModalProps {
  site: LandingSite
  onClose: () => void
  language?: UiLanguage
}

export default function LandingSiteModal({ site, onClose, language = 'tr' }: LandingSiteModalProps) {
  const dialogRef = useDialogFocus(onClose)
  const isLanding = !site.kind || site.kind === 'landing'
  const siteName = language === 'tr' ? site.nameTr : site.name

  return (
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby="landing-site-title"
      tabIndex={-1}
      className="pointer-events-auto fixed bottom-24 right-4 z-40 w-[320px] max-w-[calc(100vw-32px)] rounded-2xl border border-amber-500/40 bg-[#0a0e17]/95 p-4 text-slate-100 shadow-[0_0_40px_rgba(245,158,11,0.25)] backdrop-blur-2xl animate-in fade-in slide-in-from-bottom-4 duration-300 focus:outline-none"
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/10 pb-2.5 mb-3">
        <div className="flex items-center gap-2.5">
          <span className="text-2xl drop-shadow-[0_0_8px_rgba(245,158,11,0.5)]">{site.emoji}</span>
          <div>
            <h3
              id="landing-site-title"
              className="font-mono text-xs font-bold tracking-wide text-amber-200 uppercase"
            >
              {siteName}
            </h3>
            <p className="font-mono text-[10px] text-amber-400/90">{site.name}</p>
          </div>
        </div>
        <button
          onClick={onClose}
          aria-label={pickLanguage(language, 'Yüzey noktası ayrıntılarını kapat', 'Close surface site details')}
          className="rounded-lg border border-white/10 bg-white/5 px-2 py-1 font-mono text-[10px] text-slate-400 hover:bg-white/10"
        >
          {pickLanguage(language, 'Kapat', 'Close')} ✖
        </button>
      </div>

      {/* Landing Details Grid */}
      <div className="grid grid-cols-2 gap-2 text-[10.5px] font-mono mb-3">
        <div className="rounded-lg border border-amber-500/20 bg-amber-950/20 p-2">
          <div className="text-[8.5px] uppercase tracking-wider text-amber-400/70 mb-0.5">
            {pickLanguage(language, isLanding ? 'İniş Yılı' : 'Kuruluş Yılı', isLanding ? 'Landing Year' : 'Established')}
          </div>
          <div className="font-bold text-amber-200">{site.year}</div>
        </div>
        <div className="rounded-lg border border-amber-500/20 bg-amber-950/20 p-2">
          <div className="text-[8.5px] uppercase tracking-wider text-amber-400/70 mb-0.5">
            {pickLanguage(language, 'Kurum', 'Organization')}
          </div>
          <div className="font-bold text-amber-200 truncate">
            {language === 'tr' ? site.agencyTr : site.agency}
          </div>
        </div>
        <div className="rounded-lg border border-white/5 bg-white/[0.03] p-2 col-span-2">
          <div className="text-[8.5px] uppercase tracking-wider text-slate-500 mb-0.5">
            {pickLanguage(language, 'Yüzey Koordinatı', 'Surface Coordinates')}
          </div>
          <div className="font-mono text-[10px] text-slate-300">
            {Math.abs(site.lat).toFixed(2)}° {site.lat >= 0 ? 'N' : 'S'}, {Math.abs(site.lon).toFixed(2)}° {site.lon >= 0 ? 'E' : 'W'}
          </div>
        </div>
      </div>

      {/* Historical Description */}
      <div className="rounded-xl border border-amber-500/30 bg-amber-950/30 p-2.5 text-[11px] leading-relaxed text-amber-100/90 font-sans">
        {site.emoji} <span className="font-medium text-amber-100">
          {language === 'en' && site.detailsEn ? site.detailsEn : site.detailsTr}
        </span>
      </div>
      {site.sourceUrl && (
        <a
          href={site.sourceUrl}
          target="_blank"
          rel="noreferrer"
          className="mt-2 inline-flex font-mono text-[8px] uppercase tracking-[0.15em] text-amber-300/75 hover:text-amber-200"
        >
          {pickLanguage(language, 'Resmî kaynak', 'Official source')} ↗
        </a>
      )}
    </div>
  )
}
