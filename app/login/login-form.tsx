"use client";

import { useActionState } from "react";
import { login, type LoginState } from "./actions";

const initialState: LoginState = {};

export function LoginForm() {
  const [state, action, pending] = useActionState(login, initialState);

  return (
    <form action={action} className="card login-card" noValidate>
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
          aria-invalid={Boolean(state.error)}
          aria-describedby={state.error ? "login-error" : undefined}
        />
      </div>

      {state.error ? (
        <div id="login-error" role="alert" className="notice">
          {state.error}
        </div>
      ) : null}

      <button type="submit" className="pill pill--solid pill--block" disabled={pending}>
        {pending ? "Wird geprüft …" : "Anmelden"}
      </button>
    </form>
  );
}
