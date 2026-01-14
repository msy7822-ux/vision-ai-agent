.PHONY: help dev dev-api dev-web dev-log build install clean lint api-shell

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
	@echo "  Setup:"
	@echo "    make install    - Install all dependencies"
	@echo "    make install-api - Install API dependencies"
	@echo "    make install-web - Install Web dependencies"
	@echo ""
	@echo "  Utilities:"
	@echo "    make lint       - Run linters on all packages"
	@echo "    make clean      - Remove build artifacts"
	@echo "    make api-shell  - Open Python shell with API context"

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
