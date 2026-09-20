/**
 * 応答がないまま待ち続けないための時間切れ。ブラウザ機能に依存しない。
 *
 * 位置情報は、許可を求める表示が出たまま答えがない時などに、ブラウザ標準のタイムアウトが働かず、
 * 結果がいつまでも返ってこないことがある（iPhone の Chrome など）。そのため、こちらでも時間を区切る。
 */
export function raceTimeout<T>(promise: Promise<T>, ms: number, makeError: () => unknown): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(makeError()), ms)
    promise.then(
      (value) => {
        clearTimeout(timer)
        resolve(value)
      },
      (error) => {
        clearTimeout(timer)
        reject(error)
      },
    )
  })
}
