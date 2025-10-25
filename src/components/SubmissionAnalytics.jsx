import React, { useEffect, useMemo, useState } from "react";
import { format, parseISO, parse } from "date-fns";
import Chart from "chart.js/auto";
import {
  exportToXLSX,
  exportChartsPDF,
} from "../utils/exportUtils";

const API_BASE = process.env.REACT_APP_API_BASE || "http://localhost:5678";

// Parse ISO or "MM/DD/YYYY"
function parseSmart(d) {
  if (!d) return null;
  try {
    const iso = parseISO(d);
    if (!isNaN(iso)) return iso;
  } catch {}
  try {
    const mmdd = parse(d, "MM/dd/yyyy", new Date());
    if (!isNaN(mmdd)) return mmdd;
  } catch {}
  const fallback = new Date(d);
  return isNaN(fallback) ? null : fallback;
}

// Extract domain from email
function emailDomain(email) {
  if (!email || typeof email !== "string") return "(missing)";
  const at = email.indexOf("@");
  if (at === -1 || at === email.length - 1) return "(invalid)";
  return email.slice(at + 1).trim().toLowerCase();
}

export default function SubmissionsAnalytics() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [daysBack, setDaysBack] = useState(30);
  const [topN, setTopN] = useState(10);
  const [exportOpen, setExportOpen] = useState(false);

  // fetch submissions once
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/webhook/get-submissions`, {
          headers: { Accept: "application/json" },
        });
        const data = await res.json();
        setRows(Array.isArray(data) ? data : []);
      } catch (e) {
        console.error("Analytics fetch failed:", e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  /** ---------------- Daily series + 7-day average ---------------- */
  const { labels, counts, avg7 } = useMemo(() => {
    const countsMap = new Map(); // yyyy-MM-dd -> count
    const now = new Date();
    const start = new Date(now);
    start.setDate(now.getDate() - (Number(daysBack) || 30) + 1);

    rows.forEach((r) => {
      const dt = parseSmart(r.date);
      if (!dt || dt < start) return;
      const key = format(dt, "yyyy-MM-dd");
      countsMap.set(key, (countsMap.get(key) || 0) + 1);
    });

    const labels = [];
    const counts = [];
    for (let i = 0; i < (Number(daysBack) || 30); i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      const key = format(d, "yyyy-MM-dd");
      labels.push(format(d, "MM/dd"));
      counts.push(countsMap.get(key) || 0);
    }

    const avg7 = counts.map((_, i) => {
      const from = Math.max(0, i - 6);
      const slice = counts.slice(from, i + 1);
      const avg = slice.reduce((s, x) => s + x, 0) / slice.length;
      return Number(avg.toFixed(2));
    });

    return { labels, counts, avg7 };
  }, [rows, daysBack]);

  /** ---------------- Domain aggregation (Top N) ---------------- */
  const { domainLabels, domainCounts } = useMemo(() => {
    const map = new Map(); // domain -> count
    rows.forEach((r) => {
      const dom = emailDomain(r.email);
      map.set(dom, (map.get(dom) || 0) + 1);
    });

    const entries = Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
    const take = Math.max(1, Number(topN) || 7);
    const top = entries.slice(0, take);

    return {
      domainLabels: top.map(([d]) => d),
      domainCounts: top.map(([, c]) => c),
    };
  }, [rows, topN]);

  /** ---------------- Export helpers ---------------- */
  function buildDailyRows() {
    return labels.map((label, i) => ({
      Date: label,
      Submissions: counts[i] ?? 0,
      "7-day Avg": avg7[i] ?? 0,
    }));
  }

  function buildDomainRows() {
    return domainLabels.map((lab, i) => ({
      Domain: lab,
      Submissions: domainCounts[i] ?? 0,
    }));
  }

  // Excel: two sheets (Daily, Domains)
  function handleExportAnalyticsXLSX() {
    const sheets = [
      { name: "Daily", data: buildDailyRows() },
      { name: "Domains", data: buildDomainRows() },
    ];
    exportToXLSX(sheets, "Analytics.xlsx");
    setExportOpen(false);
  }

  // PDF: chart snapshots + summary
  function handleExportAnalyticsPDF() {
    const totalInRange = counts.reduce((s, x) => s + x, 0);
    const avgPerDay = counts.length ? (totalInRange / counts.length).toFixed(2) : "0.00";
    const topDom = domainLabels[0] ? `${domainLabels[0]} (${domainCounts[0]})` : "N/A";

    exportChartsPDF({
      title: "Submissions Analytics",
      summaryLines: [
        `Range: last ${daysBack} days`,
        `Total submissions: ${totalInRange}`,
        `Average per day: ${avgPerDay}`,
        `Top domain: ${topDom}`,
        `Generated on: ${format(new Date(), "MM/dd/yyyy HH:mm")}`,
      ],
      charts: [
        { canvasId: "submissionsChart", caption: "Daily submissions with 7-day rolling average" },
        { canvasId: "domainsChart", caption: `Top ${topN} email domains` },
      ],
      file: "Analytics.pdf",
    });
    setExportOpen(false);
  }

  /** ---------------- Chart.js instances ---------------- */
  // Daily chart: bar + line
  useEffect(() => {
    const canvas = document.getElementById("submissionsChart");
    if (!canvas) return;

    const chart = new Chart(canvas, {
      type: "bar",
      data: {
        labels,
        datasets: [
          { type: "bar", label: "Submissions", data: counts, borderWidth: 1 },
          { type: "line", label: "7-day Avg", data: avg7, tension: 0.3, borderWidth: 2, pointRadius: 0 },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: "index", intersect: false },
        plugins: {
          legend: { position: "bottom" },
          title: { display: true, text: "Submissions per Day", font: { size: 20, weight: "bold" }, color: "#111827" },
        },
        scales: {
          y: {
            beginAtZero: true,
            title: { display: true, text: "Count", font: { size: 14, weight: "600" }, color: "#374151" },
            ticks: { font: { size: 12 }, color: "#4b5563" },
          },
          x: {
            title: { display: true, text: "Date", font: { size: 14, weight: "600" }, color: "#374151" },
            ticks: { font: { size: 12 }, color: "#4b5563" },
          },
        },
      },
    });

    return () => chart.destroy();
  }, [labels, counts, avg7]);

  // Domains chart (horizontal bars)
  useEffect(() => {
    const canvas = document.getElementById("domainsChart");
    if (!canvas) return;

    const chart = new Chart(canvas, {
      type: "bar",
      data: {
        labels: domainLabels,
        datasets: [{ label: "Submissions (by domain)", data: domainCounts, borderWidth: 1 }],
      },
      options: {
        indexAxis: "y",
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          title: { display: true, text: `Top ${topN} Email Domains`, font: { size: 20, weight: "bold" }, color: "#111827" },
          tooltip: { mode: "nearest", intersect: true },
        },
        scales: {
          x: {
            beginAtZero: true,
            title: { display: true, text: "Count", font: { size: 14, weight: "600" }, color: "#374151" },
            ticks: { font: { size: 12 }, color: "#4b5563" },
          },
          y: {
            title: { display: true, text: "Domain", font: { size: 14, weight: "600" }, color: "#374151" },
            ticks: { font: { size: 12 }, color: "#4b5563" },
          },
        },
      },
    });

    return () => chart.destroy();
  }, [domainLabels, domainCounts, topN]);

  const hasData = labels.length > 0 || domainLabels.length > 0;

  return (
    <div className="container">
      <div className="card">
        {/* Centered title, export dropdown below aligned right */}
        <div className="card-header">
          <h2>Analytics</h2>

          <div
            className="export-dropdown"
            tabIndex={0}
            onBlur={() => setTimeout(() => setExportOpen(false), 0)}
          >
            <button
              type="button"
              className="btn export-btn"
              onClick={() => setExportOpen((o) => !o)}
            >
              Export ▾
            </button>

            {exportOpen && (
              <div className="export-menu">
                <button
                  type="button"
                  className="export-item"
                  onMouseDown={(e) => { e.preventDefault(); handleExportAnalyticsXLSX(); }}
                >
                  Excel (.xlsx)
                </button>
                <button
                  type="button"
                  className="export-item"
                  onMouseDown={(e) => { e.preventDefault(); handleExportAnalyticsPDF(); }}
                >
                  PDF (.pdf)
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="card-body">
          {/* Controls */}
          <div className="analytics-controls">
            <label>
              Range:
              <select value={daysBack} onChange={(e) => setDaysBack(e.target.value)}>
                <option value={7}>Last 7 days</option>
                <option value={14}>Last 14 days</option>
                <option value={30}>Last 30 days</option>
                <option value={60}>Last 60 days</option>
                <option value={90}>Last 90 days</option>
              </select>
            </label>

            <label>
              Top domains:
              <select value={topN} onChange={(e) => setTopN(e.target.value)}>
                <option value={5}>Top 5</option>
                <option value={7}>Top 7</option>
                <option value={10}>Top 10</option>
                <option value={15}>Top 15</option>
              </select>
            </label>
          </div>

          {loading ? (
            <p>Loading...</p>
          ) : hasData ? (
            <>
              {/* Daily */}
              <div className="chart-box">
                <canvas id="submissionsChart" />
              </div>

              {/* Domains */}
              <div className="chart-box" style={{ height: Math.max(220, domainLabels.length * 34) }}>
                <canvas id="domainsChart" />
              </div>
            </>
          ) : (
            <p className="error">No Analytics Found!</p>
          )}
        </div>
      </div>
    </div>
  );
}
