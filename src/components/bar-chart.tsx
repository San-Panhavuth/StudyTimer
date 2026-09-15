"use client";

import { useEffect, useRef } from "react";
import { Chart, type Plugin } from "chart.js/auto";
import { fmtMin } from "@/lib/format";

export type BarWeek = { label: string; studyMinutes: number; breakMinutes: number; isCurrent: boolean };

type TodayGlowOptions = { index: number | null; color: string; font: string };

// Highlights the bar for the current week: a soft shadow-blur glow behind
// it, plus a small "TODAY" label above. Registered per-chart (not
// globally) so it only affects this component's charts.
const todayGlowPlugin: Plugin<"bar", TodayGlowOptions> = {
  id: "todayGlow",
  beforeDatasetsDraw(chart, _args, opts) {
    if (opts.index == null) return;
    const meta = chart.getDatasetMeta(0);
    const bar = meta.data[opts.index] as unknown as { x: number; width: number } | undefined;
    if (!bar) return;
    const { top, bottom } = chart.scales.y;
    const ctx = chart.ctx;
    const halfW = bar.width / 2 + 3;
    ctx.save();
    ctx.shadowColor = opts.color;
    ctx.shadowBlur = 16;
    ctx.fillStyle = opts.color.replace(")", " / 45%)");
    ctx.beginPath();
    if (typeof ctx.roundRect === "function") {
      ctx.roundRect(bar.x - halfW, top, halfW * 2, bottom - top, 6);
    } else {
      ctx.rect(bar.x - halfW, top, halfW * 2, bottom - top);
    }
    ctx.fill();
    ctx.restore();
  },
  afterDatasetsDraw(chart, _args, opts) {
    if (opts.index == null) return;
    const meta = chart.getDatasetMeta(0);
    const bar = meta.data[opts.index] as unknown as { x: number; y: number } | undefined;
    if (!bar) return;
    const ctx = chart.ctx;
    ctx.save();
    ctx.fillStyle = opts.color;
    ctx.font = `800 9.5px ${opts.font}`;
    ctx.textAlign = "center";
    ctx.fillText("TODAY", bar.x, Math.max(bar.y - 8, chart.scales.y.top + 12));
    ctx.restore();
  },
};

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
    const fontFamily = getComputedStyle(document.body).fontFamily || "sans-serif";

    const labels = weeks.map((w) => w.label);
    const studyData = weeks.map((w) => Math.round(w.studyMinutes));
    // Keep the Break dataset present at all times (as zeros when hidden) so
    // toggling "Include break" animates the grey layer growing/shrinking
    // instead of the chart popping the dataset in and out.
    const breakData = weeks.map((w) => (showBreak ? Math.round(w.breakMinutes) : 0));
    const todayIndex = weeks.findIndex((w) => w.isCurrent);
    const todayGlow: TodayGlowOptions = { index: todayIndex >= 0 ? todayIndex : null, color: accentColor, font: fontFamily };

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
          layout: { padding: { top: 16 } },
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
            // @ts-expect-error custom per-chart plugin option, not in Chart.js's built-in plugin types
            todayGlow,
          },
        },
        plugins: [todayGlowPlugin],
      });
    } else {
      const chart = chartRef.current;
      chart.data.labels = labels;
      chart.data.datasets[0].data = studyData;
      chart.data.datasets[1].data = breakData;
      // @ts-expect-error same custom plugin option as above
      chart.options.plugins.todayGlow = todayGlow;
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
