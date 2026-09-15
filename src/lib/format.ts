export function fmtHMS(sec: number): string {
  sec = Math.max(0, Math.floor(sec));
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  const p = (n: number) => (n < 10 ? "0" + n : String(n));
  return `${p(h)}:${p(m)}:${p(s)}`;
}

export function fmtMin(sec: number): string {
  const m = Math.round(sec / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  const rm = m % 60;
  return `${h}h ${rm}m`;
}

export function fmtDate(ts: number): string {
  const d = new Date(ts);
  return (
    d.toLocaleDateString(undefined, { month: "short", day: "numeric" }) +
    " · " +
    d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })
  );
}

export function fmtTime(ts: number): string {
  return new Date(ts).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}

export function fmtDateRange(startTs: number, endTs: number): string {
  return `${fmtDate(startTs)} - ${fmtTime(endTs)}`;
}

function hashHue(str: string, base: number, spread: number): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) % 1000;
  return base + (h % spread);
}

export function colorForSubject(subject: string): string {
  const hue = hashHue(subject, 0, 360);
  return `hsl(${hue} 52% 46%)`;
}

// Neutral grey used for the synthetic "Break" pie/bar entry — never derived
// from colorForSubject since Break isn't a real subject.
export const BREAK_COLOR = "hsl(0 0% 55%)";
