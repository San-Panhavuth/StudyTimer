import { describe, expect, it } from "vitest";
import { colorForSubject, fmtDate, fmtHMS, fmtMin } from "./format";

describe("fmtHMS", () => {
  it("formats zero as 00:00:00", () => {
    expect(fmtHMS(0)).toBe("00:00:00");
  });

  it("pads single digits", () => {
    expect(fmtHMS(5)).toBe("00:00:05");
    expect(fmtHMS(65)).toBe("00:01:05");
  });

  it("formats hours correctly", () => {
    expect(fmtHMS(3661)).toBe("01:01:01");
  });

  it("floors fractional seconds", () => {
    expect(fmtHMS(59.9)).toBe("00:00:59");
  });

  it("clamps negative values to zero", () => {
    expect(fmtHMS(-10)).toBe("00:00:00");
  });

  it("handles large durations past 24h without wrapping", () => {
    expect(fmtHMS(90000)).toBe("25:00:00");
  });
});

describe("fmtMin", () => {
  it("shows minutes under an hour", () => {
    expect(fmtMin(0)).toBe("0m");
    expect(fmtMin(59)).toBe("1m"); // rounds to nearest minute
    expect(fmtMin(600)).toBe("10m");
  });

  it("switches to hours + minutes at 60 minutes", () => {
    expect(fmtMin(3600)).toBe("1h 0m");
    expect(fmtMin(3660)).toBe("1h 1m");
    expect(fmtMin(7530)).toBe("2h 6m"); // 125.5min rounds to 126 -> 2h 6m
  });

  it("rounds to the nearest minute", () => {
    expect(fmtMin(89)).toBe("1m"); // 1.48min rounds to 1
    expect(fmtMin(91)).toBe("2m"); // 1.52min rounds to 2
  });
});

describe("fmtDate", () => {
  it("produces a non-empty, stable-shaped string", () => {
    const ts = new Date(2026, 8, 15, 9, 5).getTime();
    const result = fmtDate(ts);
    expect(result).toContain("·");
    expect(result.length).toBeGreaterThan(5);
  });
});

describe("colorForSubject", () => {
  it("is deterministic for the same subject name", () => {
    expect(colorForSubject("Math")).toBe(colorForSubject("Math"));
  });

  it("returns a valid hsl() string", () => {
    expect(colorForSubject("Khmer")).toMatch(/^hsl\(\d+(\.\d+)? \d+% \d+%\)$/);
  });

  it("tends to differ between distinct subject names", () => {
    const subjects = ["Khmer", "English", "Physics", "Biology", "Chemistry", "Math", "IT"];
    const colors = new Set(subjects.map(colorForSubject));
    // Hash collisions are possible but should be rare across this small, varied set.
    expect(colors.size).toBeGreaterThan(1);
  });
});
