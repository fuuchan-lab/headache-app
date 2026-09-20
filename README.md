# 頭痛ログ

頭痛の度合い（0〜5）・服薬・現在地の気圧を記録し、気圧の変化と頭痛の関係を確認できる PWA です。
サーバーは使わず、データは端末（IndexedDB）と、ログインした Google アカウントの Google ドライブに保存します。

## 機能

- 頭痛の度合いをスライダーで記録（選択した日時も記録。あとから編集可能）
- 付箋風のメモ欄。メモのある記録はグラフに付箋マークが付き、タップするとポップアップで表示
- 服薬の記録（薬・錠数・メモ・写真）。薬は設定画面で追加・削除
- 最後に薬を飲んでからの経過時間
- 現在地の気圧・天気・気温・湿度と、今後の気圧の変化（↗ ↘ →）。気圧が下がる見込みのときは警告
- アプリを開いた時の気圧を自動で記録
- 気圧・頭痛・服薬（錠剤アイコン）を時間軸で重ねたグラフ
- Google ログインと Google ドライブ同期（記録は月別の JSON、写真は画像ファイルとして専用フォルダーに保存。
  端末間は更新時刻の新しい方を採用し、オフライン中の記録は復帰後に同期）

気圧・天気は [Open-Meteo](https://open-meteo.com/)（API キー不要）から取得します。

## 開発

```
npm install
npm run dev      # 開発サーバー
npm run build    # 本番ビルド (dist/)
npm run lint
npm test         # 同期のマージ処理のテスト
```

`main` に push すると GitHub Actions が自動でビルドし、GitHub Pages に公開します
（https://fuuchan-lab.github.io/headache-app/）。

Google ログインは既定で CapLog と同じ OAuth クライアントを使います。
別のクライアントを使う場合は `.env.example` を `.env.local` にコピーして `VITE_GOOGLE_CLIENT_ID` を設定してください。
Google Cloud Console の「承認済みの JavaScript 生成元」に、アプリを開く URL の origin
（例: `http://localhost:5173`、`https://fuuchan-lab.github.io`）を登録する必要があります。

## 今後の予定

- 薬の設定（一覧）の Google ドライブへの同期
- Excel へのエクスポート
- Play ストア公開（PWA を TWA でアプリ化）
