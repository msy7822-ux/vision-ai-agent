# デプロイガイド

## 本番環境URL

| サービス | URL |
|----------|-----|
| フロントエンド | https://web-designme-dev.vercel.app |
| バックエンドAPI | https://en-conversation-api-732422318933.asia-northeast1.run.app |

## クイックデプロイ

```bash
# 両方デプロイ
make deploy

# APIのみデプロイ
make deploy-api

# Webのみデプロイ
make deploy-web
```

## 初期セットアップ（新規環境の場合）

### 1. 必要なツールのインストール

```bash
# Google Cloud SDK
brew install --cask google-cloud-sdk

# Vercel CLI
npm install -g vercel

# 認証
gcloud auth login
vercel login
```

### 2. GCP APIの有効化

```bash
make setup-gcp
```

### 3. シークレットの設定

```bash
make setup-secrets
```

または手動で:

```bash
echo -n "YOUR_GOOGLE_API_KEY" | gcloud secrets create google-api-key --data-file=-
echo -n "YOUR_STREAM_API_KEY" | gcloud secrets create stream-api-key --data-file=-
echo -n "YOUR_STREAM_API_SECRET" | gcloud secrets create stream-api-secret --data-file=-
```

## 運用コマンド

```bash
# APIのヘルスチェック
make health-api

# Cloud Runのログ確認
make logs-api

# ローカル開発
make dev
```

## アーキテクチャ

```
┌─────────────────────────┐         ┌─────────────────────────┐
│      Vercel             │         │     Cloud Run           │
│   (Next.js Frontend)    │         │   (FastAPI Backend)     │
│                         │  HTTPS  │                         │
│  - React 19             │ ◄─────► │  - Python 3.11          │
│  - TensorFlow.js        │         │  - Vision Agents        │
│  - Stream Video SDK     │         │  - Gemini Realtime      │
└─────────────────────────┘         └─────────────────────────┘
            │                                   │
            │         GetStream                 │
            └───────────► ◄─────────────────────┘
                    (WebRTC / Chat)
```

## 環境変数

### Cloud Run (apps/api/env.yaml)

```yaml
CORS_ORIGINS: "https://web-designme-dev.vercel.app,http://localhost:3000"
```

シークレット（Secret Manager経由）:
- `GOOGLE_API_KEY`
- `STREAM_API_KEY`
- `STREAM_API_SECRET`

### Vercel

- `NEXT_PUBLIC_API_URL`: Cloud RunのURL

## コスト見積もり

| サービス | 月間コスト（概算） |
|----------|------------------|
| Cloud Run | $10-30（使用量による） |
| Vercel | 無料（Hobby）/ $20（Pro） |
| GetStream | 無料枠あり / $50〜 |
| Gemini API | $10-50（使用量による） |
| **合計** | **$20-150/月** |

## トラブルシューティング

### Cloud Runがシャットダウンする

正常な動作です。リクエストがないとインスタンスは0にスケールダウンします。
次のリクエストで自動起動します（コールドスタート: 数秒）。

常時起動が必要な場合:
```bash
gcloud run services update en-conversation-api --region asia-northeast1 --min-instances 1
```

### CORSエラー

`apps/api/env.yaml`にVercelのURLが含まれているか確認:
```yaml
CORS_ORIGINS: "https://web-designme-dev.vercel.app,http://localhost:3000"
```

変更後は `make deploy-api` で再デプロイ。
