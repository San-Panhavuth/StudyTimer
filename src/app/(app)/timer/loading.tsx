export default function TimerLoading() {
  return (
    <section className="panel">
      <div className="timer-stage">
        <div className="card timer-card">
          <div className="skeleton" style={{ width: 90, height: 22, borderRadius: 999 }}></div>
          <div className="skeleton" style={{ width: "70%", height: 16, marginTop: 18 }}></div>
          <div className="skeleton" style={{ width: "50%", height: 44, marginTop: 10 }}></div>
          <div style={{ width: "100%", marginTop: 22 }}>
            <div className="skeleton" style={{ width: "100%", height: 48, borderRadius: 10 }}></div>
          </div>
        </div>
      </div>
    </section>
  );
}
