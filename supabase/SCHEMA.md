# データベーススキーマ設計書

## 概要

このデータベースは、イベント単位で飲み物の売上数をカウントするシステムです。  
匿名ユーザーは閲覧のみ可能で、カウント操作は権限を持つ認証ユーザーのみが実行できます。

## テーブル構成

### 1. profiles（ユーザープロフィール）

Supabase Auth を拡張したユーザー情報テーブル。

| カラム名   | 型        | 説明                        |
| ---------- | --------- | --------------------------- |
| id         | UUID      | 主キー、auth.users と紐づく |
| username   | TEXT      | ユーザー名（ユニーク）      |
| full_name  | TEXT      | フルネーム                  |
| created_at | TIMESTAMP | 作成日時                    |
| updated_at | TIMESTAMP | 更新日時                    |

**制約:**

- `id` は `auth.users` への外部キー（CASCADE 削除）
- `username` はユニーク

**RLS:**

- 閲覧: 全員
- 編集: 本人のみ

---

### 2. events（イベント）

カウンターを管理する単位となるイベント。

| カラム名   | 型        | 説明                             |
| ---------- | --------- | -------------------------------- |
| id         | UUID      | 主キー                           |
| name       | TEXT      | イベント名                       |
| slug       | TEXT      | URL 共有用のスラッグ（ユニーク） |
| owner_id   | UUID      | 主催者のユーザー ID              |
| start_date | TIMESTAMP | 開始日時                         |
| end_date   | TIMESTAMP | 終了日時                         |
| created_at | TIMESTAMP | 作成日時                         |
| updated_at | TIMESTAMP | 更新日時                         |

**制約:**

- `owner_id` は `profiles(id)` への外部キー（CASCADE 削除）
- `slug` はユニーク
- `end_date > start_date`（チェック制約）

**RLS:**

- 閲覧: 全員（匿名含む）
- 作成: 認証ユーザー（自分が owner の場合のみ）
- 編集: owner または editor 権限を持つユーザー
- 削除: owner のみ

**トリガー:**

- 新規作成時に自動的に：
  - `event_permissions` に owner 権限を追加
  - `counter_data` を作成（初期値 0）

---

### 3. counter_data（カウンターデータ）

イベントごとのカウント数と背景画像を管理。1 イベント 1 カウンター。

| カラム名             | 型        | 説明                       |
| -------------------- | --------- | -------------------------- |
| id                   | UUID      | 主キー                     |
| event_id             | UUID      | 所属イベント（ユニーク）   |
| count                | INTEGER   | カウント数（≥0）           |
| background_image_url | TEXT      | 背景画像 URL（オプション） |
| created_at           | TIMESTAMP | 作成日時                   |
| updated_at           | TIMESTAMP | 更新日時                   |

**制約:**

- `event_id` は `events(id)` への外部キー（CASCADE 削除）
- `event_id` はユニーク（1 イベント 1 カウンター）
- `count >= 0`（チェック制約）

**RLS:**

- 閲覧: 全員（匿名含む）
- 編集: イベントの owner または editor 権限を持つユーザー

**トリガー:**

- `count` 更新時に自動的に `counter_history` に履歴を記録

---

### 4. event_permissions（イベント権限）

イベントに対するユーザーの権限を管理。

| カラム名   | 型        | 説明                        |
| ---------- | --------- | --------------------------- |
| id         | UUID      | 主キー                      |
| event_id   | UUID      | 対象イベント                |
| user_id    | UUID      | 対象ユーザー                |
| role       | TEXT      | 権限（owner/editor/viewer） |
| created_at | TIMESTAMP | 作成日時                    |

**制約:**

- `event_id` は `events(id)` への外部キー（CASCADE 削除）
- `user_id` は `profiles(id)` への外部キー（CASCADE 削除）
- `(event_id, user_id)` の組み合わせはユニーク
- `role` は 'owner', 'editor', 'viewer' のいずれか

**権限の種類:**

- **owner**: イベント作成者。すべての操作が可能
- **editor**: カウントの増減、イベント情報の編集が可能
- **viewer**: 閲覧のみ可能（匿名ユーザーと同等）

**RLS:**

- 閲覧: 本人 または イベントの owner
- 管理: イベントの owner のみ

---

### 5. counter_history（カウント履歴）

カウント数の変更履歴を記録。

| カラム名        | 型        | 説明                                |
| --------------- | --------- | ----------------------------------- |
| id              | UUID      | 主キー                              |
| counter_data_id | UUID      | 対象カウンター                      |
| user_id         | UUID      | 操作したユーザー（NULL 可）         |
| previous_count  | INTEGER   | 変更前の値                          |
| new_count       | INTEGER   | 変更後の値                          |
| operation       | TEXT      | 操作種別（increment/decrement/set） |
| created_at      | TIMESTAMP | 操作日時                            |

**制約:**

