export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="auth-shell">
      <div className="auth-wordmark">
        <span className="khmer">Study Time</span>
      </div>
      {children}
    </div>
  );
}
