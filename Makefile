.PHONY: help dev dev-api dev-web dev-log build install clean lint api-shell deploy deploy-api deploy-web

# Configuration
GCP_PROJECT := vision-agents-dev
GCP_REGION := asia-northeast1
CLOUD_RUN_SERVICE := en-conversation-api
VERCEL_API_URL := https://en-conversation-api-732422318933.asia-northeast1.run.app

# Default target
help:
	@echo "Available commands:"
	@echo ""
	@echo "  Development:"
	@echo "    make dev        - Start both API and Web servers"
	@echo "    make dev-log    - Start with logs saved to dev.log"
	@echo "    make dev-api    - Start API server only"
	@echo "    make dev-web    - Start Web server only"
	@echo ""
	@echo "  Build:"
	@echo "    make build      - Build all packages"
	@echo "    make build-web  - Build web app only"
	@echo ""
	@echo "  Deploy:"
	@echo "    make deploy     - Deploy both API and Web to production"
	@echo "    make deploy-api - Deploy API to Cloud Run"
	@echo "    make deploy-web - Deploy Web to Vercel"
	@echo ""
	@echo "  Setup:"
	@echo "    make install    - Install all dependencies"
	@echo "    make install-api - Install API dependencies"
	@echo "    make install-web - Install Web dependencies"
	@echo ""
	@echo "  Utilities:"
	@echo "    make lint       - Run linters on all packages"
	@echo "    make clean      - Remove build artifacts"
	@echo "    make api-shell  - Open Python shell with API context"
	@echo "    make logs-api   - View Cloud Run logs"

# Development
dev:
	pnpm dev --output-logs=full

dev-log:
	pnpm dev --output-logs=full 2>&1 | tee dev.log

dev-api:
	cd apps/api && uv run uvicorn src.main:app --reload --host 0.0.0.0 --port 8000

dev-web:
	pnpm dev --filter web

# Build
build:
	pnpm build

build-web:
	pnpm build --filter web

# Install
install:
	pnpm install
	cd apps/api && uv sync

install-api:
	cd apps/api && uv sync

install-web:
	pnpm install --filter web

# Lint
lint:
	pnpm lint
	cd apps/api && uv run ruff check src/

lint-fix:
	cd apps/api && uv run ruff check --fix src/
	pnpm lint --fix

# Clean
clean:
	rm -rf apps/web/.next
	rm -rf apps/web/node_modules/.cache
	find . -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null || true
	find . -type d -name ".pytest_cache" -exec rm -rf {} + 2>/dev/null || true

# API utilities
api-shell:
	cd apps/api && uv run python -i -c "from src.config import settings; from src.stream_client import stream_client; print('Loaded: settings, stream_client')"

# Run tests
test:
	cd apps/api && uv run pytest

# Type check
typecheck:
	pnpm typecheck --filter web 2>/dev/null || cd apps/web && pnpm exec tsc --noEmit

# =============================================================================
# Deploy
# =============================================================================

# Deploy both API and Web
deploy: deploy-api deploy-web
	@echo ""
	@echo "✅ Deployment complete!"
	@echo "   API: https://$(CLOUD_RUN_SERVICE)-732422318933.$(GCP_REGION).run.app"
	@echo "   Web: https://web-designme-dev.vercel.app"

# Deploy API to Cloud Run
deploy-api:
	@echo "🚀 Deploying API to Cloud Run..."
	cd apps/api && gcloud run deploy $(CLOUD_RUN_SERVICE) \
		--source . \
		--project $(GCP_PROJECT) \
		--region $(GCP_REGION) \
		--allow-unauthenticated \
		--env-vars-file env.yaml \
		--set-secrets "GOOGLE_API_KEY=google-api-key:latest,STREAM_API_KEY=stream-api-key:latest,STREAM_API_SECRET=stream-api-secret:latest" \
		--quiet
	@echo "✅ API deployed!"

# Deploy Web to Vercel
deploy-web:
	@echo "🚀 Deploying Web to Vercel..."
	cd apps/web && vercel --yes --prod -e NEXT_PUBLIC_API_URL=$(VERCEL_API_URL)
	@echo "✅ Web deployed!"

# View Cloud Run logs
logs-api:
	gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=$(CLOUD_RUN_SERVICE)" \
		--project $(GCP_PROJECT) \
		--limit=50 \
		--format="value(textPayload)"

# Check API health
health-api:
	@curl -s https://$(CLOUD_RUN_SERVICE)-732422318933.$(GCP_REGION).run.app/health | jq .

# =============================================================================
# Initial Setup (run once)
# =============================================================================

# Setup GCP secrets (run once when setting up new environment)
setup-secrets:
	@echo "Setting up GCP secrets..."
	@echo "Enter GOOGLE_API_KEY:"; read key; echo -n "$$key" | gcloud secrets create google-api-key --data-file=- --project $(GCP_PROJECT) 2>/dev/null || echo "Secret already exists"
	@echo "Enter STREAM_API_KEY:"; read key; echo -n "$$key" | gcloud secrets create stream-api-key --data-file=- --project $(GCP_PROJECT) 2>/dev/null || echo "Secret already exists"
	@echo "Enter STREAM_API_SECRET:"; read key; echo -n "$$key" | gcloud secrets create stream-api-secret --data-file=- --project $(GCP_PROJECT) 2>/dev/null || echo "Secret already exists"
	@echo "✅ Secrets configured!"

# Enable required GCP APIs (run once)
setup-gcp:
	@echo "Enabling GCP APIs..."
	gcloud services enable run.googleapis.com secretmanager.googleapis.com cloudbuild.googleapis.com artifactregistry.googleapis.com --project $(GCP_PROJECT)
	@echo "✅ GCP APIs enabled!"
