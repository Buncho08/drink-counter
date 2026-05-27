# drink-counter Remix移行計画書

**作成日**: 2026-05-16  
**プロジェクト**: drink-counter (カウンターアプリケーション)

---

## 📋 移行の背景と目的

### 現在の課題

- 保守性の低下（コードが複雑化）
- アーキテクチャの不明瞭さ

### 移行の目標

- **開発速度・生産性**: シンプルな構造で開発しやすく
- **保守性**: コードの整理と理解しやすい構造
- **コスト削減**: 個人開発に最適化
- **セキュリティ**: バックエンドロジックをフロントエンドに露出させない

---

## 🎯 技術スタック

### 新しい構成

```
フロントエンド&サーバー: Remix (React Router v7ベース)
UIライブラリ: shadcn/ui + Tailwind CSS 4
バックエンド: Supabase (DB + 認証 + リアルタイム)
デプロイ: Vercel
テスト: Playwright (継続)
```

### 技術選定の理由

#### Remixを選んだ理由

- ✅ Reactの知識をそのまま活用できる
- ✅ Server Loaders/Actionsでバックエンドロジックを完全に隠蔽
- ✅ Next.jsよりシンプルで学習コストが低い
- ✅ Vercelへのデプロイが容易
- ✅ 小規模プロジェクトに最適

#### Supabaseを継続する理由

- ✅ 既存のデータベース構造を再利用
- ✅ 認証機能が充実
- ✅ リアルタイム機能（WebSocket）のサポート
- ✅ コスト効率が良い（個人開発向け無料枠）
- ✅ RLS（Row Level Security）でセキュリティ確保

---

## 🏗️ アーキテクチャ設計

### ディレクトリ構造（Remix）

```
drink-counter/
├── app/
│   ├── routes/                  # ルーティング（ファイルベース）
│   │   ├── _index.tsx          # / (トップページ)
│   │   ├── login.tsx           # /login (ログイン)
│   │   ├── _auth.tsx           # 認証レイアウト
│   │   ├── _auth.counter.tsx   # /counter (カウンター)
│   │   ├── _auth.monitor.tsx   # /monitor (モニター)
│   │   ├── _auth.settings.tsx  # /settings (設定)
│   │   ├── _auth.bonus.tsx     # /bonus (ボーナス)
│   │   └── _auth.top.tsx       # /top (ランキング)
│   ├── components/             # UIコンポーネント
│   │   ├── ui/                 # shadcn/uiコンポーネント
│   │   └── ...                 # カスタムコンポーネント
│   ├── lib/                    # ユーティリティ
│   │   ├── supabase.server.ts  # Supabaseサーバークライアント
│   │   ├── supabase.client.ts  # Supabaseブラウザクライアント
│   │   ├── session.server.ts   # セッション管理
│   │   └── utils.ts            # 汎用ユーティリティ
│   ├── hooks/                  # カスタムフック
│   │   ├── useSupabaseRealtime.ts  # リアルタイム購読
│   │   └── useCounter.ts       # カウンター操作
│   ├── types/                  # 型定義
│   ├── root.tsx                # ルートコンポーネント
│   └── entry.client.tsx        # クライアントエントリー
├── public/                     # 静的ファイル
├── supabase/                   # Supabase設定（既存を再利用）
├── tests/                      # テスト
├── package.json
└── remix.config.js
```

### データフロー

```
┌─────────────┐
│  Browser    │
│  (Client)   │
└──────┬──────┘
       │
       │ 1. リクエスト
       ▼
┌─────────────────────────────┐
│   Remix Server              │
│                             │
│  ┌─────────────────────┐   │
│  │  Loader/Action      │   │ 2. 認証チェック
│  │  (Server-side)      │───┼────────────┐
│  └─────────────────────┘   │            │
│                             │            ▼
│  - バックエンドロジック     │    ┌──────────────┐
│  - データ検証               │    │   Supabase   │
│  - セキュリティチェック     │    │   (Server)   │
│                             │    │              │
└─────────────┬───────────────┘    │  - Postgres  │
              │                    │  - Auth      │
              │ 3. レスポンス       │  - Realtime  │
              ▼                    └──────┬───────┘
       ┌──────────────┐                  │
       │  Component   │                  │ 4. WebSocket
       │  (Client)    │◄─────────────────┘   (リアルタイム)
       └──────────────┘
```

