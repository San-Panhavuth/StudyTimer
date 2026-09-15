import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import ResetPasswordForm from "./reset-password-form";

export default async function ResetPasswordPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div className="auth-card">
        <h1>Link expired</h1>
        <p className="sub">This reset link is no longer valid. Request a new one.</p>
        <Link href="/forgot-password" className="btn btn-primary" style={{ textDecoration: "none" }}>
          Request new link
        </Link>
      </div>
    );
  }

  return <ResetPasswordForm />;
}
