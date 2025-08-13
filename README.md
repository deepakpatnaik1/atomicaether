# atomicaether

A modern web application built with SvelteKit, Hono.js, and Turso.

## Project Structure

```
atomicaether/
├── apps/
│   ├── web/          # SvelteKit frontend
│   └── api/          # Hono.js backend
├── packages/
│   └── shared/       # Shared types/utilities
└── aetherVault/      # Config & content
```

## Getting Started

1. Install dependencies:
```bash
npm install
```

2. Copy environment variables:
```bash
cp .env.example .env
```

3. Run development servers:
```bash
npm run dev
```

This will start:
- Frontend at http://localhost:5173
- API at http://localhost:3001

## Tech Stack

- **Frontend**: SvelteKit 2.0, TypeScript
- **Backend**: Hono.js, Node.js
- **Database**: Turso (LibSQL)
- **Authentication**: GitHub OAuth
- **Deployment**: Vercel (frontend), Render (backend)