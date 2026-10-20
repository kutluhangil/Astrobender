import { useState, type ReactNode } from 'react'
import { useNasaTopic, type FeedState, type NasaTopic } from '@/hooks/useNasaFeeds'
import { ECLIPSE_SOURCE_URLS, upcomingEclipses, type Eclipse } from '@/lib/eclipses'
import {
  NASA_FEED_SOURCES,
  flareClassRank,
  stormScale,
  type ProbeRange,
} from '@/lib/nasa-feeds'
import { pickLanguage, type UiLanguage } from '@/lib/ui-language'

interface NasaDataPanelProps {
  onClose: () => void
  language?: UiLanguage
}

type Tab = NasaTopic | 'eclipses'
type Translate = (tr: string, en: string) => string

const TABS: ReadonlyArray<{ id: Tab; tr: string; en: string }> = [
  { id: 'space-weather', tr: 'Güneş', en: 'Sun' },
  { id: 'impact-risk', tr: 'Risk', en: 'Risk' },
  { id: 'fireballs', tr: 'Bolid', en: 'Fireball' },
  { id: 'voyager', tr: 'Voyager', en: 'Voyager' },
  { id: 'earth', tr: 'Dünya', en: 'Earth' },
  { id: 'picture', tr: 'Foto', en: 'Photo' },
  { id: 'exoplanets', tr: 'Ötegezegen', en: 'Exoplanets' },
  { id: 'eclipses', tr: 'Tutulma', en: 'Eclipses' },
]

function formatDate(value: string, language: UiLanguage): string {
  const parsed = Date.parse(value.includes('T') || value.includes(' ') ? value.replace(' ', 'T') : `${value}T00:00:00Z`)
  if (!Number.isFinite(parsed)) return value
  return new Date(parsed).toLocaleString(language === 'tr' ? 'tr-TR' : 'en-GB', {
    day: '2-digit',
    month: 'short',
    hour: value.length > 10 ? '2-digit' : undefined,
    minute: value.length > 10 ? '2-digit' : undefined,
    timeZone: 'UTC',
  })
}

function SourceLink({ href, label }: { href: string; label: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer noopener"
      className="font-mono text-[8px] text-cyan-300/80 underline decoration-cyan-300/30 underline-offset-2 hover:text-cyan-200"
    >
      {label} ↗
    </a>
  )
}

function Row({ title, meta, aside }: { title: ReactNode; meta?: ReactNode; aside?: ReactNode }) {
  return (
    <li className="hud-tile flex items-start justify-between gap-3 px-2.5 py-2">
      <div className="min-w-0">
        <div className="truncate font-mono text-[10px] text-slate-100">{title}</div>
        {meta && <div className="mt-0.5 font-mono text-[8px] leading-snug text-slate-500">{meta}</div>}
      </div>
      {aside && <div className="shrink-0 text-right font-mono text-[10px] text-cyan-200">{aside}</div>}
    </li>
  )
}

function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <h3 className="mb-1.5 mt-3 font-mono text-[8px] uppercase tracking-[0.22em] text-slate-500 first:mt-0">
      {children}
    </h3>
  )
}

function FeedView<T>({
  state,
  onRetry,
  t,
  children,
}: {
  state: FeedState<T> & { refresh: () => Promise<void> }
  onRetry: () => void
  t: Translate
  children: (data: T) => ReactNode
}) {
  if (state.status === 'error') {
    return (
      <div role="alert" className="rounded-lg border border-red-400/25 bg-red-400/5 p-2.5 font-mono text-[9px] text-red-200">
        <p>{t('Veri alınamadı', 'Data unavailable')}</p>
        <p className="mt-1 break-words text-red-200/70">{state.error}</p>
        <button
          type="button"
          onClick={onRetry}
          className="mt-2 rounded-md border border-red-300/30 px-2 py-1 text-[9px] text-red-100 hover:bg-red-300/10"
        >
          {t('Tekrar dene', 'Retry')}
        </button>
      </div>
    )
  }
  if (state.data === null) {
    return (
      <p className="rounded-lg border border-cyan-400/20 bg-cyan-400/5 p-3 font-mono text-[9px] text-cyan-100">
        {t('NASA verisi alınıyor…', 'Loading NASA data…')}
      </p>
    )
  }
  return <>{children(state.data)}</>
}