---

## 🔐 認証の実装方針

### Supabase + Remix Session統合

#### サーバーサイド認証フロー

1. **ログイン（Action）**

   ```typescript
   // app/routes/login.tsx
   export async function action({ request }: ActionFunctionArgs) {
     const formData = await request.formData();
     const email = formData.get("email");
     const password = formData.get("password");

     // Supabaseサーバークライアントで認証
     const supabase = createSupabaseServerClient(request);
     const { data, error } = await supabase.auth.signInWithPassword({
       email,
       password,
     });

     if (error) return json({ error });

     // Remix Sessionにトークンを保存
     return redirect("/counter", {
       headers: {
         "Set-Cookie": await commitSession(session),
       },
     });
   }
   ```

2. **認証チェック（Loader）**

   ```typescript
   // app/routes/_auth.tsx (認証レイアウト)
   export async function loader({ request }: LoaderFunctionArgs) {
     const supabase = createSupabaseServerClient(request);
     const {
       data: { session },
     } = await supabase.auth.getSession();

     if (!session) {
       throw redirect("/login");
     }

     return json({ user: session.user });
   }
   ```

#### クライアントサイド認証状態

- Loaderから返されたユーザー情報を`useLoaderData()`で取得
- リアルタイム機能用にブラウザクライアントも初期化

---

## 🔄 リアルタイム機能の実装

### Supabaseリアルタイムの統合

```typescript
// app/hooks/useSupabaseRealtime.ts
export function useSupabaseRealtime(userId: string) {
  const [counters, setCounters] = useState([]);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();

    // リアルタイムチャンネル購読
    const channel = supabase
      .channel('counters')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'counters',
          filter: `user_id=eq.${userId}`
        },
        (payload) => {
          // データ更新時の処理
          setCounters(prev => /* 更新ロジック */);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  return counters;
}
```

### 注意点

- リアルタイム購読はクライアントサイドのみ
- WebSocket接続なのでサーバーサイドでは利用不可
- コンポーネントのマウント/アンマウント時に適切にクリーンアップ

---

## 📝 段階的移行計画

### Phase 1: プロジェクトセットアップ ⏱️ 2-3時間

#### タスク

1. ✅ Remixプロジェクトの初期化

   ```bash
   npx create-react-router@latest drink-counter --template vercel/vercel/examples/remix
   ```

2. ✅ 必要なパッケージのインストール

   ```bash
   npm install @supabase/supabase-js
   npm install -D tailwindcss @tailwindcss/vite
   npm install class-variance-authority clsx tailwind-merge
   npm install lucide-react
   ```

3. ✅ Tailwind CSS + shadcn/ui セットアップ

   ```bash
   npx shadcn@latest init
   ```

4. ✅ 環境変数の設定

   ```
   SUPABASE_URL=***
   SUPABASE_ANON_KEY=***
   SESSION_SECRET=***  # 新規生成
   ```

5. ✅ 基本的なディレクトリ構造の作成

#### 成果物

- 動作する最小限のRemixアプリ
- Tailwind CSS動作確認
- Supabase接続テスト

---

### Phase 2: 認証機能の実装 ⏱️ 4-6時間

#### タスク

1. **Supabaseクライアントの実装**
   - `app/lib/supabase.server.ts` - サーバー用クライアント
   - `app/lib/supabase.client.ts` - ブラウザ用クライアント
   - `app/lib/session.server.ts` - セッション管理

2. **ログインページの実装**
   - `app/routes/login.tsx`
   - メールアドレス・パスワード認証
   - エラーハンドリング
   - shadcn/ui使用

