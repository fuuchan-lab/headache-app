# Play ストア公開の手順と掲載内容（頭痛ログ）

PWA を TWA（Trusted Web Activity）で Android アプリにして、Play ストアに公開するための資料です。
公開する URL は https://headache.doitmyself.net/ 、プライバシーポリシーは https://headache.doitmyself.net/privacy.html です。

## 1. 用意ができているもの

- PWA のマニフェスト（`id`・向き・分類・角丸に切り抜かれても欠けない `maskable` アイコン）
- プライバシーポリシー（日本語・英語。連絡先は GitHub の Issues）
- ストア用の画像（リポジトリの外の `C:\Users\hirai\headache-store-assets\`）
  - アイコン: `public/icon-512.png`（512×512。ストアの「アプリのアイコン」に使う）
  - フィーチャーグラフィック: `feature-graphic-ja.png` / `feature-graphic-en.png`（1024×500）
  - スクリーンショット: `screenshots-ja/` と `screenshots-en/` に各5枚（1080×1920）

## 2. 必要なもの（Play Console）

1. Google Play デベロッパーアカウント（登録料 25 ドル・1回のみ）。本人確認が必要。
2. パッケージ名（アプリの ID）。あとから変えられないので、最初に決める。
   おすすめ: `net.doitmyself.headachelog`
3. ストアに表示される連絡先メールアドレス。Gmail を出したくない場合は、Value-Domain のメール転送で
   `support@doitmyself.net` のような別名を作る。
4. **個人のアカウントの場合**（2023年11月13日以降に作成）: 製品版を公開する前に、
   「クローズドテスト」を一定人数のテスターで一定期間続ける必要がある（2026年時点の目安は **12人以上・14日間**。
   条件は変わることがあるので、Play Console の最新の案内で確認する）。

## 3. アプリ本体（AAB ファイル）の作り方 — PWABuilder

1. https://www.pwabuilder.com を開き、`https://headache.doitmyself.net` を入力して「Start」。
2. 診断が終わったら「Package For Stores」→「Android」。
3. 次のように設定する。
   - Package ID: `net.doitmyself.headachelog`（上で決めたもの）
   - App name: `頭痛ログ` / Launcher name: `頭痛ログ`
   - App version: `1.0.0` / App version code: `1`
   - Signing key: 「Create new」（PWABuilder が鍵を作る）
4. 「Generate」でダウンロードした zip の中身:
   - `*.aab`（Play Console にアップロードするファイル）
   - `signing.keystore` と `signing-key-info.txt`（**署名の鍵とパスワード。絶対に GitHub に載せない。安全な場所にバックアップする**）
   - `assetlinks.json`（次の手順で使う）

## 4. アプリと Web サイトの紐づけ（Digital Asset Links）

これをしないと、アプリの上に URL バーが出てしまう。

1. Play Console にアプリを作り、AAB をアップロードする。
2. 「アプリの完全性（App integrity）」→「アプリ署名」に表示される **SHA-256 証明書フィンガープリント** をコピーする。
   （Play が付け直す署名の鍵。PWABuilder の zip の `assetlinks.json` に入っているのは別の鍵）
3. リポジトリの `public/.well-known/assetlinks.json` を作り、次の形にする（`SHA256...` は実際の値に置き換える。
   複数ある場合は配列に並べる）。

```json
[
  {
    "relation": ["delegate_permission/common.handle_all_urls"],
    "target": {
      "namespace": "android_app",
      "package_name": "net.doitmyself.headachelog",
      "sha256_cert_fingerprints": [
        "AA:BB:...（Play のアプリ署名の SHA-256）",
        "CC:DD:...（PWABuilder の zip の assetlinks.json にある SHA-256）"
      ]
    }
  }
]
```

4. `main` に push して公開し、`https://headache.doitmyself.net/.well-known/assetlinks.json` が開けることを確認する。

## 5. Play Console で入力する内容

### ストアの掲載情報

- カテゴリ: 「健康／フィットネス」（医療機器と誤解されないよう、「医療」は選ばない）
- プライバシーポリシーの URL: `https://headache.doitmyself.net/privacy.html`
- 広告: なし / アプリ内課金: なし
- ターゲット年齢: 18歳以上
- アプリへのアクセス: ログインなしで使える（Google ログインは任意で、データを Google ドライブに保存するためのもの）

#### 日本語

- アプリ名（30文字まで）: `頭痛ログ`
- 簡単な説明（80文字まで）: `気圧の変化と頭痛・服薬を、ひとつのグラフで記録・確認できる記録帳です。`
- 詳しい説明（4000文字まで）:

