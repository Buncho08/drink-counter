# Supabase セットアップ手順

このドキュメントでは、Supabase プロジェクトのセットアップ手順を説明します。

## 1. Supabase プロジェクトの作成

1. [Supabase](https://app.supabase.com/)にアクセスしてログイン
2. 「New Project」をクリック
3. プロジェクト情報を入力：
   - **Name**: drink-counter（または任意の名前）
   - **Database Password**: 安全なパスワードを設定（後で使用）
   - **Region**: 最寄りのリージョンを選択（例: Tokyo, Northeast Asia (Seoul)）
   - **Pricing Plan**: Free（個人開発の場合）
4. 「Create new project」をクリック

プロジェクトの作成には数分かかります。

## 2. API 認証情報の取得

プロジェクトが作成されたら：

1. 左サイドバーの「Settings」→「API」をクリック
2. 以下の情報をコピー：
   - **Project URL**: `https://xxxxx.supabase.co` の形式
   - **anon public** キー: 長い文字列

## 3. 環境変数の設定

プロジェクトルートの `.env` ファイルを編集：

```bash
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SESSION_SECRET=Q3dk4nxeuPSD6rnpSWu6hnOKl1J66THa0wMKd7m376A=
NODE_ENV=development
```

## 4. データベーススキーマの適用

### 方法 1: Supabase SQL Editor（推奨）

1. Supabase ダッシュボードで「SQL Editor」をクリック
2. 「New Query」をクリック
3. `supabase/migrations/20260516000000_initial_schema.sql` の内容をコピー&ペースト
4. 「Run」をクリックして実行

### 方法 2: Supabase CLI（ローカル開発の場合）

```bash
# Supabase CLIのインストール
npm install -g supabase

# ローカル環境の起動
supabase start

# マイグレーションの適用
supabase db push
```

## 5. シードデータの投入（オプション）

テスト用のデータを投入する場合：

1. SQL Editor で新しいクエリを作成
2. `supabase/seed.sql` の内容をコピー&ペースト
3. 「Run」をクリック

## 6. Row Level Security (RLS) の確認

データベースセキュリティの確認：

1. 「Database」→「Tables」に移動
2. 各テーブル（profiles, drinks, counters, records, bonus_points）を選択
3. 「RLS enabled」が ✅ になっていることを確認
4. 「Policies」タブでポリシーが設定されていることを確認

## 7. 認証設定（オプション）

### メール認証の設定

1. 「Authentication」→「Settings」に移動
2. 「Enable Email Confirmations」を設定（本番環境では有効化推奨）
3. 開発環境では「Disable email confirmations」でも可

### OAuth 設定（将来的に追加する場合）

- Google
- GitHub
- など

## 8. 型定義の生成

データベーススキーマから TypeScript の型を生成：

```bash
# プロジェクトIDを取得（ダッシュボードの Settings > General）
npx supabase gen types typescript --project-id your-project-id > app/types/database.types.ts
```

※ 基本的な型定義はすでに `app/types/database.types.ts` に含まれています

## 9. 動作確認

### テストユーザーの作成

1. 「Authentication」→「Users」に移動
2. 「Add user」→「Create new user」をクリック
3. テストユーザーを作成：
   - Email: `test@example.com`
   - Password: `password123`
4. 「Create user」をクリック

### アプリケーションでログイン

1. 開発サーバーを起動：`npm run dev`
2. http://localhost:5173/login にアクセス
3. 作成したテストユーザーでログイン
4. `/counter` ページにリダイレクトされることを確認

## トラブルシューティング

### 接続エラー

- `.env` の `SUPABASE_URL` と `SUPABASE_ANON_KEY` が正しいか確認
- ファイアウォールや VPN が接続をブロックしていないか確認

### RLS エラー

- テーブルの RLS ポリシーが正しく設定されているか確認
- ユーザーが認証されているか確認

### マイグレーションエラー

- SQL 構文エラーがないか確認
- 既存のテーブルと競合していないか確認
- エラーメッセージを確認して対処

## 参考リンク

- [Supabase ドキュメント](https://supabase.com/docs)
- [Supabase CLI リファレンス](https://supabase.com/docs/reference/cli)
- [Row Level Security ガイド](https://supabase.com/docs/guides/auth/row-level-security)
