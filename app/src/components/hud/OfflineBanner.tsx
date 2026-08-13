import { useOnlineStatus } from '@/hooks/useOnlineStatus'
import { pickLanguage, type UiLanguage } from '@/lib/ui-language'

interface OfflineBannerProps {
  language: UiLanguage
}

export default function OfflineBanner({ language }: OfflineBannerProps) {
  const isOnline = useOnlineStatus()
  if (isOnline) return null

  return (
    <div
      role="status"
      className="fixed left-0 right-0 top-0 z-50 flex items-center justify-center gap-2 bg-amber-900/90 px-3 py-1.5 text-center text-xs font-medium text-amber-100 backdrop-blur"
    >
      {pickLanguage(
        language,
        'Çevrimdışı — uygulama kabuğu ve daha önce alınmış veriler gösteriliyor.',
        'Offline — showing the app shell and previously retrieved data.',
      )}
    </div>
  )
}
