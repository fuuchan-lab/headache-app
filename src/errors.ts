/** エラーを、原因の切り分けに使える短い文字列にする（画面に「詳細」として出す用） */
export function describeError(e: unknown): string {
  if (typeof e === 'object' && e !== null && 'code' in e && 'message' in e) {
    // GeolocationPositionError など
    return `${(e as { code: unknown }).code}: ${String((e as { message: unknown }).message)}`
  }
  return e instanceof Error ? `${e.name}: ${e.message}` : String(e)
}
