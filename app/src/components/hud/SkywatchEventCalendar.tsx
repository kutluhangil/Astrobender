import type { SkyEvent, SkyEventKind } from '@/lib/sky-events'
import { eventDayKey } from '@/lib/skywatch-calendar'
import type { UiLanguage } from '@/lib/ui-language'

interface SkywatchEventCalendarProps {
  events: SkyEvent[]
  month: string
  selectedDay: string | null
  language: UiLanguage
  onSelectDay: (day: string) => void
}

const EVENT_DOT: Record<SkyEventKind, string> = {
  'solar-eclipse': 'bg-amber-200',
  'lunar-eclipse': 'bg-violet-200',
  'meteor-shower': 'bg-slate-100',
  'maximum-elongation': 'bg-cyan-200',
  conjunction: 'bg-cyan-300',
  opposition: 'bg-sky-200',
}

function calendarCells(month: string): Array<string | null> {
  const [year, monthNumber] = month.split('-').map(Number)
  const firstDay = new Date(Date.UTC(year, monthNumber - 1, 1))
  const mondayOffset = (firstDay.getUTCDay() + 6) % 7
  const daysInMonth = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate()
  const totalCells = Math.ceil((mondayOffset + daysInMonth) / 7) * 7

  return Array.from({ length: totalCells }, (_, index) => {
    const day = index - mondayOffset + 1
    return day >= 1 && day <= daysInMonth
      ? `${month}-${String(day).padStart(2, '0')}`
      : null
  })
}

function weekdayLabels(language: UiLanguage): string[] {
  const formatter = new Intl.DateTimeFormat(language === 'tr' ? 'tr-TR' : 'en-US', {
    weekday: 'narrow',
    timeZone: 'UTC',
  })
  return Array.from({ length: 7 }, (_, index) => formatter.format(new Date(Date.UTC(2024, 0, index + 1))))
}

function formatDay(day: string, language: UiLanguage): string {
  return new Intl.DateTimeFormat(language === 'tr' ? 'tr-TR' : 'en-US', {
    day: 'numeric',
    month: 'long',
    timeZone: 'UTC',
  }).format(new Date(`${day}T12:00:00Z`))
}

export default function SkywatchEventCalendar({
  events,
  month,
  selectedDay,
  language,
  onSelectDay,
}: SkywatchEventCalendarProps) {
  const eventsByDay = new Map<string, SkyEvent[]>()
  for (const event of events) {
    const day = eventDayKey(event)
    const dayEvents = eventsByDay.get(day) ?? []
    dayEvents.push(event)
    eventsByDay.set(day, dayEvents)
  }

  return (
    <section className="border-t border-white/10 px-3.5 py-3" role="group" aria-label={language === 'tr' ? 'Olay takvimi' : 'Event calendar'}>
      <div className="grid grid-cols-7 gap-1 text-center font-mono text-[8px] uppercase tracking-[0.08em] text-slate-500">
        {weekdayLabels(language).map((weekday, index) => <span key={`${weekday}-${index}`}>{weekday}</span>)}
      </div>
      <div className="mt-1.5 grid grid-cols-7 gap-1">
        {calendarCells(month).map((day, index) => {
          if (!day) return <span key={`empty-${index}`} aria-hidden="true" className="h-8" />

          const dayEvents = eventsByDay.get(day) ?? []
          const isSelected = selectedDay === day
          if (dayEvents.length === 0) {
            return <span key={day} aria-hidden="true" className="flex h-8 items-center justify-center font-mono text-[9px] text-slate-600">{Number(day.slice(-2))}</span>
          }

          const label = `${formatDay(day, language)} · ${dayEvents.map((event) => event.title).join(', ')}`
          return (
            <button
              key={day}
              type="button"
              onClick={() => onSelectDay(day)}
              aria-label={label}
              aria-pressed={isSelected}
              className={`relative flex h-8 flex-col items-center justify-center rounded-md border font-mono text-[9px] tabular-nums transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/80 ${
                isSelected
                  ? 'border-cyan-200/70 bg-cyan-300/[0.15] text-cyan-50 shadow-[0_0_14px_rgba(103,232,249,0.18)]'
                  : 'border-white/10 bg-white/[0.025] text-cyan-50 hover:border-cyan-200/45 hover:bg-cyan-300/[0.08]'
              }`}
            >
              <span>{Number(day.slice(-2))}</span>
              <span aria-hidden="true" className="mt-0.5 flex gap-0.5">
                {[...new Set(dayEvents.map((event) => event.kind))].slice(0, 3).map((kind) => (
                  <span key={kind} className={`h-1 w-1 rounded-full ${EVENT_DOT[kind]}`} />
                ))}
              </span>
            </button>
          )
        })}
      </div>
    </section>
  )
}