3. **認証レイアウトの実装**
   - `app/routes/_auth.tsx` - 認証必須のレイアウト
   - Loaderで認証チェック
   - 未認証時はログインページへリダイレクト

4. **ログアウト機能**
   - `app/routes/logout.tsx` - ログアウトAction
   - セッションのクリア

5. **UIコンポーネントの移植**
   - 既存のshadcn/uiコンポーネントをコピー
   - 必要に応じて調整

#### 成果物

- 動作する認証システム
- ログイン/ログアウト機能
- 認証が必要なルートの保護

#### テスト観点

- [ ] ログインできる
- [ ] 未認証時はログインページにリダイレクト
- [ ] ログアウトできる
- [ ] セッションが維持される

---

### Phase 3: カウンター機能の実装 ⏱️ 6-8時間

#### タスク

1. **カウンターページの実装**
   - `app/routes/_auth.counter.tsx`
   - Loaderでカウンターデータ取得
   - Actionでカウンター操作（増減、リセット）

2. **リアルタイム機能の実装**
   - `app/hooks/useSupabaseRealtime.ts`
   - カウンター変更のリアルタイム反映

3. **カウンター操作のAction実装**

4. **UIコンポーネントの移植**
   - 既存のカウンターUIを移植
   - Remix FormでAction呼び出し

#### 成果物

- 動作するカウンター機能
- リアルタイム更新
- バックエンドロジックの隠蔽

#### テスト観点

- [ ] カウンターの増減が動作する
- [ ] リアルタイムで複数端末間で同期される
- [ ] バックエンドロジックがクライアントに露出していない

---

### Phase 4: その他のページの実装 ⏱️ 4-6時間

#### タスク

1. **Mainページ** - `app/routes/_auth._index.tsx`
2. **Monitorページ** - `app/routes/_auth.monitor.tsx`
3. **Settingsページ** - `app/routes/_auth.settings.tsx`
4. **Topページ** - `app/routes/_auth.top.tsx`
5. **Bonusページ** - `app/routes/_auth.bonus.tsx`

各ページで:

- 既存のロジックをLoader/Actionに移植
- UIコンポーネントを移植
- 必要に応じてリアルタイム機能を実装

#### 成果物

- すべてのページが動作
- 既存機能の完全な再現

---

### Phase 5: テスト・最適化 ⏱️ 2-3時間

#### タスク

1. **E2Eテストの更新**
   - Playwrightテストを新しいURLに対応
   - 必要に応じてテストケース追加

2. **パフォーマンス最適化**
   - 不要なリロードの削減
   - Optimistic UIの検討

3. **エラーハンドリングの強化**
   - エラーバウンダリの実装
   - ユーザーフレンドリーなエラーメッセージ

4. **ドキュメント更新**
   - README更新
   - 環境構築手順の記載

#### 成果物

- 安定したアプリケーション
- 更新されたテストスイート
- 最新のドキュメント

---

### Phase 6: デプロイ ⏱️ 1-2時間

#### タスク

1. **Vercelへのデプロイ設定**

   ```bash
   # Vercel CLIでデプロイ
   npx vercel
   ```

2. **環境変数の設定**
   - Vercelダッシュボードで環境変数を設定
   - `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SESSION_SECRET`

3. **動作確認**
   - 本番環境でのテスト
   - パフォーマンス確認

#### 成果物

- 本番稼働中のRemixアプリケーション

---

## ⚠️ 注意点とベストプラクティス

### セキュリティ

1. **環境変数の管理**
   - `SESSION_SECRET`は強力なランダム文字列を使用
   - Supabaseのサービスロールキーは**使用しない**（不要）

2. **RLS（Row Level Security）**
   - Supabaseのテーブルに適切なRLSポリシーを設定
   - 既存のポリシーを確認・更新

3. **CSRF対策**
   - RemixのFormコンポーネントを使用（自動的にCSRF対策）

### パフォーマンス

