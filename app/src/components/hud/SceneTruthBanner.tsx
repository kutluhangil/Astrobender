import { EVIDENCE_CLASS_PRESENTATION, type EvidenceClass } from '@/lib/scientific-evidence'
import { pickLanguage, type UiLanguage } from '@/lib/ui-language'

interface SceneTruthBannerProps {
  activeClasses: readonly Extract<EvidenceClass, 'schematic' | 'heuristic'>[]
  language: UiLanguage
}

export default function SceneTruthBanner({ activeClasses, language }: SceneTruthBannerProps) {
  if (activeClasses.length === 0) return null
  const classes = [...new Set(activeClasses)]
  const t = (tr: string, en: string) => pickLanguage(language, tr, en)

  return (
    <div
      role="status"
      aria-label={t('Sahne doğruluk bildirimi', 'Scene truth notice')}
      className="scene-truth-banner"
    >
      <div className="scene-truth-banner__classes">
        {classes.map((evidenceClass) => {
          const presentation = EVIDENCE_CLASS_PRESENTATION[evidenceClass]
          return (
            <span key={evidenceClass} style={{ color: presentation.color }}>
              <span aria-hidden="true">{presentation.symbol}</span> {presentation.shortLabel}
            </span>
          )
        })}
      </div>
      {classes.map((evidenceClass) => (
        <p key={evidenceClass}>
          {evidenceClass === 'schematic'
            ? t(
              'Şematik görsel yardım açık; yüzeyler ve sahne geometrisi bilimsel ölçüm değildir.',
              'A schematic visual aid is active; surfaces and scene geometry are not scientific measurements.',
            )
            : t(
              'Ürün sezgisi açık; konum ve gökyüzü girdilerinden türetilen uygunluk skoru bilimsel ölçüm değildir. Bulutluluk ve yerel engeller dahil değildir.',
              'A product heuristic is active; its suitability score is derived from location and sky inputs, not a scientific measurement. Cloud cover and local obstructions are excluded.',
            )}
        </p>
      ))}
    </div>
  )
}
