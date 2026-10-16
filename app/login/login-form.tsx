// Plain HTML form: the browser posts to /api/login and follows the redirect.
const messages: Record<string, string> = {
  empty: "Bitte Passwort eingeben.",
  config: "Der Zugang ist noch nicht konfiguriert.",
  wrong: "Passwort falsch. Bitte erneut versuchen.",
};

export function LoginForm({ error }: { error?: string }) {
  const message = error ? messages[error] : undefined;

  return (
    <form action="/api/login" method="post" className="card login-card" noValidate>
      <div>
        <h1>Anmelden</h1>
        <p>Zugang nur für Coachbook-Admin.</p>
      </div>

      <div className="field">
        <label htmlFor="password">Passwort</label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          placeholder="••••••••••••"
          className="input"
          required
          aria-invalid={Boolean(message)}
          aria-describedby={message ? "login-error" : undefined}
        />
      </div>

      {message ? (
        <div id="login-error" role="alert" className="notice">
          {message}
        </div>
      ) : null}

      <button type="submit" className="pill pill--solid pill--block">
        Anmelden
      </button>
    </form>
  );
}
