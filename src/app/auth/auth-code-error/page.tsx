import Link from "next/link";

export default function AuthCodeErrorPage() {
  return (
    <div className="auth-shell">
      <div className="auth-wordmark">
        <span className="khmer">វេលារៀន</span>
        <span className="latin">Velea Rien</span>
      </div>
      <div className="auth-card">
        <h1>Link expired</h1>
        <p className="sub">
          That confirmation or reset link is no longer valid — it may have already been used or expired. Request a
          new one and try again.
        </p>
        <Link href="/login" className="btn btn-primary" style={{ textDecoration: "none" }}>
          Back to login
        </Link>
      </div>
    </div>
  );
}
