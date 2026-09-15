"use client";

import { useActionState } from "react";
import { updatePasswordAction, type AuthFormState } from "../actions";

const initialState: AuthFormState = {};

export default function ResetPasswordForm() {
  const [state, formAction, pending] = useActionState(updatePasswordAction, initialState);

  return (
    <form action={formAction} className="auth-card">
      <h1>Choose a new password</h1>
      {state.error && <div className="auth-error">{state.error}</div>}
      <div className="field">
        <label className="field-label" htmlFor="password">
          New password
        </label>
        <input id="password" name="password" type="password" autoComplete="new-password" minLength={8} required />
      </div>
      <div className="field">
        <label className="field-label" htmlFor="confirmPassword">
          Confirm new password
        </label>
        <input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          minLength={8}
          required
        />
      </div>
      <button className="btn btn-primary" type="submit" disabled={pending}>
        {pending ? "Saving…" : "Save new password"}
      </button>
    </form>
  );
}
