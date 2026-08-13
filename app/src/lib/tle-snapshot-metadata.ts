/**
 * Oldest acquisition time in the committed five-feed TLE snapshot bundle.
 * It is intentionally fixed: package load must not relabel static data as live.
 */
export const TLE_SNAPSHOT_DOWNLOADED_AT = Date.parse('2026-07-16T11:24:19Z')

export function reduceEarthRefreshUpdatedAt(
  previousUpdatedAt: number | null,
  sourceResults: readonly PromiseSettledResult<unknown>[],
  refreshedAt: number,
): number | null {
  return sourceResults.some(({ status }) => status === 'fulfilled')
    ? refreshedAt
    : previousUpdatedAt
}

export function reduceSmallBodyRefreshFailure<
  TState extends { status: string; error: string | null; updatedAt: number | null },
>(
  current: TState,
  error: string,
): Omit<TState, 'status' | 'error'> & { status: 'error'; error: string } {
  return {
    ...current,
    status: 'error',
    error,
  }
}