function SpaceWeatherTab({ language, t }: { language: UiLanguage; t: Translate }) {
  const feed = useNasaTopic('space-weather', true)
  return (
    <FeedView state={feed} onRetry={() => void feed.refresh()} t={t}>
      {({ flares, cmes, storms }) => {
        const strongest = [...flares].sort((a, b) => flareClassRank(b.classType) - flareClassRank(a.classType))[0]
        return (
          <>
            <div className="grid grid-cols-3 gap-1.5">
              <div className="hud-tile px-2 py-1.5">
                <div className="font-mono text-[7.5px] uppercase tracking-[0.14em] text-slate-500">{t('Parlama · 30 g', 'Flares · 30 d')}</div>
                <div className="mt-1 font-mono text-[12px] text-slate-100">{flares.length}</div>
              </div>
              <div className="hud-tile px-2 py-1.5">
                <div className="font-mono text-[7.5px] uppercase tracking-[0.14em] text-slate-500">{t('En güçlü', 'Strongest')}</div>
                <div className="mt-1 font-mono text-[12px] text-amber-200">{strongest?.classType ?? '—'}</div>
              </div>
              <div className="hud-tile px-2 py-1.5">
                <div className="font-mono text-[7.5px] uppercase tracking-[0.14em] text-slate-500">CME · 30 g</div>
                <div className="mt-1 font-mono text-[12px] text-slate-100">{cmes.length}</div>
              </div>
            </div>
            <SectionTitle>{t('Jeomanyetik fırtınalar · 60 gün', 'Geomagnetic storms · 60 days')}</SectionTitle>
            <ul className="space-y-1.5">
              {storms.length === 0 && (
                <Row title={t('Bu pencerede fırtına kaydı yok', 'No storms recorded in this window')} />
              )}
              {storms.slice(0, 4).map((storm) => (
                <Row
                  key={storm.id}
                  title={formatDate(storm.startTime, language)}
                  meta={storm.id}
                  aside={`Kp ${storm.maxKp ?? '—'} · ${stormScale(storm.maxKp)}`}
                />
              ))}
            </ul>
            <SectionTitle>{t('Son güneş parlamaları', 'Latest solar flares')}</SectionTitle>
            <ul className="space-y-1.5">
              {flares.slice(0, 5).map((flare) => (
                <Row
                  key={flare.id}
                  title={`${flare.classType} · ${formatDate(flare.beginTime, language)}`}
                  meta={flare.sourceLocation ?? t('Kaynak bölge belirsiz', 'Source region unknown')}
                />
              ))}
            </ul>
            <SectionTitle>{t('Koronal kütle atımları', 'Coronal mass ejections')}</SectionTitle>
            <ul className="space-y-1.5">
              {cmes.slice(0, 4).map((cme) => (
                <Row
                  key={cme.id}
                  title={formatDate(cme.startTime, language)}
                  meta={[cme.type, cme.sourceLocation].filter(Boolean).join(' · ') || cme.id}
                  aside={cme.speedKmS === null ? '—' : `${Math.round(cme.speedKmS)} km/s`}
                />
              ))}
            </ul>
            <div className="mt-3"><SourceLink href={NASA_FEED_SOURCES.donki} label="NASA DONKI" /></div>
          </>
        )
      }}
    </FeedView>
  )
}

