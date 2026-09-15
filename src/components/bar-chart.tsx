"use client";

import { useEffect, useRef } from "react";
import { Chart } from "chart.js/auto";
import { fmtMin } from "@/lib/format";

export type BarWeek = { label: string; minutes: number };

export default function BarChart({ weeks }: { weeks: BarWeek[] }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<Chart | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    chartRef.current?.destroy();

    const styles = getComputedStyle(document.documentElement);
    const accentColor = styles.getPropertyValue("--accent").trim();
    const inkDim = styles.getPropertyValue("--ink-dim").trim();
    const lineColor = styles.getPropertyValue("--line").trim();

    chartRef.current = new Chart(canvas, {
      type: "bar",
      data: {
        labels: weeks.map((w) => w.label),
        datasets: [
          {
            label: "Study time",
            data: weeks.map((w) => Math.round(w.minutes)),
            backgroundColor: accentColor,
            borderRadius: 3,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: { ticks: { color: inkDim, font: { size: 10 } }, grid: { display: false } },
          y: {
            ticks: { color: inkDim, font: { size: 10 }, callback: (v) => `${v}m` },
            grid: { color: lineColor },
          },
        },
        plugins: {
          legend: { display: false },
          tooltip: { callbacks: { label: (ctx) => `Study: ${fmtMin(Number(ctx.raw) * 60)}` } },
        },
      },
    });

    return () => {
      chartRef.current?.destroy();
      chartRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(weeks)]);

  return (
    <div className="chart-box">
      <canvas ref={canvasRef}></canvas>
    </div>
  );
}
