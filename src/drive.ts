/**
 * Googleログイン（Google Identity Services のトークン方式）と Google ドライブ操作。
 * CapLog と同じ方式: ログイン状態とアクセストークンを localStorage に保存し、
 * 再訪問時は有効なトークンを再利用、期限切れなら無言で再取得を試みる。
 */

export const driveConfig = {
  folderName: '頭痛と気圧の記録',
  // 公開されるクライアントID（秘密ではない）。CapLog と同じ OAuth クライアントを使う。
  // 別のクライアントを使う場合は .env.local の VITE_GOOGLE_CLIENT_ID で上書きする。
  clientId:
    (import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined) ||
    '62584118958-jp6hctllnodp26q1o686eemhi37gttnc.apps.googleusercontent.com',
  scope: 'https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/userinfo.profile',
}

const TOKEN_KEY = 'headache-drive-token'
const SESSION_KEY = 'headache-drive-session'

let accessToken: string | null = null

export function isDriveConfigured(): boolean {
  return driveConfig.clientId.trim() !== '' && driveConfig.clientId.trim() !== 'YOUR_GOOGLE_CLIENT_ID'
}

export function hasSession(): boolean {
  try {
    return localStorage.getItem(SESSION_KEY) === '1'
  } catch {
    return false
  }
}

export function setSession(active: boolean) {
  try {
    if (active) localStorage.setItem(SESSION_KEY, '1')
    else localStorage.removeItem(SESSION_KEY)
  } catch {
    // 保存できなくても、その回のログインは有効
  }
}

function storeToken(token: string, expiresInSeconds: string | number) {
  const ms = Number(expiresInSeconds) > 0 ? Number(expiresInSeconds) * 1000 : 55 * 60_000
  try {
    localStorage.setItem(TOKEN_KEY, JSON.stringify({ accessToken: token, expiresAt: Date.now() + ms }))
  } catch {
    // トークンはメモリ上でも使える
  }
}

/** 前回保存した有効なトークンがあればメモリに戻して true を返す */
export function restoreStoredToken(): boolean {
  try {
    const raw = localStorage.getItem(TOKEN_KEY)
    if (!raw) return false
    const parsed = JSON.parse(raw) as { accessToken?: string; expiresAt?: number }
    if (!parsed.accessToken || !Number.isFinite(parsed.expiresAt)) return false
    if ((parsed.expiresAt as number) <= Date.now() + 30_000) return false
    accessToken = parsed.accessToken
    return true
  } catch {
    return false
  }
}

export function clearToken() {
  accessToken = null
  try {
    localStorage.removeItem(TOKEN_KEY)
  } catch {
    // 無視
  }
}

function waitForGis(timeoutMs = 5000): Promise<void> {
  return new Promise((resolve, reject) => {
    const start = Date.now()
    const tick = () => {
      if (typeof google !== 'undefined' && google.accounts?.oauth2) resolve()
      else if (Date.now() - start > timeoutMs) reject(new Error('google-identity-not-loaded'))
      else setTimeout(tick, 100)
    }
    tick()
  })
}

/**
 * アクセストークンを取得する。
 * 初回（トークンなし）は consent、以降は無言の再取得 ('')。アカウント切替は select_account。
 */
export async function getAccessToken(interactive = true, promptOverride: string | null = null): Promise<string> {
  await waitForGis()
  return new Promise((resolve, reject) => {
    const client = google.accounts.oauth2.initTokenClient({
      client_id: driveConfig.clientId,
      scope: driveConfig.scope,
      callback: (res) => {
        if (res.error) {
          reject(new Error(res.error))
          return
        }
        accessToken = res.access_token
        storeToken(res.access_token, res.expires_in)
        resolve(res.access_token)
      },
      // ログイン画面を閉じた場合など。これがないと処理が終わらず「接続中」のままになる
      error_callback: (err) => reject(new Error(err.type)),
    })
    client.requestAccessToken({ prompt: promptOverride ?? (interactive && !accessToken ? 'consent' : '') })
  })
}

export async function driveFetch(url: string, init: RequestInit = {}, allowRetry = true): Promise<Response> {
  const res = await fetch(url, {
    ...init,
    headers: { ...(init.headers ?? {}), Authorization: `Bearer ${accessToken}` },
  })
  if (res.status === 401 && allowRetry) {
    await getAccessToken(false)
    return driveFetch(url, init, false)
  }
  if (!res.ok) throw new Error(`drive-request-failed-${res.status}`)
  return res
}

/** アプリ用フォルダーを探し、なければ作って ID を返す */
export async function ensureFolder(): Promise<string> {
  const q = encodeURIComponent(
    `name='${driveConfig.folderName}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
  )
  const list = await driveFetch(`https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,name)&spaces=drive`)
  const { files } = (await list.json()) as { files?: { id: string }[] }
  if (files && files.length > 0) return files[0].id

  const created = await driveFetch('https://www.googleapis.com/drive/v3/files?fields=id', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: driveConfig.folderName, mimeType: 'application/vnd.google-apps.folder' }),
  })
  return ((await created.json()) as { id: string }).id
}

export interface UserInfo {
  email: string | null
  name: string | null
  picture: string | null
}

export async function fetchUserInfo(): Promise<UserInfo> {
  try {
    const res = await driveFetch('https://www.googleapis.com/oauth2/v2/userinfo')
    const data = (await res.json()) as { email?: string; name?: string; picture?: string }
    return { email: data.email ?? null, name: data.name ?? null, picture: data.picture ?? null }
  } catch {
    return { email: null, name: null, picture: null }
  }
}

/** トークンを失効させ、保存済みのログイン状態を消す */
export function signOutDrive() {
  const token = accessToken
  setSession(false)
  clearToken()
  if (token && typeof google !== 'undefined' && google.accounts?.oauth2) {
    google.accounts.oauth2.revoke(token, () => {})
  }
}
