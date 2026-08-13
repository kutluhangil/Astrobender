import { useEffect, useRef, type RefObject } from 'react'
import { createPortal } from 'react-dom'
import {
  EVIDENCE_CLASS_PRESENTATION,
  type EvidenceRecord,
} from '@/lib/scientific-evidence'
import { pickLanguage, type UiLanguage } from '@/lib/ui-language'

interface SourceDisclosureDialogProps {
  evidence: EvidenceRecord
  language: UiLanguage
  triggerRef: RefObject<HTMLButtonElement | null>
  onClose: () => void
}

function DetailRow({ label, value }: { label: string; value?: string }) {
  if (!value) return null
  return (
    <div className="source-disclosure-row">
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  )
}

export default function SourceDisclosureDialog({
  evidence,
  language,
  triggerRef,
  onClose,
}: SourceDisclosureDialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null)
  const closeRef = useRef<HTMLButtonElement>(null)
  const t = (tr: string, en: string) => pickLanguage(language, tr, en)
  const presentation = EVIDENCE_CLASS_PRESENTATION[evidence.evidenceClass]

  useEffect(() => {
    const returnTarget = triggerRef.current
    closeRef.current?.focus()
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        onClose()
        return
      }
      if (event.key !== 'Tab' || !dialogRef.current) return
      const focusable = [...dialogRef.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]), a[href], input:not([disabled]), [tabindex]:not([tabindex="-1"])',
      )]
      if (focusable.length === 0) return
      const first = focusable[0]
      const last = focusable.at(-1)
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last?.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      returnTarget?.focus()
    }
  }, [onClose, triggerRef])

  return createPortal(
    <div className="source-disclosure-backdrop" onMouseDown={onClose}>
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="source-disclosure-title"
        aria-describedby="source-disclosure-summary"
        data-source-disclosure-sheet
        className="source-disclosure-sheet"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="source-disclosure-header">
          <div>
            <div
              className="source-disclosure-class"
              style={{ color: presentation.color }}
            >
              <span aria-hidden="true">{presentation.symbol}</span>{' '}
              {presentation.label[language]}
            </div>
            <h2 id="source-disclosure-title">
              {t('Kaynak ve yöntem ayrıntıları', 'Source and method details')}
            </h2>
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label={t('Kaynak ayrıntılarını kapat', 'Close source details')}
          >
            ✕
          </button>
        </header>

        <p id="source-disclosure-summary" className="source-disclosure-summary">
          {t(
            'Bu kayıt, ekrandaki değerin nereden geldiğini ve hangi sınırlar içinde okunması gerektiğini gösterir.',
            'This record identifies where the displayed value came from and the limits within which it should be read.',
          )}
        </p>

        <dl className="source-disclosure-grid">
          <DetailRow label={t('Yayıncı', 'Publisher')} value={evidence.publisher} />
          <DetailRow label={t('Alınma zamanı', 'Retrieved at')} value={evidence.retrievedAt} />
          <DetailRow label={t('Doğrulama tarihi', 'Verified at')} value={evidence.verifiedAt} />
          <DetailRow label={t('Yöntem', 'Method')} value={evidence.method} />
          <DetailRow label={t('Epoch / gözlem zamanı', 'Epoch / observation time')} value={evidence.epoch} />
          <DetailRow label={t('Geçerlilik başlangıcı', 'Valid from')} value={evidence.validFrom} />
          <DetailRow label={t('Geçerlilik sonu', 'Valid until')} value={evidence.validUntil} />
          <DetailRow label={t('Belirsizlik', 'Uncertainty')} value={evidence.uncertainty} />
          <DetailRow label={t('Sınırlama', 'Limitation')} value={evidence.limitation} />
        </dl>

        {evidence.sourceUrl ? (
          <a
            href={evidence.sourceUrl}
            target="_blank"
            rel="noreferrer"
            className="source-disclosure-link"
          >
            {t('Doğrudan kaynağı aç', 'Open direct source')} ↗
          </a>
        ) : (
          <p className="source-disclosure-no-source">
            {t(
              'Bu şematik görselin harici bilimsel veri kaynağı yoktur.',
              'This schematic visual has no external scientific data source.',
            )}
          </p>
        )}
      </div>
    </div>
    ,
    document.body,
  )
}