function ImpactRiskTab({ t }: { t: Translate }) {
  const feed = useNasaTopic('impact-risk', true)
  return (
    <FeedView state={feed} onRetry={() => void feed.refresh()} t={t}>
      {({ sentry, scout }) => (
        <>
          <SectionTitle>
            {t(`Sentry · ${sentry.total} izlenen nesne · Palermo sırasıyla`, `Sentry · ${sentry.total} monitored objects · by Palermo scale`)}
          </SectionTitle>
          <ul className="space-y-1.5">
            {sentry.objects.map((object) => (
              <Row
                key={object.designation}
                title={object.fullName}
                meta={`${t('Yıllar', 'Years')} ${object.yearRange} · ${
                  object.diameterKm === null ? `H ${object.absoluteMagnitude ?? '—'}` : `${(object.diameterKm * 1000).toFixed(0)} m`
                } · Torino ${object.torinoMax ?? '—'}`}
                aside={
                  <>
                    <div>1 / {Math.round(1 / object.impactProbability).toLocaleString('en-US')}</div>
                    <div className="text-[8px] text-slate-500">PS {object.palermoCumulative.toFixed(2)}</div>
                  </>
                }
              />
            ))}
          </ul>
          <SectionTitle>{t('Scout · yeni keşfedilen adaylar', 'Scout · newly found candidates')}</SectionTitle>
          <ul className="space-y-1.5">
            {scout.map((object) => (
              <Row
                key={object.name}
                title={object.name}
                meta={`V ${object.magnitude ?? '—'} · ${
                  object.closestApproachLd === null ? '—' : `${object.closestApproachLd} LD`
                } · ${object.velocityKmS === null ? '—' : `${object.velocityKmS} km/s`}`}
                aside={`NEO ${object.neoScore}%`}
              />
            ))}
          </ul>
          <p className="mt-2 font-mono text-[8px] leading-snug text-slate-500">
            {t(
              'Olasılıklar bugünkü gözlemlerle hesaplanır ve yeni gözlemlerle çoğunlukla sıfırlanır. Torino 0 = ihmal edilebilir.',
              'Probabilities come from current observations and usually drop to zero as new data arrives. Torino 0 = negligible.',
            )}
          </p>
          <div className="mt-2 flex gap-3">
            <SourceLink href={NASA_FEED_SOURCES.sentry} label="CNEOS Sentry" />
            <SourceLink href={NASA_FEED_SOURCES.scout} label="CNEOS Scout" />
          </div>
        </>
      )}
    </FeedView>
  )
}

function FireballsTab({ language, t }: { language: UiLanguage; t: Translate }) {
  const feed = useNasaTopic('fireballs', true)
  return (
    <FeedView state={feed} onRetry={() => void feed.refresh()} t={t}>
      {(fireballs) => (
        <>
          <SectionTitle>{t('Hükümet sensörlerinin kaydettiği son bolidler', 'Latest fireballs seen by US government sensors')}</SectionTitle>
          <ul className="space-y-1.5">
            {fireballs.map((fireball) => (
              <Row
                key={fireball.date}
                title={formatDate(fireball.date, language)}
                meta={`${
                  fireball.latitude === null || fireball.longitude === null
                    ? t('Konum yok', 'No location')
                    : `${fireball.latitude.toFixed(1)}°, ${fireball.longitude.toFixed(1)}°`
                } · ${fireball.altitudeKm === null ? '—' : `${fireball.altitudeKm} km`} · ${
                  fireball.velocityKmS === null ? '—' : `${fireball.velocityKmS} km/s`
                }`}
                aside={fireball.impactEnergyKt === null ? '—' : `${fireball.impactEnergyKt} kt`}
              />
            ))}
          </ul>
          <div className="mt-3"><SourceLink href={NASA_FEED_SOURCES.fireball} label="CNEOS Fireballs" /></div>
        </>
      )}
    </FeedView>
  )
}

