<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/fb992a91-6900-4452-bdcb-

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`
# Acervo BibliASPA

## Supabase keep-alive

To prevent a paused Supabase project from becoming inactive, run
[`supabase_keepalive.sql`](./supabase_keepalive.sql) once in the Supabase SQL
Editor. It creates a private heartbeat table and schedules one database-side
upsert per day through `pg_cron`. The table has no public RLS policies and is
not used by the application.

If Supabase reports that `pg_cron` is unavailable, enable it first under
Database → Extensions, then run the SQL file again.
