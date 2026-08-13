import { useRef, useState } from 'react'
import { useDialogFocus } from '@/hooks/useDialogFocus'
import {
  CELESTIAL_FUN_FACTS_EN,
  celestialTypeEn,
  celestialValueEn,
} from '@/lib/celestial-facts'
import type { CelestialBodyId } from '@/lib/planets'
import { pickLanguage, type UiLanguage } from '@/lib/ui-language'

interface CelestialScaleSpec {
  id: CelestialBodyId
  name: string
  nameTr: string
  emoji: string
  typeTr: string
  radiusKm: string
  ratioToEarth: number
  gravity: string
  climate: string
  atmosphere: string
  palette: readonly [string, string, string]
  funFact: string
}

const SORTED_BODIES: CelestialScaleSpec[] = [
  {
    id: 'sun',
    name: 'Sun',
    nameTr: 'Güneş',
    emoji: '☀️',
    typeTr: 'Sarı Cüce Yıldız',
    radiusKm: '696,340 km',
    ratioToEarth: 109.2,
    gravity: '274.0 m/s² (27.9g)',
    climate: '5,500°C Yüzey / 15 Milyon°C Çekirdek',
    atmosphere: 'Hidrojen (%73), Helyum (%25)',
    palette: ['#fff7ae', '#f59e0b', '#9a3412'],
    funFact: 'Güneş Sistemimizin toplam kütlesinin %99.86\'sını tek başına oluşturur.',
  },
  {
    id: 'jupiter',
    name: 'Jupiter',
    nameTr: 'Jüpiter',
    emoji: '🪐',
    typeTr: 'Gaz Devi',
    radiusKm: '69,911 km',
    ratioToEarth: 10.97,
    gravity: '24.79 m/s² (2.53g)',
    climate: '-110°C, Devasa Gaz Fırtınaları',
    atmosphere: 'Hidrojen (%90), Helyum (%10)',
    palette: ['#ffe0bd', '#b86d47', '#57251b'],
    funFact: 'En büyük gezegendir; içine 1,300 adet Dünya sığabilir.',
  },
  {
    id: 'saturn',
    name: 'Saturn',
    nameTr: 'Satürn',
    emoji: '🪐',
    typeTr: 'Gaz Devi (Halkalı)',
    radiusKm: '58,232 km',
    ratioToEarth: 9.14,
    gravity: '10.44 m/s² (1.06g)',
    climate: '-140°C, Supersonik Rüzgarlar',
    atmosphere: 'Hidrojen (%96), Helyum (%3)',
    palette: ['#f7e6b5', '#c5a569', '#66533a'],
    funFact: 'Yoğunluğu sudan azdır; devasa bir okyanusa konsaydı suda yüzerdi.',
  },
  {
    id: 'uranus',
    name: 'Uranus',
    nameTr: 'Uranüs',
    emoji: '🔵',
    typeTr: 'Buz Devi',
    radiusKm: '25,362 km',
    ratioToEarth: 3.98,
    gravity: '8.69 m/s² (0.89g)',
    climate: '-195°C, 97.7° Yan Yatan Eksen',
    atmosphere: 'Hidrojen (%83), Helyum (%15), Metan',
    palette: ['#c5f2f0', '#48a6bf', '#164e63'],
    funFact: 'Ekseni 98 derece yatıktır, yana yatmış bir varil gibi yörüngesinde yuvarlanır.',
  },
  {
    id: 'neptune',
    name: 'Neptune',
    nameTr: 'Neptün',
    emoji: '🔵',
    typeTr: 'Buz Devi',
    radiusKm: '24,622 km',
    ratioToEarth: 3.86,
    gravity: '11.15 m/s² (1.14g)',
    climate: '-200°C, 2,000 km/h Fırtınalar',
    atmosphere: 'Hidrojen (%80), Helyum (%19), Metan',
    palette: ['#b7cdfd', '#3264bd', '#172554'],
    funFact: 'Güneş Sistemi\'nin en güçlü rüzgarlarına sahiptir (2,000 km/h üzeri).',
  },
  {
    id: 'earth',
    name: 'Earth',
    nameTr: 'Dünya',
    emoji: '🌍',
    typeTr: 'Karasal Gezegen',
    radiusKm: '6,371 km',
    ratioToEarth: 1.0,
    gravity: '9.81 m/s² (1.00g)',
    climate: '-88°C ile +58°C, Sıvı Su Okyanusları',
    atmosphere: 'Azot (%78), Oksijen (%21), Argon',
    palette: ['#b7f1ef', '#1477b8', '#062653'],
    funFact: 'Sıvı halde okyanuslara ve yaşama sahip bilinen tek gök cismidir.',
  },
  {
    id: 'venus',
    name: 'Venus',
    nameTr: 'Venüs',
    emoji: '♀️',
    typeTr: 'Karasal Gezegen',
    radiusKm: '6,052 km',
    ratioToEarth: 0.95,
    gravity: '8.87 m/s² (0.90g)',
    climate: '465°C, Sülfürik Asit Yağmurları',
    atmosphere: 'Karbondioksit (%96.5), Azot (%3.5)',
    palette: ['#fee2a8', '#d97706', '#7c2d12'],
    funFact: 'Sera etkisi nedeniyle en sıcak gezegendir; kurşun bile erir.',
  },
  {
    id: 'mars',
    name: 'Mars',
    nameTr: 'Mars',
    emoji: '♂️',
    typeTr: 'Karasal Gezegen',
    radiusKm: '3,389 km',
    ratioToEarth: 0.53,
    gravity: '3.72 m/s² (0.38g)',
    climate: '-63°C, Kızıl Regolit & Devasa Toz',
    atmosphere: 'Karbondioksit (%95), Argon (%1.9)',
    palette: ['#f4b49b', '#c2410c', '#5b1d15'],
    funFact: 'Güneş Sistemi\'nin en yüksek dağı Olympus Mons (21.9 km) buradadır.',
  },
  {
    id: 'ganymede',
    name: 'Ganymede',
    nameTr: 'Ganymede',
    emoji: '🌑',
    typeTr: 'Jüpiter Uydusu',
    radiusKm: '2,634 km',
    ratioToEarth: 0.41,
    gravity: '1.43 m/s² (0.15g)',
    climate: '-160°C, Tektonik Buz Çatlakları',
    atmosphere: 'İnce Oksijen Egzozferi',
    palette: ['#e4e4e7', '#777d88', '#252a33'],
    funFact: 'Güneş Sistemi\'nin en büyük uydusudur; Merkür gezegeninden daha büyüktür.',
  },
  {
    id: 'titan',
    name: 'Titan',
    nameTr: 'Titan',
    emoji: '🟠',
    typeTr: 'Satürn Uydusu',
    radiusKm: '2,575 km',
    ratioToEarth: 0.4,
    gravity: '1.35 m/s² (0.14g)',
    climate: '-179°C, Sıvı Metan Gölleri ve Denizleri',
    atmosphere: 'Azot (%95), Metan (%5)',
    palette: ['#f3c37b', '#bf6c25', '#633116'],
    funFact: 'Yüzeyinde sıvı metan gölleri ve yoğun atmosferi olan tek uydudur.',
  },
  {
    id: 'mercury',
    name: 'Mercury',
    nameTr: 'Merkür',
    emoji: '🪨',
    typeTr: 'Karasal Gezegen',
    radiusKm: '2,440 km',
    ratioToEarth: 0.38,
    gravity: '3.70 m/s² (0.38g)',
    climate: '-180°C (Gece) / +430°C (Gündüz)',
    atmosphere: 'İnce ekzosfer: Oksijen, Sodyum, Hidrojen, Helyum ve Potasyum',
    palette: ['#d8d4cd', '#77716a', '#2d2926'],
    funFact: 'Güneş\'e en yakın gezegendir; ince ekzosferi ısıyı tutamadığı için gece ve gündüz sıcaklıkları çok farklıdır.',
  },
  {
    id: 'callisto',
    name: 'Callisto',
    nameTr: 'Callisto',
    emoji: '🌑',
    typeTr: 'Jüpiter Uydusu',
    radiusKm: '2,410 km',
    ratioToEarth: 0.38,
    gravity: '1.24 m/s² (0.13g)',
    climate: '-140°C, Kadim Kraterleşmiş Yüzey',
    atmosphere: 'Karbondioksit İzleri',
    palette: ['#d2c3ae', '#6b6258', '#302a25'],
    funFact: 'Güneş Sistemi\'nin en yoğun kraterli yüzeyine sahiptir.',
  },
  {
    id: 'io',
    name: 'Io',
    nameTr: 'Io',
    emoji: '🟡',
    typeTr: 'Jüpiter Uydusu',
    radiusKm: '1,821 km',
    ratioToEarth: 0.29,
    gravity: '1.79 m/s² (0.18g)',
    climate: '-130°C, 400+ Aktif Yanardağ',
    atmosphere: 'Kükürtdioksit (%90)',
    palette: ['#f7da70', '#bd6c1a', '#642a10'],
    funFact: 'Güneş Sistemi\'nin en aktif volkanik gök cismidir; 400\'den fazla aktif volkanı vardır.',
  },
  {
    id: 'moon',
    name: 'Moon',
    nameTr: 'Ay',
    emoji: '🌕',
    typeTr: 'Dünya Uydusu',
    radiusKm: '1,737 km',
    ratioToEarth: 0.27,
    gravity: '1.62 m/s² (0.17g)',
    climate: '-130°C ile +120°C, Anortozit Kraterler',
    atmosphere: 'Yok (Çok ince egzozfer)',
    palette: ['#e5e7eb', '#7c838c', '#20242b'],
    funFact: 'İnsanoğlunun üzerine ayak bastığı Dünya dışındaki tek gök cismidir.',
  },
  {
    id: 'europa',
    name: 'Europa',
    nameTr: 'Europa',
    emoji: '🧊',
    typeTr: 'Jüpiter Uydusu',
    radiusKm: '1,560 km',
    ratioToEarth: 0.25,
    gravity: '1.31 m/s² (0.13g)',
    climate: '-160°C, Global Okyanus & Kabuk',
    atmosphere: 'Seyrek Oksijen',
    palette: ['#eef2dc', '#9ba5a2', '#43474b'],
    funFact: 'Buz kabuğunun altında küresel tuzlu bir okyanus olduğu düşünülür; varlığı gelecekteki görevlerle doğrulanmayı bekliyor.',
  },
  {
    id: 'triton',
    name: 'Triton',
    nameTr: 'Triton',
    emoji: '❄️',
    typeTr: 'Neptün Uydusu',
    radiusKm: '1,353 km',
    ratioToEarth: 0.21,
    gravity: '0.78 m/s² (0.08g)',
    climate: '-235°C, Azot Gayzerleri',
    atmosphere: 'Azot & Metan İzleri',
    palette: ['#f2d9e4', '#a47f95', '#493742'],
    funFact: 'Ters yönde dönen (retrograd) tek büyük uydudur; azot gayzerleri püskürtür.',
  },
  {
    id: 'pluto',
    name: 'Pluto',
    nameTr: 'Plüton',
    emoji: '❄️',
    typeTr: 'Cüce Gezegen',
    radiusKm: '1,188 km',
    ratioToEarth: 0.19,
    gravity: '0.62 m/s² (0.06g)',
    climate: '-230°C, Azot & Karbonmonoksit Buzları',
    atmosphere: 'Azot, Metan, Karbonmonoksit',
    palette: ['#eee6dd', '#8d7568', '#3f322c'],
    funFact: 'Yüzeyinde devasa bir azot buzu kalbi (Sputnik Planitia) taşır.',
  },
  {
    id: 'titania',
    name: 'Titania',
    nameTr: 'Titania',
    emoji: '⚪',
    typeTr: 'Uranüs Uydusu',
    radiusKm: '788 km',
    ratioToEarth: 0.12,
    gravity: '0.37 m/s² (0.04g)',
    climate: '-203°C, Devasa Kanyonlar',
    atmosphere: 'Doğrulanmış atmosfer yok',
    palette: ['#dcecf2', '#7d9aa8', '#334955'],
    funFact: 'Uranüs\'ün en büyük uydusudur; devasa kanyon sistemleri barındırır.',
  },
  {
    id: 'oberon',
    name: 'Oberon',
    nameTr: 'Oberon',
    emoji: '🌑',
    typeTr: 'Uranüs Uydusu',
    radiusKm: '761 km',
    ratioToEarth: 0.119,
    gravity: '0.35 m/s² (0.04g)',
    climate: '-198°C, Kraterli Buz ve Kaya',
    atmosphere: 'Yok',
    palette: ['#d3d8da', '#68737a', '#31383c'],
    funFact: 'Uranüs\'ün ikinci büyük ve en dıştaki büyük uydusudur.',
  },
  {
    id: 'enceladus',
    name: 'Enceladus',
    nameTr: 'Enceladus',
    emoji: '🧊',
    typeTr: 'Satürn Uydusu',
    radiusKm: '252 km',
    ratioToEarth: 0.04,
    gravity: '0.11 m/s² (0.01g)',
    climate: '-201°C, Buz Kabuğu ve Su Gayzerleri',
    atmosphere: 'Su buharı ağırlıklı ince egzozfer',
    palette: ['#effaff', '#a7c3cf', '#4d6570'],
    funFact: 'Güney kutbundaki çatlaklardan uzaya su ve buz püskürtür.',
  },
  {
    id: 'phobos',
    name: 'Phobos',
    nameTr: 'Phobos',
    emoji: '🌑',
    typeTr: 'Mars Uydusu',
    radiusKm: '11.2 km',
    ratioToEarth: 0.0018,
    gravity: '0.0057 m/s²',
    climate: '-112°C Ortalama, Tozlu Kaya',
    atmosphere: 'Yok',
    palette: ['#c4ad99', '#766457', '#352c26'],
    funFact: 'Mars çevresinde bir Mars gününde yaklaşık üç tur atar.',
  },
  {
    id: 'deimos',
    name: 'Deimos',
    nameTr: 'Deimos',
    emoji: '🌑',
    typeTr: 'Mars Uydusu',
    radiusKm: '6.2 km',
    ratioToEarth: 0.001,
    gravity: '0.003 m/s²',
    climate: '-40°C Ortalama, Tozlu Kaya',
    atmosphere: 'Yok',
    palette: ['#d0ba9e', '#7a6a59', '#3e332b'],
    funFact: 'Mars\'ın daha küçük ve daha uzaktaki doğal uydusudur.',
  },
]

