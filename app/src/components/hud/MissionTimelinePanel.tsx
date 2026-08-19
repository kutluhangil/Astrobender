import { useState } from 'react'
import { LANDING_SITES } from '@/lib/landing-sites'
import {
  NSSDCA_MASTER_CATALOG_URL,
  groupMissionEventsByDecade,
  missionEventTimeMs,
  type MissionEvent,
  type MissionEventKind,
} from '@/lib/mission-timeline'
import { pickLanguage, type UiLanguage } from '@/lib/ui-language'

interface MissionTimelinePanelProps {
  language: UiLanguage
  onSelectEvent: (event: MissionEvent) => void
  onClose: () => void
}

const KIND_GLYPH: Record<MissionEventKind, string> = {
  launch: '↑',
  flyby: '→',
  'orbit-insertion': '◍',
  landing: '▼',
  end: '×',
}

const KIND_LABEL: Record<MissionEventKind, [string, string]> = {
  launch: ['Fırlatma', 'Launch'],
  flyby: ['Yakın geçiş', 'Flyby'],
  'orbit-insertion': ['Yörüngeye giriş', 'Orbit insertion'],
  landing: ['İniş', 'Landing'],
  end: ['Görev sonu', 'Mission end'],
}

function formatEventDate(event: MissionEvent, language: UiLanguage): string {
  return new Intl.DateTimeFormat(language === 'tr' ? 'tr-TR' : 'en-US', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'UTC',
    timeZoneName: 'short',
  }).format(new Date(missionEventTimeMs(event)))
}

export default function MissionTimelinePanel({
  language,
  onSelectEvent,
  onClose,
}: MissionTimelinePanelProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const t = (tr: string, en: string) => pickLanguage(language, tr, en)
  const decades = groupMissionEventsByDecade()
  const total = decades.reduce((sum, group) => sum + group.events.length, 0)

  return (
    <section
      data-hud-surface
      aria-label={t('Görev Zaman Tüneli', 'Mission Timeline')}
      className="hud-shell pointer-events-auto w-[360px] max-w-[calc(100vw-24px)] backdrop-blur-2xl"
    >
      <div className="hud-core overflow-hidden">
        <header className="flex items-start justify-between border-b border-white/[0.07] px-3.5 py-3">
          <div>
            <span className="hud-eyebrow">{t('NASA NSSDCA', 'NASA NSSDCA')}</span>
            <h2 className="mt-1 font-display text-sm font-semibold uppercase tracking-[0.08em] text-slate-50">
              {t('GÖREV ZAMAN TÜNELİ', 'MISSION TIMELINE')}
            </h2>
            <p className="mt-0.5 font-mono text-[8px] text-slate-500">
              {t(`${total} kayıtlı an`, `${total} recorded moments`)}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t('Görev Zaman Tünelini kapat', 'Close Mission Timeline')}
            className="rounded-full border border-white/10 bg-white/[0.06] px-2 py-1 text-[10px] leading-none text-slate-300 transition-transform duration-500 [transition-timing-function:var(--hud-ease)] active:scale-95"
          >
            ✕
          </button>
        </header>

        <div className="max-h-[44vh] overflow-y-auto p-3">
          {decades.map((group) => (
            <div key={group.decade} className="mb-3 last:mb-0">
              <div className="mb-1.5 flex items-center gap-2">
                <span className="font-mono text-[9px] font-semibold tabular-nums tracking-[0.16em] text-cyan-300/85">
                  {group.decade}s
                </span>
                <span className="h-px flex-1 bg-white/[0.08]" />
                <span className="font-mono text-[8px] tabular-nums text-slate-600">
                  {group.events.length}
                </span>
              </div>
              <ol className="space-y-1">
                {group.events.map((event) => {
                  const site = event.landingSiteId
                    ? LANDING_SITES.find((candidate) => candidate.id === event.landingSiteId)
                    : undefined
                  const selected = selectedId === event.id

                  return (
                    <li key={event.id}>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedId(event.id)
                          onSelectEvent(event)
                        }}
                        className={`hud-tile w-full px-2 py-1.5 text-left ${
                          selected ? 'border-cyan-300/45 bg-cyan-300/[0.09]' : ''
                        }`}
                      >
                        <span className="flex items-baseline gap-1.5">
                          <span aria-hidden="true" className="font-mono text-[10px] text-cyan-300/80">
                            {KIND_GLYPH[event.kind]}
                          </span>
                          <span className="font-mono text-[10px] font-medium text-slate-100">
                            {language === 'tr' ? event.missionTr : event.missionEn}
                          </span>
                          <span className="ml-auto font-mono text-[8px] tabular-nums text-slate-500">
                            {KIND_LABEL[event.kind][language === 'tr' ? 0 : 1]}
                          </span>
                        </span>
                        <span className="mt-0.5 block text-[10px] leading-snug text-slate-300">
                          {language === 'tr' ? event.titleTr : event.titleEn}
                        </span>
                        <span className="mt-0.5 block font-mono text-[8px] text-slate-500">
                          {formatEventDate(event, language)}
                          {site && ` · ${language === 'tr' ? site.nameTr : site.name}`}
                        </span>
                      </button>
                    </li>
                  )
                })}
              </ol>
            </div>
          ))}
        </div>

        <footer className="border-t border-white/[0.07] px-3.5 py-2">
          <p className="text-[9px] leading-relaxed text-slate-400">
            {t(
              'Bir anı seçmek simülasyon saatini o tarihe alır ve hedefi odaklar. Gövde konumları o tarihteki yörünge çözümünden gelir; uzay aracının kendi rotası çizilmez.',
              'Choosing a moment moves the simulation clock to that date and focuses the target. Body positions come from the orbital solution for that date; the spacecraft’s own track is not drawn.',
            )}
          </p>
          <a
            href={NSSDCA_MASTER_CATALOG_URL}
            target="_blank"
            rel="noreferrer"
            className="mt-1 inline-flex font-mono text-[8px] uppercase tracking-[0.14em] text-cyan-400/70 transition-colors duration-500 [transition-timing-function:var(--hud-ease)] hover:text-cyan-200"
          >
            {t('NASA NSSDCA kataloğu', 'NASA NSSDCA catalog')} ↗
          </a>
        </footer>
      </div>
    </section>
  )
}
