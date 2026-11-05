# Radhe Krishna Residency

Website for Radhe Krishna Residency Phase 02, featuring project information,
site imagery, and an interactive master plan.

## Run locally

Requirements: Node.js 22 or newer and npm.

```bash
npm ci
npm run dev
```

## Build

```bash
npm run build
npm run typecheck
```

## Deploy

This project uses a server-rendered app framework, so GitHub stores the source
code but GitHub Pages cannot run the complete application. To deploy, import
this repository into Vercel and configure any required database or
authentication environment variables in the Vercel project settings. Do not
commit secrets or `.env` files.
