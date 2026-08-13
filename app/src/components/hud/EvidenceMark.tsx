import { useRef, useState } from 'react'
import {
  EVIDENCE_CLASS_PRESENTATION,
  formatEvidenceFreshness,
  validateEvidenceRecord,
  type EvidenceRecord,
} from '@/lib/scientific-evidence'
import { pickLanguage, type UiLanguage } from '@/lib/ui-language'
import SourceDisclosureDialog from './SourceDisclosureDialog'

interface EvidenceMarkProps {
  evidence: EvidenceRecord
  language: UiLanguage
  contextLabel?: string
}

export default function EvidenceMark({
  evidence,
  language,
  contextLabel,
}: EvidenceMarkProps) {
  validateEvidenceRecord(evidence)
  const [open, setOpen] = useState(false)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const presentation = EVIDENCE_CLASS_PRESENTATION[evidence.evidenceClass]
  const t = (tr: string, en: string) => pickLanguage(language, tr, en)
  const context = contextLabel ?? t('Değer', 'Value')

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={t(
          `${context} için kaynak kanıtını aç`,
          `Open source evidence for ${context}`,
        )}
        data-evidence-class={evidence.evidenceClass}
        className="evidence-mark"
        style={{ '--evidence-color': presentation.color } as React.CSSProperties}
        onClick={() => setOpen(true)}
      >
        <span className="evidence-mark__symbol" aria-hidden="true">{presentation.symbol}</span>
        <span>{presentation.shortLabel}</span>
        <span aria-hidden="true">·</span>
        <span className="evidence-mark__publisher">{evidence.publisher}</span>
        <span aria-hidden="true">·</span>
        <span>{formatEvidenceFreshness(evidence, language)}</span>
      </button>
      {open && (
        <SourceDisclosureDialog
          evidence={evidence}
          language={language}
          triggerRef={triggerRef}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  )
}
