# Build Master — Project Feasibility App

Commercial real estate investment feasibility & intelligence platform.
Next.js 14 (App Router) + TypeScript + Supabase (Postgres + Auth) + Tailwind.

## One-time setup: connect this to GitHub + Vercel (so edits auto-deploy)

This makes future changes work exactly like your Mone app: edit locally
(with Claude Code or any editor) → `git push` → Vercel builds and deploys
automatically. No more manual uploads.

### 1. Push this folder to a new GitHub repo

```bash
cd build-master-app        # this folder
git init
git add .
git commit -m "Initial commit"
```

Then create a new empty repo on GitHub (github.com/new — don't initialize
it with a README), and push:

```bash
git remote add origin https://github.com/<your-username>/build-master-app.git
git branch -M main
git push -u origin main
```

If you have the GitHub CLI (`gh`) installed and logged in, you can skip
creating the repo manually:

```bash
gh repo create build-master-app --private --source=. --remote=origin --push
```

### 2. Connect the repo to your existing Vercel project

Go to your Vercel dashboard → the `feasibility-calculator-app` project →
**Settings → Git → Connect Git Repository** → pick the repo you just pushed.

From then on, every `git push` to `main` triggers a new production
deployment automatically — no manual drag-and-drop, no copy-pasting code.

### 3. Environment variables (optional but recommended)

The Supabase URL and anon key are currently baked into the code as safe
fallbacks (they're public/publishable keys, safe to expose). If you'd
rather set them properly as environment variables instead:

In Vercel → Settings → Environment Variables, add:
- `NEXT_PUBLIC_SUPABASE_URL` = `https://ccbcklbomtncagmueiob.supabase.co`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` = (the publishable key)

And locally, copy `.env.local.example` to `.env.local` with the same values.

## Local development

```bash
npm install
npm run dev
```

Visit http://localhost:3000

## Project structure

- `app/` — Next.js App Router pages (login, projects list, project workspace, compare)
- `components/Workspace.tsx` — the full wizard/results/report/charts UI for one project
- `lib/engine.ts` — the calculation engine (pure functions, shared client + server)
- `lib/supabase/` — Supabase client helpers (browser, server, middleware)
- `app/actions.ts` — server actions for project CRUD

## Database

Supabase project `feasibility-calculator` (separate from any other apps).
Tables: `profiles`, `projects` (JSONB `data` column holds the full project
state; RLS restricts every row to its owner).