function ProbeTile({ name, range, t }: { name: string; range: ProbeRange; t: Translate }) {
  return (
    <div className="hud-tile px-3 py-2.5">
      <div className="font-mono text-[10px] font-semibold text-cyan-100">{name}</div>
      <dl className="mt-1.5 space-y-1 font-mono text-[9px]">
        <div className="flex justify-between gap-2">
          <dt className="text-slate-500">{t('Güneş’ten', 'From the Sun')}</dt>
          <dd className="text-slate-100">{range.heliocentricAu.toFixed(2)} AU</dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt className="text-slate-500">{t('Dünya’dan', 'From Earth')}</dt>
          <dd className="text-slate-100">{(range.earthDistanceKm / 1e9).toFixed(3)} {t('milyar km', 'billion km')}</dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt className="text-slate-500">{t('Işık gecikmesi', 'Light delay')}</dt>
          <dd className="text-slate-100">{range.lightTimeHours.toFixed(1)} {t('saat', 'h')}</dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt className="text-slate-500">{t('Hız (Güneş’e göre)', 'Speed (vs Sun)')}</dt>
          <dd className="text-slate-100">{range.heliocentricSpeedKmS.toFixed(2)} km/s</dd>
        </div>
      </dl>
    </div>
  )
}

function VoyagerTab({ t }: { t: Translate }) {
  const feed = useNasaTopic('voyager', true)
  return (
    <FeedView state={feed} onRetry={() => void feed.refresh()} t={t}>
      {({ voyager1, voyager2 }) => (
        <>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <ProbeTile name="Voyager 1" range={voyager1} t={t} />
            <ProbeTile name="Voyager 2" range={voyager2} t={t} />
          </div>
          <p className="mt-2 font-mono text-[8px] leading-snug text-slate-500">
            {t(
              'Konumlar JPL Horizons’tan bugünün tarihi için alınır; ışık gecikmesi tek yönlüdür.',
              'Positions come from JPL Horizons for today’s date; light delay is one-way.',
            )}
          </p>
          <div className="mt-2"><SourceLink href={NASA_FEED_SOURCES.horizons} label="JPL Horizons" /></div>
        </>
      )}
    </FeedView>
  )
}

function EarthTab({ language, t }: { language: UiLanguage; t: Translate }) {
  const feed = useNasaTopic('earth', true)
  const [index, setIndex] = useState(0)
  return (
    <FeedView state={feed} onRetry={() => void feed.refresh()} t={t}>
      {(images) => {
        const image = images[Math.min(index, images.length - 1)]
        if (!image) return <p className="font-mono text-[9px] text-slate-400">{t('Görüntü yok', 'No images')}</p>
        return (
          <>
            <img
              src={image.imageUrl}
              alt={t('DSCOVR EPIC kamerasından Dünya', 'Earth from the DSCOVR EPIC camera')}
              width="1024"
              height="1024"
              className="mx-auto aspect-square w-full max-w-[280px] rounded-full bg-black object-cover"
              loading="lazy"
              decoding="async"
            />
            <p className="mt-2 text-center font-mono text-[9px] text-slate-300">
              {formatDate(image.capturedAt, language)} UTC · {image.centroidLatitude.toFixed(1)}°, {image.centroidLongitude.toFixed(1)}°
            </p>
            <div className="mt-2 flex justify-center gap-1">
              {images.map((frame, position) => (
                <button
                  key={frame.identifier}
                  type="button"
                  onClick={() => setIndex(position)}
                  aria-label={`${t('Kare', 'Frame')} ${position + 1}`}
                  aria-pressed={position === index}
                  className={`h-2 w-6 rounded-full ${position === index ? 'bg-cyan-300' : 'bg-white/15 hover:bg-white/30'}`}
                />
              ))}
            </div>
            <div className="mt-3"><SourceLink href={NASA_FEED_SOURCES.epic} label="NASA EPIC · DSCOVR" /></div>
          </>
        )
      }}
    </FeedView>
  )
}