```
「頭痛ログ」は、頭痛の度合い・服薬・その場所の気圧を記録して、気圧の変化と頭痛の関係を振り返れる記録帳です。

■ 気圧・頭痛・服薬を、ひとつのグラフに
・気圧の線、頭痛の度合い（0〜5）、飲んだ薬（錠剤アイコン）、メモ（付箋）を、時間軸で重ねて表示
・「全体」「6時間」「1日」「3日」「7日」「30日」の切り替え、ピンチでの拡大・縮小、ドラッグでの移動
・丸や錠剤アイコン、付箋をタップすると、その記録の詳細（メモ・写真）を表示

■ いまの気圧がすぐわかる
・現在地の気圧・天気・気温・湿度を表示（直前6時間〜今後12時間の推移つき）
・気圧が下がる見込みのときは、お知らせとセルフケアのヒントを表示
・アプリを開くたびに、その場所の気圧を自動で記録

■ かんたんに記録
・頭痛の度合いをスライダーで選ぶだけ。日時はあとから編集できます
・服薬は、薬・錠数（0.5錠から）・メモ・写真を記録
・最後に薬を飲んでからの時間と、服薬間隔を決めた薬は「次に飲めるまで」の残り時間を表示
・薬の名前・色・服薬間隔・並び順は、設定で自由に変更

■ データはあなたの Google ドライブに
・Google アカウントでログインすると、記録が自分の Google ドライブの専用フォルダー（Headache_Log）に保存され、複数の端末で同期
・運営者のサーバーはなく、記録が運営者に送られることはありません
・記録は Excel ファイルに書き出して、Google ドライブに保存できます

■ 電波がなくても記録できる
・オフラインでも記録でき、ネットにつながると自動で同期します

■ そのほか
・日本語 / English に対応
・ライト / ダークの配色を、端末の設定に合わせて自動で切り替え（設定で固定も可能）

※ 本アプリは記録の整理と閲覧のための道具です。医療上の診断や治療の助言を行うものではありません。症状が続く場合や心配なときは、医師や薬剤師にご相談ください。
```

#### English

- App name: `Headache Log`
- Short description (80 chars max): `Track headaches, medication and air pressure together in one chart.`
- Full description (4000 chars max):

```
Headache Log is a simple diary for recording how bad your headache is, what medicine you took, and the air pressure where you are, so you can look back at how pressure changes and headaches line up.

■ Pressure, headaches and medication in one chart
• Air pressure, headache severity (0–5), medication (pill icons) and notes (sticky notes) on a shared timeline
• Switch between All / 6 hours / 1 day / 3 days / 7 days / 30 days; pinch to zoom, drag to move
• Tap a dot, pill or note to see that record's details (note and photo)

■ Know the pressure right now
• Current air pressure, weather, temperature and humidity for your location, with the trend from 6 hours ago to 12 hours ahead
• A heads-up and self-care tips when pressure is expected to drop
• The pressure at your location is recorded automatically each time you open the app

■ Quick to log
• Pick your headache level with a slider; edit the time later if you need to
• Log medication with the medicine, number of tablets (from half a tablet), a note and a photo
• See the time since your last dose, and the time until the next dose is allowed for medicines with a dosing interval
• Rename, recolor, set the interval of, and reorder your medicines in Settings

■ Your data stays in your own Google Drive
• Sign in with Google to save your records to your own Google Drive (a dedicated "Headache_Log" folder) and sync across devices
• There is no developer server, and your records are never sent to the developer
• Export your records to an Excel file saved to your Google Drive

■ Works without a signal
• Log offline; records sync automatically when you are back online

■ More
• Japanese and English
• Light and dark appearance, automatic by default (or choose one in Settings)

Note: This app is a tool for organizing and viewing your own records. It does not provide medical diagnosis or treatment advice. If your symptoms persist or you are concerned, please consult a doctor or pharmacist.
```

### 「データセーフティ」の回答（案。最終判断はご自身で）

このアプリは運営者のサーバーを持たず、記録は端末と、利用者ご自身の Google ドライブにだけ保存する。
Play の定義では、端末の外に出て運営者や第三者が受け取るデータが「収集・共有」にあたる。

| 項目 | 回答（案） | 理由 |
| --- | --- | --- |
| 収集するデータ（運営者が受け取る） | なし | 運営者のサーバーがない |
| 位置情報（正確な位置） | 第三者と共有: あり（アプリの機能のため） | Open-Meteo・OpenStreetMap Nominatim に、気圧と地名の取得のため、丸めた座標（約10m）を送る。位置情報の許可は任意 |
| 健康情報（頭痛・服薬） | 収集・共有しない | 端末と、利用者自身の Google ドライブにだけ保存 |
| 写真 | 収集・共有しない | 同上 |
| 個人情報（名前・プロフィール画像） | 収集・共有しない | 画面に表示するだけ（端末の外に送らない） |
| 通信の暗号化 | はい | すべて HTTPS |
| データの削除リクエスト | 運営者はデータを保持していない（利用者が Google ドライブのフォルダーとアプリ内の削除で消せる） | |

### そのほかの申告

- **健康アプリの申告（Health apps declaration）**: 頭痛・服薬・症状の記録アプリとして、健康関連の機能があることを申告する。
  医療機器・診断・治療の機能はない。
- **コンテンツのレーティング**: 質問票に正直に回答（暴力・性的表現・ギャンブル等はいずれもなし）。
- **ニュースアプリ／政府系アプリ／金融機能**: いずれもなし。

## 6. 公開前に必ず確認すること

- **実機でのログイン確認**: TWA のアプリ内で Google ログインが動くか。ログイン画面はポップアップで開く方式なので、
  実機（Android）で必ず確認する。動かない場合は、ログインの方式を見直す必要がある（その場合は相談してください）。
- **位置情報**: アプリ内で位置情報の許可を求める画面が出て、許可すると気圧が取れるか。
- **オフライン**: 機内モードで開き、記録できて、復帰後に同期されるか。
- **アプリ内に URL バーが出ない**こと（assetlinks が正しいと出ない）。
