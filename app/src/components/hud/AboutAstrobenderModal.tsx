import { useDialogFocus } from '@/hooks/useDialogFocus'
import { pickLanguage, type UiLanguage } from '@/lib/ui-language'

interface AboutAstrobenderModalProps {
  language: UiLanguage
  onClose: () => void
}

const PRIMARY_SOURCES = [
  { label: 'NASA Solar System', href: 'https://science.nasa.gov/solar-system/' },
  { label: 'JPL Solar System Dynamics', href: 'https://ssd.jpl.nasa.gov/' },
  { label: 'CelesTrak', href: 'https://celestrak.org/' },
  { label: 'USGS', href: 'https://www.usgs.gov/' },
  { label: 'NOAA SWPC', href: 'https://www.swpc.noaa.gov/' },
  { label: 'IAU', href: 'https://iau.org/' },
]

export default function AboutAstrobenderModal({ language, onClose }: AboutAstrobenderModalProps) {
  const dialogRef = useDialogFocus(onClose)
  const t = (tr: string, en: string) => pickLanguage(language, tr, en)

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-3 backdrop-blur-sm md:items-center">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="astrobender-about-title"
        tabIndex={-1}
        className="max-h-[min(720px,calc(100vh-24px))] w-full max-w-xl overflow-y-auto rounded-2xl border border-cyan-400/25 bg-[#091017]/95 p-4 shadow-[0_24px_80px_rgba(0,0,0,0.72)] backdrop-blur-2xl md:p-5"
      >
        <header className="flex items-start justify-between gap-4 border-b border-white/10 pb-3">
          <div>
            <p className="font-mono text-[9px] font-semibold uppercase tracking-[0.2em] text-cyan-300">ASTROBENDER / DATA NOTE</p>
            <h2 id="astrobender-about-title" className="mt-1 font-mono text-base font-bold tracking-wide text-cyan-50">
              {t('Yöntem, veri ve gizlilik', 'Method, data & privacy')}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t('Bilgi penceresini kapat', 'Close information dialog')}
            className="rounded-lg border border-white/10 px-2 py-1 font-mono text-xs text-slate-300 transition-colors hover:bg-white/10 hover:text-white"
          >
            ×
          </button>
        </header>

        <section className="mt-4">
          <h3 className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-cyan-300">{t('Bu görünüm neyi temsil ediyor?', 'What does this view represent?')}</h3>
          <p className="mt-1.5 text-[12px] leading-relaxed text-slate-300">
            {t(
              'Gezegenlerin göreli sırası ve yörünge hareketi JPL tabanlı elemanlarla hesaplanır; mesafeler ekranda gezilebilir kalmak için bilinçli olarak sıkıştırılır. Boyutlar, yörünge genişliği ve uydu gösterimleri aynı fiziksel ölçekte değildir.',
              'Planet order and orbital motion are calculated from JPL-based elements; distances are deliberately compressed so the scene remains navigable. Sizes, orbital spans, and satellite displays are not rendered at one shared physical scale.',
            )}
          </p>
        </section>

        <section className="mt-4 rounded-xl border border-white/10 bg-white/[0.025] p-3">
          <h3 className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-cyan-300">{t('Canlı veri davranışı', 'Live data behavior')}</h3>
          <ul className="mt-2 space-y-1.5 text-[11px] leading-relaxed text-slate-300">
            <li>{t('Uydu yörüngeleri CelesTrak TLE verisi ve SGP4 yayılımıyla hesaplanır. TLE epoch yaşı LIVE bilgi düğmesinde görünür.', 'Satellite orbits use CelesTrak TLE data and SGP4 propagation. TLE epoch age is shown through the LIVE information control.')}</li>
            <li>{t('Dünya Gözlemevi katmanları yalnızca açıldığında NASA EONET, USGS ve NOAA SWPC kaynaklarını sorgular. Ağ başarısız olursa mevcut zaman damgalı önbellek açıkça belirtilir.', 'Earth Observatory layers query NASA EONET, USGS, and NOAA SWPC only when enabled. If a request fails, any timestamped cache is labelled explicitly.')}</li>
            <li>{t('Katalogdaki fiziksel bilgiler kaynak tarihiyle gösterilir; 120 günü geçen inceleme penceresi otomatik kalite kontrolünde hata üretir.', 'Catalog physical facts show their review date; a review window beyond 120 days fails the automated quality check.')}</li>
          </ul>
        </section>

        <section className="mt-4">
          <h3 className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-cyan-300">{t('Gizlilik ve cihaz verisi', 'Privacy & device data')}</h3>
          <p className="mt-1.5 text-[12px] leading-relaxed text-slate-300">
            {t(
              'ASTROBENDER hesap, reklam ağı veya davranış analitiği kullanmaz. Tema, dil ve Skywatch gözlemci konumu yalnızca tarayıcınızda tutulur. Cihaz konumu yalnızca konum düğmesine basıldıktan sonra istenir ve ASTROBENDER dışına gönderilmeden yerel kalır. Çevrimdışı uygulama kabuğu hizmet çalışanıyla kullanılabilir; yüzey görselleri kod içinde şematik olarak üretilir ve paketlenmiş doku veya ses medyası yoktur.',
              'ASTROBENDER uses no accounts, ad networks, or behavioral analytics. Theme, language, and Skywatch observer location stay in your browser. Device location is requested only after the location button is pressed and remains local; ASTROBENDER does not transmit it. The offline app shell is available through the service worker; surface visuals are schematic and generated in code, with no packaged texture or audio media.',
            )}
          </p>
        </section>

        <section className="mt-4 border-t border-white/10 pt-3">
          <h3 className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-cyan-300">{t('Birincil kaynaklar', 'Primary sources')}</h3>
          <div className="mt-2 flex flex-wrap gap-2">
            {PRIMARY_SOURCES.map((source) => (
              <a key={source.label} href={source.href} target="_blank" rel="noreferrer" className="rounded-md border border-cyan-400/20 px-2 py-1 font-mono text-[9px] text-cyan-200 transition-colors hover:border-cyan-300/60 hover:text-cyan-100">
                {source.label} ↗
              </a>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}
