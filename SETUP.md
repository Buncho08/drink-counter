# drink-counter 開発環境セットアップガイド

## 📋 前提条件

- Node.js 18.x 以上
- npm 10.x 以上
- Supabase アカウント

## 🚀 セットアップ手順

### 1. 依存関係のインストール

```bash
npm install
```

### 2. Supabase プロジェクトの作成

1. [Supabase](https://app.supabase.com/)にアクセス
2. 新しいプロジェクトを作成
3. プロジェクトの設定から以下の情報を取得：
   - Project URL (`SUPABASE_URL`)
   - Anon public key (`SUPABASE_ANON_KEY`)

### 3. 環境変数の設定

`.env` ファイルを編集して、Supabase の情報を設定：

```bash
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_ANON_KEY=your-anon-key-here
SESSION_SECRET=Q3dk4nxeuPSD6rnpSWu6hnOKl1J66THa0wMKd7m376A=
NODE_ENV=development
```

### 4. データベースのマイグレーション

Supabase ダッシュボードの SQL Editor で以下を実行：

1. `supabase/migrations/20260516000000_initial_schema.sql` の内容をコピー
2. SQL Editor に貼り付けて実行
3. （オプション）`supabase/seed.sql` でテストデータを投入

### 5. 型定義の生成（オプション）

```bash
# Supabaseプロジェクトから型定義を生成
npx supabase gen types typescript --project-id <your-project-id> > app/types/database.types.ts
```

※ すでに基本的な型定義は `app/types/database.types.ts` に含まれています

### 6. 開発サーバーの起動

```bash
npm run dev
```

ブラウザで http://localhost:5173 を開く

## 📁 プロジェクト構造

```
drink-counter/
├── app/
│   ├── components/        # UIコンポーネント
│   │   └── ui/           # shadcn/uiコンポーネント
│   ├── lib/              # ユーティリティ・ライブラリ
│   │   ├── supabase.server.ts  # Supabaseサーバークライアント
│   │   ├── supabase.client.ts  # Supabaseブラウザクライアント
│   │   ├── session.server.ts   # セッション管理
│   │   └── utils.ts            # 汎用ユーティリティ
│   ├── routes/           # ルーティング（ファイルベース）
│   │   ├── _index.tsx   # / (トップページ)
│   │   ├── login.tsx    # /login (ログイン)
│   │   └── counter.tsx  # /counter (カウンター)
│   ├── types/           # 型定義
│   │   └── database.types.ts  # Supabase型定義
│   ├── root.tsx         # ルートコンポーネント
│   └── tailwind.css     # Tailwind CSS
├── supabase/            # Supabase設定
│   ├── migrations/      # データベースマイグレーション
│   ├── config.toml      # ローカル開発設定
│   └── seed.sql         # シードデータ
├── public/              # 静的ファイル
├── .env                 # 環境変数（Git除外）
├── package.json
└── vite.config.ts
```

## 🔧 開発コマンド

```bash
# 開発サーバー起動
npm run dev

# プロダクションビルド
npm run build

# 型チェック
npm run typecheck
```

## 🧪 テストアカウントの作成

1. http://localhost:5173/login にアクセス
2. Supabase ダッシュボードの Authentication > Users から手動でユーザーを作成
3. またはサインアップ機能を実装後に使用

## ⚠️ トラブルシューティング

### データベース接続エラー

- `.env` の `SUPABASE_URL` と `SUPABASE_ANON_KEY` が正しいか確認
- Supabase プロジェクトが起動しているか確認

### 型エラー

- `npm run typecheck` で型エラーを確認
- `app/types/database.types.ts` を再生成

### ビルドエラー

- `node_modules` を削除して `npm install` を再実行
- Node.js のバージョンを確認（18.x 以上）

## 📚 参考リンク

- [Remix ドキュメント](https://remix.run/docs)
- [Supabase ドキュメント](https://supabase.com/docs)
- [shadcn/ui ドキュメント](https://ui.shadcn.com/)
- [Tailwind CSS ドキュメント](https://tailwindcss.com/docs)

## 🎯 次のステップ

Phase 1 のセットアップが完了しました。次は `doc/plan.md` の Phase 2 に進んでください：

- 認証機能の完全実装
- ユーザープロフィールページ
- ログアウト機能