function PictureTab({ t }: { t: Translate }) {
  const feed = useNasaTopic('picture', true)
  return (
    <FeedView state={feed} onRetry={() => void feed.refresh()} t={t}>
      {(picture) => (
        <>
          <div className="font-mono text-[8px] uppercase tracking-[0.2em] text-slate-500">{picture.date}</div>
          <h3 className="mt-1 font-mono text-[12px] font-semibold text-slate-100">{picture.title}</h3>
          {picture.mediaType === 'image' ? (
            <img
              src={picture.url}
              alt={picture.title}
              className="mt-2 max-h-48 w-full rounded-lg bg-black object-cover"
              loading="lazy"
              decoding="async"
            />
          ) : (
            <a
              href={picture.url}
              target="_blank"
              rel="noreferrer noopener"
              className="mt-2 block rounded-lg border border-white/10 bg-white/[0.04] p-3 text-center font-mono text-[9px] text-cyan-200"
            >
              {t('Bugünün APOD’u bir video — NASA’da aç ↗', 'Today’s APOD is a video — open on NASA ↗')}
            </a>
          )}
          <p className="mt-2 font-sans text-[10px] leading-relaxed text-slate-400">
            {picture.explanation.length > 420 ? `${picture.explanation.slice(0, 420)}…` : picture.explanation}
          </p>
          <p className="mt-1 font-mono text-[8px] text-slate-600">
            {t('Açıklama NASA tarafından İngilizce yayımlanır.', 'Caption is published by NASA in English.')}
            {picture.copyright ? ` © ${picture.copyright}` : ''}
          </p>
          <div className="mt-2"><SourceLink href={NASA_FEED_SOURCES.apod} label="NASA APOD" /></div>
        </>
      )}
    </FeedView>
  )
}

function ExoplanetsTab({ t }: { t: Translate }) {
  const feed = useNasaTopic('exoplanets', true)
  return (
    <FeedView state={feed} onRetry={() => void feed.refresh()} t={t}>
      {({ recent, confirmed }) => (
        <>
          <div className="hud-tile px-3 py-2">
            <div className="font-mono text-[7.5px] uppercase tracking-[0.14em] text-slate-500">{t('Doğrulanmış ötegezegen', 'Confirmed exoplanets')}</div>
            <div className="mt-1 font-mono text-lg text-cyan-100">{confirmed.toLocaleString('en-US')}</div>
          </div>
          <SectionTitle>{t('En son keşifler', 'Most recent discoveries')}</SectionTitle>
          <ul className="space-y-1.5">
            {recent.map((planet) => (
              <Row
                key={planet.name}
                title={planet.name}
                meta={`${planet.method} · ${planet.discoveryYear}${planet.facility ? ` · ${planet.facility}` : ''}`}
                aside={
                  <>
                    <div>{planet.radiusEarth === null ? '—' : `${planet.radiusEarth.toFixed(1)} R⊕`}</div>
                    <div className="text-[8px] text-slate-500">
                      {planet.distanceParsec === null ? '—' : `${planet.distanceParsec.toFixed(0)} pc`}
                    </div>
                  </>
                }
              />
            ))}
          </ul>
          <div className="mt-3"><SourceLink href={NASA_FEED_SOURCES.exoplanets} label="NASA Exoplanet Archive" /></div>
        </>
      )}
    </FeedView>
  )
}

const ECLIPSE_TYPE_LABELS: Record<Eclipse['type'], { tr: string; en: string }> = {
  total: { tr: 'Tam', en: 'Total' },
  annular: { tr: 'Halkalı', en: 'Annular' },
  partial: { tr: 'Kısmi', en: 'Partial' },
  penumbral: { tr: 'Yarıgölge', en: 'Penumbral' },
}

