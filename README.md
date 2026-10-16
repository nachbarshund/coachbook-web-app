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
| `ADMIN_PASSWORD_HASH` | scrypt hash of the admin password. Generate with `node scripts/hash-password.mjs "your-password"` |
| `SESSION_SECRET` | Long random string used to sign the session cookie, e.g. `openssl rand -hex 32` |

Never commit these values. Locally they live in `.env.local`; in production they are Vercel environment variables.

## Structure

- `app/`: home page, login, admin (`/admin`, `/admin/upload`), legal pages
- `proxy.ts`: redirects `/admin/*` to `/login` when there is no valid session cookie
- `app/admin/layout.tsx`: verifies the session again on the server
- `lib/auth.ts`: password verification and the signed session cookie
- `scripts/hash-password.mjs`: creates the value for `ADMIN_PASSWORD_HASH`

## Status

- The analysis pipeline is not connected yet. The upload screen only shows a local video preview.
- Impressum, Datenschutz and Kontakt are placeholders.
- The site is `noindex` until it is launched.
