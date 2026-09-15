export default function LogLoading() {
  return (
    <section className="panel">
      <div className="tab-topbar">
        <div className="topbar-actions">
          <div className="skeleton" style={{ width: 120, height: 34, borderRadius: 10 }}></div>
          <div className="skeleton" style={{ width: 34, height: 34, borderRadius: 10 }}></div>
        </div>
      </div>

      <div className="card">
        <div className="skeleton" style={{ width: 110, height: 11, marginBottom: 12 }}></div>
        <div className="skeleton" style={{ width: "100%", height: 160, borderRadius: 10 }}></div>
      </div>

      <div className="card">
        <div className="skeleton" style={{ width: 110, height: 11, marginBottom: 12 }}></div>
        <div className="skeleton" style={{ width: "100%", height: 120, borderRadius: 10 }}></div>
      </div>

      <div className="card">
        <div className="skeleton" style={{ width: 80, height: 11, marginBottom: 12 }}></div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div className="skeleton" style={{ width: "100%", height: 64, borderRadius: 10 }}></div>
          <div className="skeleton" style={{ width: "100%", height: 64, borderRadius: 10 }}></div>
          <div className="skeleton" style={{ width: "100%", height: 64, borderRadius: 10 }}></div>
        </div>
      </div>
    </section>
  );
}
