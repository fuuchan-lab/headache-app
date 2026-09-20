/** 位置情報を許可する手順の案内。ブラウザ機能に依存しない */
import type { Lang } from './i18n/context.ts'

export type Platform = 'ios' | 'android' | 'other'

/**
 * 端末の種類を、ブラウザの名乗り(User-Agent)から判定する。
 * ウェブアプリから端末の設定画面を直接開くことはできないので、端末に合わせた手順を案内するために使う。
 */
export function detectPlatform(userAgent: string, maxTouchPoints = 0): Platform {
  if (/iPhone|iPad|iPod/i.test(userAgent)) return 'ios'
  // iPadOS 13 以降は、Mac と同じ名乗りをする。タッチ操作できる Mac は iPad とみなす
  if (/Macintosh/i.test(userAgent) && maxTouchPoints > 1) return 'ios'
  if (/Android/i.test(userAgent)) return 'android'
  return 'other'
}

export const LOCATION_STEPS: Record<Lang, Record<Platform, string[]>> = {
  ja: {
    ios: [
      'iPhoneの「設定」アプリ →「プライバシーとセキュリティ」→「位置情報サービス」をオンにします。',
      '同じ画面の一覧で、使っているブラウザ（Chrome、または「Safari Webサイト」）を開き、「このAppの使用中のみ許可」を選んで、「正確な位置情報」をオンにします。',
      'このページに戻って再読み込みし、位置情報の許可を求める表示が出たら「許可」を選びます。',
      '以前に「許可しない」を選んでいた場合は、ブラウザのサイトの設定（Safariは「設定」→「Safari」→「位置情報」など、Chromeはメニュー →「設定」）で、このサイトを「許可」にします。',
    ],
    android: [
      'Chromeのアドレスバーの左にある鍵アイコン（または設定アイコン）→「権限」→「位置情報」を「許可」にします。',
      '「設定」アプリ →「アプリ」→「Chrome」→「権限」→「位置情報」で、「アプリの使用中のみ許可」を選び、「正確な位置情報を使用」をオンにします。',
      '端末の位置情報（画面上部のクイック設定の「位置情報」）がオンになっているか確認します。',
      'このページに戻って、「もう一度試す」を押します。',
    ],
    other: [
      'アドレスバーの左のアイコン（鍵など）→「サイトの設定」または「権限」→「位置情報」を「許可」にします。',
      'パソコンの位置情報サービスがオフの場合は、OSの設定（Windowsは「設定」→「プライバシーとセキュリティ」→「位置情報」）でオンにします。',
      'このページに戻って、「もう一度試す」を押します。',
    ],
  },
  en: {
    ios: [
      'Open the Settings app → "Privacy & Security" → "Location Services" and turn it on.',
      'In the list on the same screen, open the browser you use (Chrome, or "Safari Websites"), choose "While Using the App", and turn on "Precise Location".',
      'Come back to this page and reload it. When the location permission prompt appears, choose "Allow".',
      'If you chose "Don\'t Allow" earlier, allow this site in the browser\'s site settings (Safari: Settings → Safari → Location, etc.; Chrome: menu → Settings).',
    ],
    android: [
      'In Chrome, tap the lock icon (or settings icon) to the left of the address bar → "Permissions" → set "Location" to "Allow".',
      'Open the Settings app → "Apps" → "Chrome" → "Permissions" → "Location", choose "Allow only while using the app", and turn on "Use precise location".',
      'Check that your device location (the "Location" tile in Quick Settings) is turned on.',
      'Come back to this page and tap "Try again".',
    ],
    other: [
      'Click the icon to the left of the address bar (a lock, etc.) → "Site settings" or "Permissions" → set "Location" to "Allow".',
      'If location services are off on your computer, turn them on in the OS settings (Windows: Settings → Privacy & security → Location).',
      'Come back to this page and click "Try again".',
    ],
  },
}
