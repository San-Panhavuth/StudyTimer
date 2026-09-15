"use client";

import { useEffect, useRef } from "react";
import { Chart } from "chart.js/auto";
import { fmtMin } from "@/lib/format";

export type BarWeek = { label: string; studyMinutes: number; breakMinutes: number };

export default function BarChart({ weeks, showBreak }: { weeks: BarWeek[]; showBreak: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<Chart | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const styles = getComputedStyle(document.documentElement);
    const accentColor = styles.getPropertyValue("--accent").trim();
    const restColor = styles.getPropertyValue("--rest").trim();
    const inkDim = styles.getPropertyValue("--ink-dim").trim();
    const lineColor = styles.getPropertyValue("--line").trim();

    const labels = weeks.map((w) => w.label);
    const studyData = weeks.map((w) => Math.round(w.studyMinutes));
    // Keep the Break dataset present at all times (as zeros when hidden) so
    // toggling "Include break" animates the grey layer growing/shrinking
    // instead of the chart popping the dataset in and out.
    const breakData = weeks.map((w) => (showBreak ? Math.round(w.breakMinutes) : 0));

    if (!chartRef.current) {
      chartRef.current = new Chart(canvas, {
        type: "bar",
        data: {
          labels,
          datasets: [
            { label: "Study", data: studyData, backgroundColor: accentColor, stack: "total", borderRadius: 3 },
            { label: "Break", data: breakData, backgroundColor: restColor, stack: "total", borderRadius: 3 },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          animation: { duration: 450, easing: "easeOutQuart" },
          scales: {
            x: { stacked: true, ticks: { color: inkDim, font: { size: 10 } }, grid: { display: false } },
            y: {
              stacked: true,
              beginAtZero: true,
              ticks: { color: inkDim, font: { size: 10 }, callback: (v) => `${v}m` },
              grid: { color: lineColor },
            },
          },
          plugins: {
            legend: { display: false },
            tooltip: {
              filter: (item) => Number(item.raw) > 0,
              callbacks: { label: (ctx) => `${ctx.dataset.label}: ${fmtMin(Number(ctx.raw) * 60)}` },
            },
          },
        },
      });
    } else {
      const chart = chartRef.current;
      chart.data.labels = labels;
      chart.data.datasets[0].data = studyData;
      chart.data.datasets[1].data = breakData;
      chart.update();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(weeks), showBreak]);

  useEffect(
    () => () => {
      chartRef.current?.destroy();
      chartRef.current = null;
    },
    [],
  );

  return (
    <div className="chart-box">
      <canvas ref={canvasRef}></canvas>
    </div>
  );
}
