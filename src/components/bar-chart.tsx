"use client";

import { useEffect, useRef } from "react";
import { Chart, type Plugin } from "chart.js/auto";
import { fmtMin } from "@/lib/format";

export type BarWeek = { label: string; studyMinutes: number; breakMinutes: number; isCurrent: boolean };

// Corner radius of the bars (the current week's glow follows it).
const BAR_RADIUS = 6;
// How far the glow's outline sits outside the bar.
const GLOW_OUTSET = 2;

type TodayGlowOptions = { index: number | null; color: string; font: string };

// Highlights the bar for the current week with a soft shadow-blur glow behind
// it. Registered per-chart (not globally) so it only affects this
// component's charts.
const todayGlowPlugin: Plugin<"bar", TodayGlowOptions> = {
  id: "todayGlow",
  beforeDatasetsDraw(chart, _args, opts) {
    if (opts.index == null) return;
    type BarEl = { x: number; y: number; base: number; width: number };
    const study = chart.getDatasetMeta(0).data[opts.index] as unknown as BarEl | undefined;
    const rest = chart.getDatasetMeta(1)?.data[opts.index] as unknown as BarEl | undefined;
    if (!study) return;

    // Trace the stacked bar's real silhouette (study + break together), grown
    // by GLOW_OUTSET, so the glow hugs the bar instead of being a separate
    // full-height column.
    const stackTop = Math.min(study.y, rest ? rest.y : study.y);
    const x = study.x - study.width / 2 - GLOW_OUTSET;
    const y = stackTop - GLOW_OUTSET;
    const w = study.width + GLOW_OUTSET * 2;
    const h = study.base - stackTop + GLOW_OUTSET * 2;
    const radius = BAR_RADIUS + GLOW_OUTSET;

    const ctx = chart.ctx;
    ctx.save();
    ctx.shadowColor = opts.color;
    ctx.shadowBlur = 16;
    ctx.globalAlpha = 0.45;
    ctx.fillStyle = opts.color;
    ctx.beginPath();
    if (typeof ctx.roundRect === "function") {
      ctx.roundRect(x, y, w, h, radius);
    } else {
      ctx.rect(x, y, w, h);
    }
    ctx.fill();
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
            {
              label: "Study",
              data: studyData,
              backgroundColor: accentColor,
              stack: "total",
              borderSkipped: false,
              // Study and Break stack into one bar: round only the outer ends,
              // so the join between them is a clean straight seam.
              borderRadius: (ctx) => {
                const hasBreak = Number(ctx.chart.data.datasets[1]?.data[ctx.dataIndex]) > 0;
                const top = hasBreak ? 0 : BAR_RADIUS;
                return { topLeft: top, topRight: top, bottomLeft: BAR_RADIUS, bottomRight: BAR_RADIUS };
              },
            },
            {
              label: "Break",
              data: breakData,
              backgroundColor: restColor,
              stack: "total",
              borderSkipped: false,
              borderRadius: { topLeft: BAR_RADIUS, topRight: BAR_RADIUS, bottomLeft: 0, bottomRight: 0 },
            },
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
