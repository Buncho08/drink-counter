# スキーマ変更履歴

## 2026-05-21: 要件に基づく全面的なスキーマ変更

### 変更理由

元のスキーマ（飲み物マスター + 日別カウンター）から、イベントベースのカウンターシステムに変更。

### 主な変更点

#### 削除されたテーブル

- `drinks` - 飲み物マスター（不要）
- `counters` - 日別カウンター記録（不要）
- `records` - 販売履歴（不要）
- `bonus_points` - ボーナスポイント（不要）

#### 新規追加されたテーブル

- `events` - イベント管理
- `counter_data` - イベントごとのカウンター（1 対 1）
- `event_permissions` - イベントの権限管理
- `counter_history` - カウント変更履歴

### 新しいデータ構造

```
profiles (ユーザー)
  ↓ 1:N
events (イベント)
  ↓ 1:1
counter_data (カウンター)
  ↓ 1:N
counter_history (履歴)

events
  ↓ 1:N
event_permissions (権限)
  ↓ N:1
profiles (ユーザー)
```

### 主な機能

1. **イベント管理**

   - 期間指定（start_date, end_date）
   - URL 共有用のスラッグ
   - 主催者の自動 owner 権限付与

2. **権限管理**

   - owner: すべての操作
   - editor: カウント操作とイベント編集
   - viewer: 閲覧のみ
   - 匿名ユーザー: 閲覧のみ

3. **カウント履歴**

   - 誰がいつ何をしたかを記録
   - increment/decrement/set の操作種別
   - トリガーで自動記録

4. **セキュリティ**
   - RLS（Row Level Security）で権限制御
   - 匿名ユーザーは閲覧のみ
   - カウント操作は権限のある認証ユーザーのみ

### 自動化

#### トリガー 1: 新規ユーザー登録

```sql
auth.users に INSERT → profiles に自動作成
```

#### トリガー 2: イベント作成

```sql
events に INSERT
  ↓
├─ event_permissions に owner 権限追加
└─ counter_data を作成（count=0）
```

#### トリガー 3: カウント更新

```sql
counter_data の count 更新
  ↓
counter_history に履歴記録
```

### マイグレーション

既存のデータベースに適用する場合は、既存テーブルを削除してから新しいスキーマを適用してください。

```sql
-- 既存テーブルの削除（必要な場合）
DROP TABLE IF EXISTS public.bonus_points CASCADE;
DROP TABLE IF EXISTS public.records CASCADE;
DROP TABLE IF EXISTS public.counters CASCADE;
DROP TABLE IF EXISTS public.drinks CASCADE;

-- その後、20260516000000_initial_schema.sql を実行
```

### 注意事項

- `profiles.full_name` は NOT NULL に変更（元は NULL 許可）
- イベント作成時に自動的に counter_data も作成されるため、手動作成不要
- カウント履歴は自動記録されるため、手動 INSERT 不要

### 今後の拡張可能性

以下の機能は現在実装されていませんが、将来的に追加可能：

- イベントテンプレート機能
- 複数カウンター対応（1 イベント N カウンター）
- イベントのアーカイブ機能
- カウント目標設定
- 通知機能
- カウント分析・統計
