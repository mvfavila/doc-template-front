# Makefile for Vue + Firebase multi-environment project

# Variables
PROD_PROJECT = doc-template-front
DEV_PROJECT = doc-template-front-dev
NPM = npm
FIREBASE = firebase
DEPLOY_TARGET_PROD = production
DEPLOY_TARGET_DEV = dev

# Environment setup
.PHONY: use-prod use-dev
use-prod:
	@echo " Switching to PRODUCTION project: ${PROD_PROJECT}"
	${FIREBASE} use ${PROD_PROJECT}

use-dev:
	@echo " Switching to DEV project: ${DEV_PROJECT}"
	${FIREBASE} use ${DEV_PROJECT}

# Install dependencies
.PHONY: install
install:
	@echo " Installing dependencies..."
	${NPM} install

# Build commands
.PHONY: build-prod build-dev
build-prod: use-prod
	@echo " Building for PRODUCTION..."
	${NPM} run build -- --mode production

build-dev: use-dev
	@echo " Building for DEVELOPMENT..."
	${NPM} run build -- --mode development

# Deployment commands
.PHONY: deploy-prod deploy-dev
deploy-prod: build-prod use-prod
	@echo " Deploying to PRODUCTION (${PROD_PROJECT})..."
	${FIREBASE} deploy --only hosting:${DEPLOY_TARGET_PROD}

deploy-dev: build-dev use-dev
	@echo " Deploying to DEV (${DEV_PROJECT})..."
	${FIREBASE} deploy --only hosting:${DEPLOY_TARGET_DEV}

# Serve locally
.PHONY: serve-prod serve-dev
serve-prod: build-prod
	@echo " Serving production build locally..."
	${NPM} run preview

serve-dev: build-dev
	@echo " Serving dev build locally..."
	${NPM} run dev

# Cleanup
.PHONY: clean
clean:
	@echo " Cleaning build artifacts..."
	rm -rf dist node_modules package-lock.json .vite

# Help
.PHONY: help
help:
	@echo "Available commands:"
	@echo "  make install       - Install dependencies"
	@echo "  make build-prod    - Build production version"
	@echo "  make build-dev     - Build development version"
	@echo "  make deploy-prod   - Deploy to production"
	@echo "  make deploy-dev    - Deploy to dev"
	@echo "  make serve         - Start local dev server"
	@echo "  make serve-prod    - Serve production build locally"
	@echo "  make serve-dev     - Serve dev build locally"
	@echo "  make clean         - Remove build artifacts"
	@echo "  make use-prod      - Switch to production Firebase project"
	@echo "  make use-dev       - Switch to dev Firebase project"