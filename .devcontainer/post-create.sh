#!/bin/bash

# drink-counter devcontainer post-create script
# このスクリプトはdevcontainer作成後に自動実行されます

set -e

echo "🚀 drink-counter 開発環境をセットアップしています..."

# Node.js & npm version check
echo "📦 Node.js バージョン: $(node --version)"
echo "📦 npm バージョン: $(npm --version)"

# Install Supabase CLI
echo "⚡ Supabase CLI をインストール中..."
npm install -g supabase

# Install Vercel CLI (optional but useful for deployment)
echo "🔺 Vercel CLI をインストール中..."
npm install -g vercel

# Install Playwright browsers
echo "🎭 Playwright ブラウザをインストール中..."
npx playwright install --with-deps chromium

# Install dependencies if package.json exists
if [ -f "package.json" ]; then
  echo "📥 プロジェクトの依存関係をインストール中..."
  npm install
else
  echo "⚠️  package.json が見つかりません。依存関係のインストールをスキップします。"
fi

# Setup .env.example if it doesn't exist
if [ ! -f ".env.example" ]; then
  echo "📝 .env.example テンプレートを作成中..."
  cat > .env.example <<EOL
# Supabase Configuration
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_ANON_KEY=your-anon-key-here

# Session Secret (generate with: openssl rand -base64 32)
SESSION_SECRET=your-session-secret-here

# Development
NODE_ENV=development
EOL
fi

# Create .env from .env.example if .env doesn't exist
if [ ! -f ".env" ] && [ -f ".env.example" ]; then
  echo "📝 テンプレートから .env を作成中..."
  cp .env.example .env
  echo "⚠️  .env に実際の Supabase 認証情報を設定してください！"
fi

# Setup git hooks (if husky is configured)
if [ -d ".husky" ]; then
  echo "🪝 Git フックをセットアップ中..."
  npx husky install
fi

echo ""
echo "✅ 開発環境のセットアップが完了しました！"
echo ""
echo "📋 次のステップ:"
echo "   1. .env に Supabase 認証情報を設定"
echo "   2. 'npm run dev' で開発サーバーを起動"
echo "   3. 'npx supabase start' でローカル Supabase を起動（オプション）"
echo ""
echo "🎉 良いコーディングを！"