1. **Loader/Actionの最適化**
   - 必要最小限のデータのみ取得
   - 適切なキャッシュヘッダーの設定

2. **リアルタイム接続の管理**
   - 不要な購読を避ける
   - コンポーネントのアンマウント時に適切にクリーンアップ

### 開発効率

1. **型安全性**
   - SupabaseのCLIで型定義を自動生成

   ```bash
   npx supabase gen types typescript --project-id <project-id> > app/types/database.types.ts
   ```

2. **コード再利用**
   - 共通ロジックはユーティリティ関数化
   - カスタムフックで状態管理ロジックをカプセル化

---

## 📊 移行スケジュール概算

| Phase   | 内容           | 所要時間 | 累計      |
| ------- | -------------- | -------- | --------- |
| Phase 1 | セットアップ   | 2-3時間  | 2-3時間   |
| Phase 2 | 認証機能       | 4-6時間  | 6-9時間   |
| Phase 3 | カウンター機能 | 6-8時間  | 12-17時間 |
| Phase 4 | その他ページ   | 4-6時間  | 16-23時間 |
| Phase 5 | テスト・最適化 | 2-3時間  | 18-26時間 |
| Phase 6 | デプロイ       | 1-2時間  | 19-28時間 |

**総所要時間**: 約20-30時間（個人開発、週末作業で2-3週間程度）

---

## 🔄 ロールバック計画

万が一、移行がうまくいかない場合:

1. **既存プロジェクトは削除しない**
   - 新規プロジェクトとして並行開発
   - 既存環境は稼働し続ける

2. **段階的な切り替え**
   - Phase 3完了時点で基本機能が動作
   - 必要に応じて部分的に本番投入

3. **データベース互換性**
   - 既存のSupabaseデータベースをそのまま使用
   - スキーマ変更は最小限に

---

## 📚 参考資料

- [Remix公式ドキュメント](https://remix.run/docs)
- [Supabase + Remix統合ガイド](https://supabase.com/docs/guides/auth/server-side/remix)
- [shadcn/ui](https://ui.shadcn.com/)
- [Vercel Remix デプロイガイド](https://vercel.com/docs/frameworks/remix)

---

## ✅ チェックリスト

### Phase 1完了基準

- [ ] Remixプロジェクトが起動する
- [ ] Tailwind CSSが動作する
- [ ] Supabaseに接続できる

### Phase 2完了基準

- [ ] ログイン/ログアウトが動作する
- [ ] 認証状態が維持される
- [ ] 未認証時のリダイレクトが動作する

### Phase 3完了基準

- [ ] カウンターの増減が動作する
- [ ] リアルタイム更新が動作する
- [ ] バックエンドロジックが隠蔽されている

### Phase 4完了基準

- [ ] すべてのページが実装されている
- [ ] 既存機能が再現されている

### Phase 5完了基準

- [ ] E2Eテストがパスする
- [ ] エラーハンドリングが適切
- [ ] ドキュメントが更新されている

### Phase 6完了基準

- [ ] Vercelにデプロイされている
- [ ] 本番環境で動作している
- [ ] 既存のSupabaseデータベースと連携している

---

## 🎉 移行完了後の利点

1. **保守性の向上**
   - 明確なディレクトリ構造
   - Server/Clientの分離が明確
   - バックエンドロジックの隠蔽

2. **開発速度の向上**
   - Remixの規約に従った開発
   - Loader/Actionのシンプルなパターン
   - 型安全性の強化

3. **コスト削減**
   - デプロイ先は変わらず（Vercel + Supabase）
   - 既存のSupabaseインフラを再利用

4. **セキュリティの向上**
   - バックエンドロジックがクライアントに露出しない
   - サーバーサイドでの認証チェック

---

## 次のステップ

まずはPhase 1から開始しましょう！

```bash
# Phase 1開始コマンド
npx create-react-router@latest drink-counter --template remix-run/remix/templates/vercel
cd drink-counter
npm install
```
