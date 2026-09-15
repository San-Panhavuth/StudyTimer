"use client";

import { useActionState } from "react";
import Link from "next/link";
import { requestPasswordResetAction, type AuthFormState } from "../actions";

const initialState: AuthFormState = {};

export default function ForgotPasswordForm() {
  const [state, formAction, pending] = useActionState(requestPasswordResetAction, initialState);

  return (
    <form action={formAction} className="auth-card">
      <h1>Reset your password</h1>
      <p className="sub">Enter your email and we&apos;ll send a link to reset your password.</p>
      {state.error && <div className="auth-error">{state.error}</div>}
      {state.success && <div className="auth-success">{state.success}</div>}
      <div className="field">
        <label className="field-label" htmlFor="email">
          Email
        </label>
        <input id="email" name="email" type="email" autoComplete="email" required />
      </div>
      <button className="btn btn-primary" type="submit" disabled={pending}>
        {pending ? "Sending…" : "Send reset link"}
      </button>
      <p className="auth-foot">
        <Link href="/login">Back to login</Link>
      </p>
    </form>
  );
}
