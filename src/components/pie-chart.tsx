"use client";

import { useEffect, useRef } from "react";
import { Chart } from "chart.js/auto";
import { fmtMin } from "@/lib/format";

export type PieEntry = { label: string; minutes: number; color: string };

export default function PieChart({ entries }: { entries: PieEntry[] }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<Chart | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    chartRef.current?.destroy();
    chartRef.current = null;

    if (entries.length === 0) {
      const ctx = canvas.getContext("2d");
      ctx?.clearRect(0, 0, canvas.width, canvas.height);
      return;
    }

    const styles = getComputedStyle(document.documentElement);
    const inkColor = styles.getPropertyValue("--ink").trim();
    const surfaceColor = styles.getPropertyValue("--surface").trim();

    chartRef.current = new Chart(canvas, {
      type: "pie",
      data: {
        labels: entries.map((e) => e.label),
        datasets: [
          {
            data: entries.map((e) => e.minutes),
            backgroundColor: entries.map((e) => e.color),
            borderColor: surfaceColor,
            borderWidth: 2,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: "bottom", labels: { color: inkColor, font: { size: 11 }, boxWidth: 10, padding: 10 } },
          tooltip: { callbacks: { label: (ctx) => `${ctx.label}: ${fmtMin(Number(ctx.raw) * 60)}` } },
        },
      },
    });

    return () => {
      chartRef.current?.destroy();
      chartRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(entries)]);

  return (
    <div className="chart-box">
      <canvas ref={canvasRef}></canvas>
    </div>
  );
}
