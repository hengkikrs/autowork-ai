# AutoWork AI

AI job application assistant built with React Router, Auth.js, and Postgres.

## Local setup

1. Install dependencies:

   ```bash
   npm install --legacy-peer-deps
   ```

2. Copy `.env.example` to `.env` and fill in `DATABASE_URL`, `AUTH_SECRET`, and `AUTH_URL`.

3. Apply the database schema in `supabase/migrations/0001_initial_schema.sql`.

4. Run locally:

   ```bash
   npm run dev
   ```

## Checks

```bash
npm run typecheck
npm run build
```