function EclipsesTab({ language, t }: { language: UiLanguage; t: Translate }) {
  const [nowMs] = useState(() => Date.now())
  const eclipses = upcomingEclipses(nowMs, 8)
  return (
    <>
      <ul className="space-y-1.5">
        {eclipses.map((eclipse) => (
          <Row
            key={`${eclipse.kind}-${eclipse.date}`}
            title={`${eclipse.kind === 'solar' ? '☀' : '☾'} ${ECLIPSE_TYPE_LABELS[eclipse.type][language]} ${t(
              eclipse.kind === 'solar' ? 'Güneş tutulması' : 'Ay tutulması',
              eclipse.kind === 'solar' ? 'solar eclipse' : 'lunar eclipse',
            )}`}
            meta={language === 'tr' ? eclipse.regionTr : eclipse.regionEn}
            aside={
              <>
                <div>{formatDate(eclipse.date, language)} {eclipse.date.slice(0, 4)}</div>
                <div className="text-[8px] text-slate-500">{eclipse.duration ?? `mag ${eclipse.magnitude.toFixed(2)}`}</div>
              </>
            }
          />
        ))}
      </ul>
      <p className="mt-2 font-mono text-[8px] leading-snug text-slate-500">
        {t(
          'Zamanlar NASA tablolarındaki Dinamik Zaman’dır (UTC’den yaklaşık 70 sn ileri).',
          'Times in NASA’s tables are Dynamical Time (about 70 s ahead of UTC).',
        )}
      </p>
      <div className="mt-2 flex gap-3">
        <SourceLink href={ECLIPSE_SOURCE_URLS.solar} label={t('Güneş tutulmaları', 'Solar eclipses')} />
        <SourceLink href={ECLIPSE_SOURCE_URLS.lunar} label={t('Ay tutulmaları', 'Lunar eclipses')} />
      </div>
    </>
  )
}

export default function NasaDataPanel({ onClose, language = 'tr' }: NasaDataPanelProps) {
  const [tab, setTab] = useState<Tab>('space-weather')
  const t: Translate = (tr, en) => pickLanguage(language, tr, en)

  return (
    <section
      data-hud-surface
      aria-label={t('NASA Veri Merkezi', 'NASA Data Hub')}
      className="pointer-events-auto w-[380px] max-w-[calc(100vw-24px)] overflow-hidden rounded-2xl border border-cyan-400/25 bg-[#080f14]/94 shadow-[0_0_36px_rgba(34,211,238,0.1)] backdrop-blur-2xl"
    >
      <header className="flex items-start justify-between border-b border-white/10 px-3.5 py-3">
        <div>
          <div className="font-mono text-[9px] uppercase tracking-[0.24em] text-cyan-300/70">
            {t('NASA · JPL · NOAA', 'NASA · JPL · NOAA')}
          </div>
          <h2 className="mt-0.5 font-mono text-sm font-bold tracking-[0.1em] text-cyan-100">
            {t('NASA VERİ MERKEZİ', 'NASA DATA HUB')}
          </h2>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label={t('NASA Veri Merkezini kapat', 'Close NASA Data Hub')}
          className="rounded-md border border-white/10 bg-white/5 px-2 py-1 text-[10px] text-slate-300"
        >
          ✕
        </button>
      </header>

      <div role="tablist" className="grid grid-cols-4 gap-0.5 border-b border-white/10 p-1">
        {TABS.map((item) => (
          <button
            type="button"
            role="tab"
            key={item.id}
            aria-selected={tab === item.id}
            onClick={() => setTab(item.id)}
            className={`rounded-md px-1.5 py-1.5 font-mono text-[8px] transition-colors ${
              tab === item.id ? 'bg-cyan-400/15 text-cyan-100' : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            {language === 'tr' ? item.tr : item.en}
          </button>
        ))}
      </div>

      <div role="tabpanel" className="max-h-[48vh] overflow-y-auto p-3">
        {tab === 'space-weather' && <SpaceWeatherTab language={language} t={t} />}
        {tab === 'impact-risk' && <ImpactRiskTab t={t} />}
        {tab === 'fireballs' && <FireballsTab language={language} t={t} />}
        {tab === 'voyager' && <VoyagerTab t={t} />}
        {tab === 'earth' && <EarthTab language={language} t={t} />}
        {tab === 'picture' && <PictureTab t={t} />}
        {tab === 'exoplanets' && <ExoplanetsTab t={t} />}
        {tab === 'eclipses' && <EclipsesTab language={language} t={t} />}
      </div>
    </section>
  )
}
