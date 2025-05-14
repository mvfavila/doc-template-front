# Makefile for Vue + Firebase multi-environment project

# Variables
PROD_PROJECT = doc-template-front
DEV_PROJECT = doc-template-front-dev
NPM = npm
FIREBASE = firebase
DEPLOY_TARGET_PROD = production
DEPLOY_TARGET_DEV = dev

PYTHON := python3
PIP := pip3

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
.PHONY: build-prod build-dev build-functions build-cloudrun
build-prod: use-prod
	@echo " Building for PRODUCTION..."
	${NPM} run build -- --mode production

build-dev: use-dev
	@echo " Building for DEVELOPMENT..."
	${NPM} run build -- --mode development

build-functions: check-env
	@echo "Building all functions..."
	@echo "Building TypeScript functions..."
	@if ! npm --prefix 'functions' run build; then \
		echo "TypeScript build failed"; exit 1; \
	fi

build-cloudrun:
	@echo "Building cloud run service..."
	gcloud builds submit --tag gcr.io/${DEV_PROJECT}/doc-generator cloud-run/.

# Deployment commands
.PHONY: deploy-prod deploy-dev deploy-functions deploy-rules deploy-cloudrun
deploy-prod: build-prod use-prod
	@echo " Deploying to PRODUCTION (${PROD_PROJECT})..."
	${FIREBASE} deploy --only hosting:${DEPLOY_TARGET_PROD}

deploy-dev: build-dev use-dev
	@echo " Deploying to DEV (${DEV_PROJECT})..."
	${FIREBASE} deploy --only hosting:${DEPLOY_TARGET_DEV}

deploy-functions: deploy-ts-functions deploy-py-functions
	@echo "✓ All functions deployed successfully"

deploy-ts-functions: build-functions
	@echo "Deploying TypeScript functions..."
	${FIREBASE} deploy --only functions:typescript || \
		(echo "TypeScript deployment failed"; exit 1)

deploy-py-functions:
	@echo "=== Starting Deployment ==="
	@cd functions/python && \
		echo "1. Cleaning old environment..." && \
		rm -rf venv __pycache__ && \
		echo "2. Creating fresh virtualenv..." && \
		python3.10 -m venv venv && \
		. venv/bin/activate && \
		echo "3. Installing exact versions..." && \
		python3.10 -m pip install --upgrade pip && \
		python3.10 -m pip install -r requirements.txt --no-cache-dir && \
		echo "4. Verifying critical imports..." && \
		python3.10 -c "from firebase_functions import firestore_fn, options; from firebase_admin import initialize_app, firestore, storage; from docx import Document; from google.cloud import storage as gcs; print('✓ All dependencies verified')" && \
		echo "5. Starting deployment..." && \
		firebase deploy --only functions:python --debug && \
		echo "=== Deployment Complete ==="

deploy-rules:
	@echo " Deploying firestore rules..."
	${FIREBASE} deploy --only firestore:rules

deploy-cloudrun: build-cloudrun
	@echo " Deploying cloud run service..."
	gcloud run deploy doc-generator \
	--image=gcr.io/${DEV_PROJECT}/doc-generator \
	--service-account=${SA_DOC_GENERATOR_DEV} \
	--no-allow-unauthenticated \
	--platform=managed \
	--region=us-central1 \
	--set-env-vars="JAVA_TOOL_OPTIONS=-Djava.awt.headless=true" \
	--set-env-vars=OUTPUT_BUCKET=${DOC_TEMPLATE_FIREBASE_BUCKET_DEV}

# Serve locally
.PHONY: serve-prod serve-dev serve-dev-emulators
serve-prod: build-prod
	@echo " Serving production build locally..."
	${NPM} run preview

serve-dev: build-dev
	@echo " Serving dev build locally..."
	${NPM} run dev:live

serve-dev-emulators: build-dev
	@echo " Serving dev build locally (with emulators)..."
	${NPM} run dev:emulators

# Cleanup
.PHONY: clean
clean:
	@echo " Cleaning TS build artifacts..."
	rm -rf dist node_modules package-lock.json .vite
	@echo "Cleaning Python build artifacts..."
	rm -rf functions/python/__pycache__
	rm -rf functions/python/*.pyc

# Emulators
.PHONY: run-emulators export-data
run-emulators:
	@echo " Running emulators..."
	${FIREBASE} emulators:start --project=${DEV_PROJECT} --only auth,firestore,functions,storage --import ./emulator-data

export-data:
	@echo " Export data from emulators..."
	${FIREBASE} emulators:export ./emulator-data

# Environment check
PYTHON_VERSION := $(shell $(PYTHON) -c "import sys; print('.'.join(map(str, sys.version_info[:2])))")
PYTHON_OK := $(shell $(PYTHON) -c "import sys; print(int(sys.version_info >= (3, 10)))")

check-env:
	@echo "Checking environment..."
	@if [ "$(PYTHON_OK)" != "1" ]; then \
		echo "Error: Python 3.10+ is required (found $(PYTHON_VERSION))"; \
		exit 1; \
	fi
	@echo "Python $(PYTHON_VERSION) detected - OK"
	@echo "Node:"
	@node --version || (echo "Node.js is required"; exit 1)
	@echo "Npm:"
	@npm --version || (echo "npm is required"; exit 1)
	@echo "Firebase CLI:"
	@firebase --version || (echo "Firebase CLI is required"; exit 1)

# Help
.PHONY: help
help:
	@echo "Available commands:"
	@echo "  make install           	- Install dependencies"
	@echo "  make build-prod        	- Build production version"
	@echo "  make build-dev         	- Build development version"
	@echo "  make build-functions   	- Build cloud functions"
	@echo "  make build-cloudrun    	- Build cloud run service"
	@echo "  make deploy-prod       	- Deploy to production"
	@echo "  make deploy-dev        	- Deploy to dev"
	@echo "  make deploy-functions  	- Deploy all cloud functions"
	@echo "  make deploy-ts-functions  	- Deploy TypeScript cloud functions"
	@echo "  make deploy-py-functions  	- Deploy Python cloud functions"
	@echo "  make deploy-rules	    	- Deploy firestore rules"
	@echo "  make deploy-cloudrun   	- Deploy cloud run service"
	@echo "  make serve             	- Start local dev server"
	@echo "  make serve-prod        	- Serve production build locally"
	@echo "  make serve-dev         	- Serve dev build locally"
	@echo "  make clean             	- Remove build artifacts"
	@echo "  make use-prod          	- Switch to production Firebase project"
	@echo "  make use-dev           	- Switch to dev Firebase project"
	@echo "  make run-emulators     	- Run emulators for dev"
	@echo "  make export-data       	- Export data from emulators"