interface ScaleSandboxModalProps {
  onClose: () => void
  language?: UiLanguage
}

export default function ScaleSandboxModal({
  onClose,
  language = 'tr',
}: ScaleSandboxModalProps) {
  const [activeTab, setActiveTab] = useState<'all' | 'planets' | 'moons'>('all')
  const scrollRef = useRef<HTMLDivElement>(null)
  const dialogRef = useDialogFocus(onClose)

  const scrollContainer = (direction: 'left' | 'right') => {
    if (!scrollRef.current) return
    const offset = direction === 'left' ? -380 : 380
    scrollRef.current.scrollBy({ left: offset, behavior: 'smooth' })
  }

  const isMoon = (body: CelestialScaleSpec) => body.typeTr.includes('Uydu')
  const filtered = SORTED_BODIES.filter((b) => {
    if (activeTab === 'planets') return !isMoon(b)
    if (activeTab === 'moons') return isMoon(b)
    return true
  })
  const moonCount = SORTED_BODIES.filter(isMoon).length
  const planetAndSunCount = SORTED_BODIES.length - moonCount
  const t = (tr: string, en: string) => pickLanguage(language, tr, en)

  return (
    <div className="pointer-events-auto fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/85 p-0 md:p-4 backdrop-blur-xl animate-in fade-in duration-300">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="scale-sandbox-title"
        tabIndex={-1}
        className="relative w-full md:max-w-6xl rounded-t-2xl md:rounded-2xl border border-cyan-500/30 bg-[#060a12]/95 p-4 md:p-6 text-slate-100 shadow-[0_0_60px_rgba(6,182,212,0.25)] flex flex-col max-h-[92vh] md:max-h-[90vh] focus:outline-none"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-4">
          <div>
            <h2
              id="scale-sandbox-title"
              className="font-mono text-lg md:text-xl font-bold text-cyan-200 tracking-wide flex items-center gap-2"
            >
              <span>⚖️</span> {t(
                'GÜNEŞ SİSTEMİ GERÇEK BOYUT & ÖZELLİK KARŞILAŞTIRMASI',
                'SOLAR SYSTEM TRUE SIZE & FEATURE COMPARISON',
              )}
            </h2>
            <p className="font-mono text-xs text-slate-400 mt-1">
              {t(
                'Gök cisimleri kaynaklı yarıçaplarına göre sıralanır. Küre önizlemeleri görsel yardımcıdır; fiziksel ölçek ölçümü değildir.',
                'Bodies are ordered by sourced radii. Sphere previews are visual aids, not physical-scale measurements.',
              )}
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label={t('Boyut karşılaştırmasını kapat', 'Close size comparison')}
            className="rounded-lg border border-white/10 bg-white/5 px-3.5 py-1.5 font-mono text-xs text-slate-300 hover:bg-white/10 transition-all"
          >
            {t('Kapat', 'Close')} ✖
          </button>
        </div>

        {/* Tab Filters + Scroll Controls */}
        <div className="flex items-center justify-between gap-2 mb-4">
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab('all')}
              aria-pressed={activeTab === 'all'}
              className={`px-3 py-1 rounded-md font-mono text-xs transition-all ${
                activeTab === 'all'
                  ? 'border border-cyan-400/50 bg-cyan-400/20 text-cyan-200 font-bold'
                  : 'border border-white/10 bg-white/5 text-slate-400 hover:bg-white/10'
              }`}
            >
              {t('Tüm Gök Cisimleri', 'All Bodies')} ({SORTED_BODIES.length})
            </button>
            <button
              onClick={() => setActiveTab('planets')}
              aria-pressed={activeTab === 'planets'}
              className={`px-3 py-1 rounded-md font-mono text-xs transition-all ${
                activeTab === 'planets'
                  ? 'border border-amber-400/50 bg-amber-400/20 text-amber-200 font-bold'
                  : 'border border-white/10 bg-white/5 text-slate-400 hover:bg-white/10'
              }`}
            >
              {t('Gezegenler & Güneş', 'Planets & Sun')} ({planetAndSunCount})
            </button>
            <button
              onClick={() => setActiveTab('moons')}
              aria-pressed={activeTab === 'moons'}
              className={`px-3 py-1 rounded-md font-mono text-xs transition-all ${
                activeTab === 'moons'
                  ? 'border border-indigo-400/50 bg-indigo-400/20 text-indigo-200 font-bold'
                  : 'border border-white/10 bg-white/5 text-slate-400 hover:bg-white/10'
              }`}
            >
              {t('Uydular', 'Moons')} ({moonCount})
            </button>
          </div>

          {/* Quick Scroll Left / Right Buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => scrollContainer('left')}
              aria-label={t('Gök cisimlerini sola kaydır', 'Scroll bodies left')}
              className="flex items-center gap-1 px-3 py-1 rounded-lg border border-cyan-500/40 bg-cyan-500/10 text-cyan-300 hover:bg-cyan-500/20 text-xs font-mono font-bold transition-all shadow-[0_0_10px_rgba(6,182,212,0.15)]"
              title={t('Sola Kaydır', 'Scroll left')}
            >
              ◀ {t('SOLA', 'LEFT')}
            </button>
            <button
              onClick={() => scrollContainer('right')}
              aria-label={t('Gök cisimlerini sağa kaydır', 'Scroll bodies right')}
              className="flex items-center gap-1 px-3 py-1 rounded-lg border border-cyan-500/40 bg-cyan-500/10 text-cyan-300 hover:bg-cyan-500/20 text-xs font-mono font-bold transition-all shadow-[0_0_10px_rgba(6,182,212,0.15)]"
              title={t('Sağa Kaydır', 'Scroll right')}
            >
              {t('SAĞA', 'RIGHT')} ▶
            </button>
          </div>
        </div>

        {/* Horizontal Side-by-Side Scrolling Cards Container (Büyükten Küçüğe Yan Yana) */}
        <div
          ref={scrollRef}
          className="flex-1 overflow-x-auto overflow-y-hidden scrollbar-thin scrollbar-thumb-cyan-500/40 pb-4 pt-1"
        >
          <div className="flex gap-4 min-w-max px-1 items-stretch">
            {filtered.map((b, index) => {
              // Scale representation size for visual sphere preview
              const spherePx = Math.max(54, Math.min(130, 45 + Math.log2(b.ratioToEarth + 1) * 22))

              return (
                <div
                  key={b.id}
                  className="w-[280px] shrink-0 rounded-xl border border-white/10 bg-[#0d131f]/90 p-4 flex flex-col justify-between hover:border-cyan-400/50 hover:bg-[#121929] transition-all group"
                >
                  {/* Top Rank & Category Badge */}
                  <div>
                    <div className="flex items-center justify-between font-mono text-[10px] text-slate-400 border-b border-white/5 pb-2 mb-3">
                      <span className="font-bold text-cyan-400 bg-cyan-400/10 px-2 py-0.5 rounded border border-cyan-400/20">
                        #{index + 1}
                      </span>
                      <span className="uppercase text-slate-400 tracking-wider">
                        {language === 'tr' ? b.typeTr : celestialTypeEn(b.typeTr)}
                      </span>
                    </div>

                    {/* Planet 3D Sphere Visual Preview */}
                    <div className="flex flex-col items-center justify-center my-3 min-h-[140px]">
                      <div
                        className="rounded-full border border-white/20 shadow-[0_0_25px_rgba(255,255,255,0.15)] bg-center bg-cover transition-transform group-hover:scale-105 duration-300"
                        style={{
                          width: `${spherePx}px`,
                          height: `${spherePx}px`,
                          background: `radial-gradient(circle at 31% 28%, ${b.palette[0]} 0 12%, transparent 34%), repeating-linear-gradient(18deg, ${b.palette[1]} 0 3px, ${b.palette[2]} 4px 8px)`,
                        }}
                      />
                      <div className="mt-3 text-center">
                        <div className="font-mono text-base font-bold text-slate-100 flex items-center justify-center gap-1.5">
                          <span>{b.emoji}</span>
                          <span>{language === 'tr' ? b.nameTr : b.name}</span>
                        </div>
                        <div className="font-mono text-[10px] text-slate-400 uppercase">
                          {language === 'tr' ? b.name : b.nameTr}
                        </div>
                      </div>
                    </div>

                    {/* Technical Specs List */}
                    <div className="space-y-2 border-t border-white/5 pt-3 font-mono text-[11px]">
                      <div className="flex justify-between items-center bg-white/[0.03] p-1.5 rounded">
                        <span className="text-slate-400">📏 {t('Yarıçap:', 'Radius:')}</span>
                        <span className="font-semibold text-cyan-200">{b.radiusKm}</span>
                      </div>
                      <div className="flex justify-between items-center bg-white/[0.03] p-1.5 rounded">
                        <span className="text-slate-400">⚖️ {t('Göreceli:', 'Relative:')}</span>
                        <span className="font-semibold text-amber-200">{b.ratioToEarth.toFixed(2)}× {t('Dünya', 'Earth')}</span>
                      </div>
                      <div className="flex justify-between items-center bg-white/[0.03] p-1.5 rounded">
                        <span className="text-slate-400">⚓ {t('Yerçekimi:', 'Gravity:')}</span>
                        <span className="font-semibold text-emerald-200">{b.gravity}</span>
                      </div>
                      <div className="bg-white/[0.03] p-2 rounded space-y-1">
                        <div className="text-[10px] text-slate-400 uppercase tracking-wider">🌡️ {t('İklim & Hava:', 'Climate:')}</div>
                        <div className="text-[10.5px] text-slate-200 font-sans leading-tight">
                          {language === 'tr' ? b.climate : celestialValueEn(b.climate)}
                        </div>
                      </div>
                      <div className="bg-white/[0.03] p-2 rounded space-y-1">
                        <div className="text-[10px] text-slate-400 uppercase tracking-wider">💨 {t('Atmosfer:', 'Atmosphere:')}</div>
                        <div className="text-[10.5px] text-slate-300 font-sans leading-tight">
                          {language === 'tr' ? b.atmosphere : celestialValueEn(b.atmosphere)}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Fun Fact Footer */}
                  <div className="mt-3 border-t border-white/5 pt-2 font-sans text-[10px] text-cyan-300/80 italic leading-snug">
                    💡 {language === 'tr'
                      ? b.funFact
                      : CELESTIAL_FUN_FACTS_EN[b.id]}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
