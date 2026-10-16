# Coachbook Web

Public site and admin area for Coachbook. Built with Next.js 16 (App Router) and TypeScript.

## Local development

```bash
npm install
cp .env.example .env.local   # fill in the values below
npm run dev
```

## Environment variables

| Variable | Purpose |
|---|---|
| `ADMIN_PASSWORD` | The admin password for `/login`. It also signs the session cookie, so changing it logs out all sessions |

Never commit this value. Locally it lives in `.env.local`; in production it is a Vercel environment variable.

## Structure

- `app/`: home page, login, admin (`/admin`, `/admin/upload`), legal pages
- `proxy.ts`: redirects `/admin/*` to `/login` when there is no valid session cookie
- `app/admin/layout.tsx`: verifies the session again on the server
- `lib/auth.ts`: password verification and the signed session cookie

## Status

- The analysis pipeline is not connected yet. The upload screen only shows a local video preview.
- Impressum, Datenschutz and Kontakt are placeholders.
- The site is `noindex` until it is launched.
