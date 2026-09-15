"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { signUpAction, type AuthFormState } from "../actions";

const initialState: AuthFormState = {};

export default function SignupForm() {
  const [state, formAction, pending] = useActionState(signUpAction, initialState);
  const [role, setRole] = useState<"child" | "parent">("child");

  return (
    <form action={formAction} className="auth-card">
      <h1>Create your account</h1>
      {state.error && <div className="auth-error">{state.error}</div>}
      {state.success && <div className="auth-success">{state.success}</div>}
      <div className="field">
        <span className="field-label">I am a</span>
        <div className="role-toggle">
          <button
            type="button"
            className={`role-toggle-btn${role === "child" ? " on" : ""}`}
            onClick={() => setRole("child")}
          >
            Child / Student
          </button>
          <button
            type="button"
            className={`role-toggle-btn${role === "parent" ? " on" : ""}`}
            onClick={() => setRole("parent")}
          >
            Parent
          </button>
        </div>
        <input type="hidden" name="role" value={role} />
      </div>
      <div className="field">
        <label className="field-label" htmlFor="email">
          Email
        </label>
        <input id="email" name="email" type="email" autoComplete="email" required />
      </div>
      <div className="field">
        <label className="field-label" htmlFor="password">
          Password
        </label>
        <input id="password" name="password" type="password" autoComplete="new-password" minLength={8} required />
      </div>
      <div className="field">
        <label className="field-label" htmlFor="confirmPassword">
          Confirm password
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
        {pending ? "Creating account…" : "Sign up"}
      </button>
      <p className="auth-foot">
        Already have an account? <Link href="/login">Log in</Link>
      </p>
    </form>
  );
}
