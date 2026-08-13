import type { SkyEvent } from './sky-events.ts'

export function eventDayKey(event: SkyEvent): string {
  return event.startsAt.slice(0, 10)
}