- `counter_data_id` は `counter_data(id)` への外部キー（CASCADE 削除）
- `user_id` は `profiles(id)` への外部キー（SET NULL 削除）
- `operation` は 'increment', 'decrement', 'set' のいずれか

**操作種別:**

- **increment**: カウント増加
- **decrement**: カウント減少
- **set**: 直接値を設定

**RLS:**

- 閲覧: 全員（匿名含む）
- 作成: システム（トリガー経由）

**注意:**

- 自動トリガーで記録されるため、手動 INSERT 不要
- ユーザーが削除されても履歴は残る（user_id は NULL になる）

---

## データフロー

### 1. 新規ユーザー登録

```
auth.users に INSERT
  ↓ (トリガー: on_auth_user_created)
profiles に自動作成
```

### 2. イベント作成

```
events に INSERT (owner_id = 現在のユーザー)
  ↓ (トリガー: on_event_created)
├─ event_permissions に owner 権限を追加
└─ counter_data を作成 (count = 0)
```

### 3. カウント操作

```
counter_data の count を UPDATE
  ↓ (トリガー: on_counter_updated)
counter_history に履歴を記録
  - user_id: 現在のユーザー
  - previous_count: 変更前の値
  - new_count: 変更後の値
  - operation: 自動判定
```

### 4. 権限付与

```
event_permissions に INSERT (role = 'editor' or 'viewer')
  ↓
そのユーザーが閲覧・編集可能に
```

---

## RLS（Row Level Security）まとめ

### 匿名ユーザー（未認証）

- ✅ イベント閲覧
- ✅ カウンター閲覧
- ✅ カウント履歴閲覧
- ❌ すべての編集操作

### 認証ユーザー（権限なし）

- ✅ イベント閲覧
- ✅ カウンター閲覧
- ✅ カウント履歴閲覧
- ✅ 新規イベント作成（自動的に owner になる）
- ❌ 他人のイベント編集

### Viewer 権限

- ✅ イベント閲覧
- ✅ カウンター閲覧
- ✅ カウント履歴閲覧
- ❌ カウント操作

### Editor 権限

- ✅ イベント閲覧
- ✅ イベント編集
- ✅ カウンター閲覧
- ✅ カウント操作（増減・設定）
- ✅ カウント履歴閲覧
- ❌ 権限管理
- ❌ イベント削除

### Owner 権限

- ✅ すべての操作
- ✅ 権限管理（他ユーザーに editor/viewer を付与）
- ✅ イベント削除

---

## インデックス

パフォーマンス最適化のために以下のインデックスを作成：

- `events_owner_id_idx`: イベント主催者での検索
- `events_slug_idx`: スラッグでの検索（URL 共有）
- `counter_data_event_id_idx`: イベント ID でカウンター取得
- `event_permissions_event_id_idx`: イベントの権限リスト取得
- `event_permissions_user_id_idx`: ユーザーの権限リスト取得
- `counter_history_counter_data_id_idx`: カウンター履歴取得
- `counter_history_created_at_idx`: 履歴を時系列で取得

---

## 使用例

### イベント作成

```sql
-- 1. イベントを作成（ログイン済みユーザー）
INSERT INTO events (name, slug, owner_id, start_date, end_date)
VALUES (
  '夏祭り2026',
  'summer-festival-2026',
  'ユーザーのUUID',
  '2026-07-01 18:00:00+00',
  '2026-07-01 23:00:00+00'
);

-- 自動的に以下が作成される:
-- - event_permissions (role='owner')
-- - counter_data (count=0)
```

### 権限付与

```sql
-- Editor権限を付与（ownerのみ実行可能）
INSERT INTO event_permissions (event_id, user_id, role)
VALUES ('イベントのUUID', '付与先ユーザーのUUID', 'editor');
```

### カウント操作

```sql
-- カウントを増やす
UPDATE counter_data
SET count = count + 1
WHERE event_id = 'イベントのUUID';

-- 自動的にhistoryに記録される
```

### 履歴取得

```sql
-- 最新20件の履歴を取得
SELECT
  ch.*,
  p.username,
  p.full_name
FROM counter_history ch
LEFT JOIN profiles p ON ch.user_id = p.id
WHERE ch.counter_data_id = 'カウンターのUUID'
ORDER BY ch.created_at DESC
LIMIT 20;
```

---

## マイグレーション適用方法

### Supabase Dashboard（推奨）

1. Supabase Dashboard → SQL Editor
2. `20260516000000_initial_schema.sql` の内容をコピー&ペースト
3. Run をクリック

### Supabase CLI

```bash
supabase db push
```

---

## 注意事項

1. **slug の重複を避ける**: イベント作成時に既存の slug をチェック
2. **日付の妥当性**: start_date < end_date をアプリ側でも検証
3. **権限の確認**: カウント操作前に権限を確認（RLS が自動処理）
4. **履歴の保持期間**: 必要に応じて古い履歴を定期的に削除
5. **画像 URL**: background_image_url は Supabase Storage または外部 CDN の URL を推奨
