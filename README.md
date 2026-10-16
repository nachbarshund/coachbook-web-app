# Coachbook Web

Öffentliche Seite und Admin-Bereich für Coachbook. Next.js 16, App Router, TypeScript.

## Lokal starten

```bash
npm install
cp .env.example .env.local   # Werte unten eintragen
npm run dev
```

## Umgebungsvariablen

| Variable | Zweck |
|---|---|
| `ADMIN_PASSWORD_HASH` | scrypt-Hash des Admin-Passworts. Erzeugen mit `node scripts/hash-password.mjs "passwort"` |
| `SESSION_SECRET` | Langer Zufallsstring zum Signieren des Session-Cookies, z. B. `openssl rand -hex 32` |

Beide Werte gehören nicht ins Repo. Lokal in `.env.local`, auf Vercel als Environment Variables.

## Struktur

- `app/` Startseite, Login, Admin (`/admin`, `/admin/upload`), Rechtsseiten
- `proxy.ts` leitet `/admin/*` ohne gültiges Session-Cookie auf `/login` um
- `app/admin/layout.tsx` prüft die Session zusätzlich serverseitig
- `lib/auth.ts` Passwortprüfung und signiertes Session-Cookie

## Status

Die Analyse-Pipeline ist noch nicht angebunden. Der Upload-Screen zeigt nur die Vorschau.
Impressum, Datenschutz und Kontakt sind Platzhalter.
