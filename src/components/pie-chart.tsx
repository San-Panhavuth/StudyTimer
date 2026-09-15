"use client";

import { useEffect, useRef } from "react";
import { Chart } from "chart.js/auto";
import { fmtMin } from "@/lib/format";

export type PieEntry = { label: string; minutes: number; color: string };

function dim(color: string): string {
  return color.replace(")", " / 35%)");
}

export default function PieChart({
  entries,
  selectedSubjects,
  onToggleLabel,
}: {
  entries: PieEntry[];
  selectedSubjects: string[];
  onToggleLabel: (label: string) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<Chart | null>(null);
  const onToggleRef = useRef(onToggleLabel);
  onToggleRef.current = onToggleLabel;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    if (entries.length === 0) {
      chartRef.current?.destroy();
      chartRef.current = null;
      return;
    }

    const styles = getComputedStyle(document.documentElement);
    const inkColor = styles.getPropertyValue("--ink").trim();
    const surfaceColor = styles.getPropertyValue("--surface").trim();

    const labels = entries.map((e) => e.label);
    const data = entries.map((e) => e.minutes);
    const colors = entries.map((e) =>
      selectedSubjects.length > 0 && e.label !== "Break" && !selectedSubjects.includes(e.label) ? dim(e.color) : e.color,
    );
    // A single 100% slice still draws its start/end radius as a border
    // stroke (same angle, so it looks like a stray line through the
    // circle) — skip the border when there's only one.
    const borderWidth = entries.length > 1 ? 2 : 0;

    if (!chartRef.current) {
      chartRef.current = new Chart(canvas, {
        type: "pie",
        data: {
          labels,
          datasets: [{ data, backgroundColor: colors, borderColor: surfaceColor, borderWidth }],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          animation: { duration: 400, easing: "easeOutQuart" },
          onClick: (_evt, elements) => {
            if (!elements.length) return;
            const label = chartRef.current?.data.labels?.[elements[0].index];
            if (typeof label === "string") onToggleRef.current(label);
          },
          plugins: {
            legend: {
              position: "bottom",
              labels: { color: inkColor, font: { size: 11 }, boxWidth: 10, padding: 10 },
              onClick: (_evt, legendItem) => {
                if (typeof legendItem.text === "string") onToggleRef.current(legendItem.text);
              },
            },
            tooltip: { callbacks: { label: (ctx) => `${ctx.label}: ${fmtMin(Number(ctx.raw) * 60)}` } },
          },
        },
      });
    } else {
      const chart = chartRef.current;
      chart.data.labels = labels;
      chart.data.datasets[0].data = data;
      chart.data.datasets[0].backgroundColor = colors;
      chart.data.datasets[0].borderWidth = borderWidth;
      chart.update();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(entries), JSON.stringify(selectedSubjects)]);

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
