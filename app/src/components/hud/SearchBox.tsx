import { useId, useMemo, useRef, useState } from 'react'
import type { SatInfo } from '@/lib/satellites'
import type { EarthEvent } from '@/lib/earth-observatory'
import type { CloseApproach } from '@/lib/jpl-small-bodies'
import type { SkyEvent } from '@/lib/sky-events'
import {
  searchObservatory,
  type UnifiedSearchResult,
} from '@/lib/unified-search'
import { pickLanguage, type UiLanguage } from '@/lib/ui-language'

interface SearchBoxProps {
  sats: SatInfo[]
  earthEvents: EarthEvent[]
  closeApproaches: CloseApproach[]
  skyEvents: SkyEvent[]
  language: UiLanguage
  onSelectResult: (result: UnifiedSearchResult) => void
}

const RESULT_ICONS: Record<UnifiedSearchResult['kind'], string> = {
  satellite: '◉',
  body: '🪐',
  'surface-site': '⌖',
  'earth-event': '◆',
  'small-body': '☄',
  'close-approach': '↝',
  mission: '🚀',
  constellation: '✦',
  'sky-event': '🌠',
}

export default function SearchBox({
  sats,
  earthEvents,
  closeApproaches,
  skyEvents,
  language,
  onSelectResult,
}: SearchBoxProps) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const resultsId = useId()

  const results = useMemo(
    () => searchObservatory(query, {
      satellites: sats,
      earthEvents,
      closeApproaches,
      skyEvents,
    }, language),
    [closeApproaches, earthEvents, language, query, sats, skyEvents],
  )
  const visibleActiveIndex = Math.min(activeIndex, Math.max(0, results.length - 1))

  const choose = (result: UnifiedSearchResult) => {
    onSelectResult(result)
    setQuery('')
    setOpen(false)
    inputRef.current?.blur()
  }

  return (
    <div data-hud-surface className="pointer-events-auto relative">
      <svg
        viewBox="0 0 16 16"
        className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 stroke-slate-500"
        fill="none"
        strokeWidth="1.6"
      >
        <circle cx="7" cy="7" r="5" />
        <path d="M11 11l3.5 3.5" />
      </svg>
      <input
        ref={inputRef}
        value={query}
        onChange={(e) => {
          setQuery(e.target.value)
          setOpen(true)
          setActiveIndex(0)
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && results.length > 0) choose(results[visibleActiveIndex])
          if (e.key === 'ArrowDown' && results.length > 0) {
            e.preventDefault()
            setActiveIndex((index) => (index + 1) % results.length)
          }
          if (e.key === 'ArrowUp' && results.length > 0) {
            e.preventDefault()
            setActiveIndex((index) => (index - 1 + results.length) % results.length)
          }
          if (e.key === 'Escape') {
            if (query) setQuery('')
            else inputRef.current?.blur()
            setOpen(false)
          }
        }}
        placeholder={pickLanguage(
          language,
          'Uydu, gezegen, görev, konum veya NORAD ara…',
          'Search satellites, worlds, missions, sites or NORAD…',
        )}
        aria-label={pickLanguage(language, 'Gözlemevinde ara', 'Search the observatory')}
        aria-expanded={open && results.length > 0}
        aria-controls={resultsId}
        aria-activedescendant={open && results.length > 0 ? `${resultsId}-${visibleActiveIndex}` : undefined}
        className="w-full rounded-xl border border-white/10 bg-[#0a0e14]/70 py-2.5 pl-9 pr-3 font-mono text-xs text-slate-200 placeholder-slate-500 outline-none backdrop-blur-xl focus:border-sky-400/40"
      />
      {open && results.length > 0 && (
        <div
          id={resultsId}
          role="listbox"
          aria-label={pickLanguage(language, 'Arama sonuçları', 'Search results')}
          className="absolute left-0 right-0 top-full z-30 mt-1.5 max-h-[360px] overflow-y-auto rounded-xl border border-white/10 bg-[#0b0f16]/95 backdrop-blur-xl"
        >
          {results.map((result, index) => (
            <button
              key={result.id}
              id={`${resultsId}-${index}`}
              role="option"
              aria-selected={index === visibleActiveIndex}
              onClick={() => choose(result)}
              onMouseEnter={() => setActiveIndex(index)}
              className={`flex min-h-[42px] w-full items-center gap-2.5 px-3 py-1.5 text-left focus:outline-none ${
                index === visibleActiveIndex ? 'bg-sky-400/10' : 'hover:bg-sky-400/10'
              }`}
            >
              <span className="w-4 shrink-0 text-center text-[11px] text-cyan-300">
                {RESULT_ICONS[result.kind]}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-mono text-[11px] text-slate-200">
                  {result.title}
                </span>
                <span className="block truncate font-mono text-[8px] uppercase tracking-[0.1em] text-slate-500">
                  {result.subtitle}
                </span>
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
