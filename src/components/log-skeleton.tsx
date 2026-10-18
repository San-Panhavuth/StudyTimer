// Placeholder shown in place of the charts and session list while another
// child's data is loading, so the previous child's numbers never linger on
// screen. Block sizes mirror the real cards to avoid a jump when data lands.
export default function LogSkeleton() {
  return (
    <>
      <div className="card" aria-busy="true" aria-label="Loading">
        <div className="skeleton" style={{ width: 120, height: 11, marginBottom: 12 }}></div>
        <div className="skeleton" style={{ width: "100%", height: 300, borderRadius: 10 }}></div>
        <div style={{ display: "flex", justifyContent: "center", gap: 10, marginTop: 14 }}>
          <div className="skeleton" style={{ width: 60, height: 14 }}></div>
          <div className="skeleton" style={{ width: 70, height: 14 }}></div>
          <div className="skeleton" style={{ width: 60, height: 14 }}></div>
        </div>
      </div>

      <div className="card">
        <div className="skeleton" style={{ width: 110, height: 11, marginBottom: 12 }}></div>
        <div className="skeleton" style={{ width: "100%", height: 300, borderRadius: 10 }}></div>
      </div>

      <div className="card">
        <div className="skeleton" style={{ width: 80, height: 11, marginBottom: 12 }}></div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div className="skeleton" style={{ width: "100%", height: 74, borderRadius: 10 }}></div>
          <div className="skeleton" style={{ width: "100%", height: 74, borderRadius: 10 }}></div>
          <div className="skeleton" style={{ width: "100%", height: 74, borderRadius: 10 }}></div>
        </div>
      </div>
    </>
  );
}
