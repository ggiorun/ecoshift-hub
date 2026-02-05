# Vercel Deployment Guide

This project is configured to run on Vercel with a hybrid database setup.

## Database Options

### 1. Vercel Postgres (Recommended)
This requires a Vercel Project linked to a Vercel Postgres store.

1. Go to your Vercel Project Dashboard.
2. Click **Storage** tab.
3. Click **Connect Database** -> **Vercel Postgres**.
4. Once created, Vercel automatically adds the following Environment Variables to your project:
   - `POSTGRES_URL` (This is the important one the app looks for)
   - `POSTGRES_PRISMA_URL`, etc.

**That's it!** The app will detect `POSTGRES_URL` and automatically use the Postgres adapter instead of SQLite.

### 2. External Postgres (Supabase, Neon, etc.)
If you use an external provider:

1. Go to **Settings** -> **Environment Variables** on Vercel.
2. Add a new variable:
   - Key: `POSTGRES_URL` (or `DATABASE_URL`)
   - Value: `postgres://user:password@host:port/database`

## Local Development
In local development, if no `POSTGRES_URL` is defined in your `.env` file, the app defaults to using **SQLite** (`server/ecoshift.db`).

## Troubleshooting
- **Logs**: Check Vercel Function logs if the API returns 500 errors.
- **Build Fails**: Ensure all dependencies (`pg`, `sqlite3`, etc.) are in `package.json`.
