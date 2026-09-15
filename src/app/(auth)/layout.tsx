export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="auth-shell">
      <div className="auth-wordmark">
        <span className="khmer">វេលារៀន</span>
        <span className="latin">Velea Rien</span>
      </div>
      {children}
    </div>
  );
}
