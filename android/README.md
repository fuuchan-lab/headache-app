# 頭痛ログ Android（Play Store 用 TWA パッケージ）

LeadLog・CapLog と同じく、Bubblewrap で作る Trusted Web Activity。アプリ本体は https://headache.doitmyself.net/ の PWA で、
サイトを更新すれば、Android アプリも自動で最新になる（Play への再提出は不要）。
掲載文・データセーフティの回答案などは `docs/play-store.md` を参照。

## アプリ側で準備済みのこと

- マニフェスト（`id`・縦向き・分類・`maskable` アイコン）。設定は `vite.config.ts`
- オフライン: 画面・ヘルプ・アイコンはすべて Service Worker が端末に保存。気圧と予報（3日先まで）は最後に取得した分を端末に残し、電波がない時はそれを取得時刻つきで表示する
- アプリ内（TWA）では AdSense を出さない（`src/adsense.ts` の `isAndroidApp`）
- `/.well-known/` は SPA の差し替えから除外済み（`assetlinks.json` を置けばそのまま配信される）

## 署名鍵（アップロード鍵）

作成済み（2026-11-19）。パッケージ名は `net.doitmyself.headachelog`（公開後は変えられない）。

- ファイル: `C:\Users\user\.bubblewrap\keys\headache-upload.keystore`（別名 headache）、パスワードは同じフォルダーの `headache-keystore-password.txt`
- **この2つは Git に入れない。必ず別の場所にもバックアップする**（紛失すると更新を出せなくなる）
- Play アプリ署名を使うので、配布用の本当の署名鍵は Google が管理する。この鍵は「アップロード用」
- SHA-256: EA:CB:11:EC:AA:A7:27:20:16:32:D4:AE:EA:CB:41:10:4A:3C:37:4F:B1:E9:F7:87:05:36:37:6B:D2:43:A4:62

## 作り直し（Windows / PowerShell）

```powershell
$env:JAVA_HOME = "C:\Users\user\.bubblewrap\jdk-17.0.20.1+1"
$env:Path = "$env:JAVA_HOME\bin;C:\Program Files\nodejs;C:\Users\user\headache-app\android;$env:Path"
$pw = (Get-Content C:\Users\user\.bubblewrap\keys\headache-keystore-password.txt -Raw).Trim()
$env:BUBBLEWRAP_KEYSTORE_PASSWORD = $pw; $env:BUBBLEWRAP_KEY_PASSWORD = $pw
cd C:\Users\user\headache-app\android
# 新しい版を出す時は twa-manifest.json の appVersionCode を 1 つ増やす（appVersionName は自由）
C:\Users\user\.bubblewrap\cli\node_modules\.bin\bubblewrap.cmd update --skipVersionUpgrade
C:\Users\user\.bubblewrap\cli\node_modules\.bin\bubblewrap.cmd build --skipPwaValidation      # → app-release-bundle.aab（Play にアップロード） / app-release-signed.apk（実機テスト）
```

## サイトとの紐づけ（Digital Asset Links）

`public/.well-known/assetlinks.json` に、上のアップロード鍵の SHA-256 が入っている（実機に APK を直接入れて試す時に必要）。
Play に上げた後は、Play Console の「アプリの完全性 → アプリの署名」に表示される
**アプリ署名鍵の SHA-256** を、同じ配列に追加して再デプロイする（これが無いとアプリの上にアドレスバーが出てしまう）。

## 実機で確認すること

- Google ログイン（ポップアップ方式）がアプリ内で動くか
- 位置情報の許可を求められ、許可すると気圧が取れるか
- 機内モードで開いて、画面・気圧カード（前回取得分）・記録グラフの予報（点線）が表示され、記録できるか。復帰後に同期されるか
