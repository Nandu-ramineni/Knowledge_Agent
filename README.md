# AI Research & Knowledge Agent — Week 1 Day 1

A React + Express + PostgreSQL/pgvector + Redis/BullMQ monorepo foundation.

## Requirements
- Node.js 24 LTS (or compatible modern Node)
- Docker Desktop with Docker Compose

## Start
1. `cp server/.env.example server/.env` (PowerShell: `Copy-Item server/.env.example server/.env`)
2. `docker compose up -d`
3. `npm install`
4. `npm run dev`
5. Open http://localhost:5173

API: http://localhost:5000/api/v1/health/ready

Test the worker (PowerShell):
`Invoke-RestMethod -Method Post -Uri http://localhost:5000/api/v1/dev/test-job`

Test the worker (bash):
`curl -X POST http://localhost:5000/api/v1/dev/test-job`

The running worker prints `Processed test job ...`.

## Important
- This is a Day 1 infrastructure scaffold, not the completed RAG app.
- Initial SQL in `server/db/001_init.sql` executes only when PostgreSQL's data volume is first created. Use migrations for later changes.
- The `/api/v1/dev/test-job` endpoint and unauthenticated documents listing are local development only. Remove or protect before deployment.
- Credentials are local development examples. Never commit `.env` or reuse them in production.
- If ports 5432/6379/5000/5173 are in use, change matching Compose and application settings.
