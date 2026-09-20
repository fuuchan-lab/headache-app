/**
 * アプリを開いた時（または画面に戻った時）の気圧の記録を、残すかどうか。
 * 開くたびに、その場所の気圧を残すのが目的。同じ瞬間に2回呼ばれた時（画面の切り替えが重なった時など）
 * の二重記録だけを防ぐため、直前の記録から短い間隔しか空いていない時は残さない。
 */
export const PRESSURE_LOG_MIN_GAP_MS = 10_000

export function shouldLogPressure(lastLoggedAt: number | null, now: number): boolean {
  return lastLoggedAt === null || now - lastLoggedAt >= PRESSURE_LOG_MIN_GAP_MS
}
