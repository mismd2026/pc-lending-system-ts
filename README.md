# PC貸し出し管理（TypeScript版）

社内の貸出用PCを「誰に・いつまで」貸しているかを管理するWebアプリです。
以前 Google Apps Script で作った仕組みを、TypeScript / React で作り直しました。

**デモ**：https://mismd2026.github.io/pc-lending-system-ts/

## 機能

- 機器ごとの貸出状況（貸出可・貸出中・保守中・延滞）の一覧と検索
- 貸し出し・返却の記録（返却予定日を過ぎると延滞として表示）
- 機器の登録（資産番号の重複チェック）
- 貸出履歴の表示と CSV ダウンロード

## 構成

| 項目 | 内容 |
| --- | --- |
| 言語 | TypeScript |
| UI | React 18 |
| ビルド | Vite |
| テスト | Vitest |
| CI/CD | GitHub Actions（型チェック → テスト → ビルド → GitHub Pages 公開） |
| データ保存 | ブラウザの localStorage（デモ用） |

業務ロジック（`src/lending.ts`）は画面から切り離し、二重貸出の防止や延滞判定などを単体テストで確認しています。

## ローカルでの実行

```bash
npm install
npm run dev     # 開発サーバー
npm test        # テスト
npm run build   # 本番ビルド
```

## 今後の拡張

- Google スプレッドシートや Firestore をバックエンドにして複数人で共有
- Google Workspace アカウントによるログイン
- 返却期限前のメール通知

## ライセンス

MIT
