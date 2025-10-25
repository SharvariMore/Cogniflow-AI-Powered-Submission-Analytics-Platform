import { saveAs } from "file-saver"; //trigger a download in the browser
import * as XLSX from "xlsx"; //converts JS objects into Excel/CSV
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable"; //generate PDF docs with text, tables, and images

/** ---------- CSV & Excel ---------- **/

export function exportToCSV(rows, filename = "export.csv") {
  const sheet = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, sheet, "Data");
  const csv = XLSX.utils.sheet_to_csv(sheet);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  saveAs(blob, filename);
}

export function exportToXLSX(sheets, filename = "export.xlsx") {
  // sheets: [{ name, data (array of objects) }]
  const wb = XLSX.utils.book_new();
  sheets.forEach(({ name, data }) => {
    const ws = XLSX.utils.json_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, name.slice(0, 31)); // Excel tab limit
  });
  const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  saveAs(new Blob([wbout], { type: "application/octet-stream" }), filename);
}

/** ---------- PDF (tables + images) ---------- **/

export function exportTablePDF({
  title = "Report",
  columns = [],
  rows = [],
  file = "report.pdf",
  summaryLines = [],
}) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const marginX = 40;
  let y = 40;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text(title, marginX, y);
  y += 18;

  // Summary bullets
  if (summaryLines?.length) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    summaryLines.forEach((line) => {
      doc.text(`• ${line}`, marginX, y);
      y += 14;
    });
    y += 8;
  }

  // Table
  autoTable(doc, {
    startY: y,
    head: [columns],
    body: rows.map((r) => columns.map((c) => r[c] ?? "")),
    styles: { fontSize: 10 },
    headStyles: { fillColor: [79, 70, 229], textColor: 255 },
    theme: "striped",
    margin: { left: marginX, right: marginX },
  });

  doc.save(file);
}

export function exportChartsPDF({
  title = "Analytics Report",
  charts = [],
  summaryLines = [],
  file = "analytics.pdf",
}) {
  // charts: [{ canvasId, caption }]
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const marginX = 40;
  let y = 40;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text(title, marginX, y);
  y += 18;

  // Summary bullets
  if (summaryLines?.length) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    summaryLines.forEach((line) => {
      doc.text(`• ${line}`, marginX, y);
      y += 14;
    });
    y += 8;
  }

  // Add charts (capture current canvas as PNG)
  charts.forEach((ch, i) => {
    const el = document.getElementById(ch.canvasId);
    if (!el) return;
    const dataUrl = el.toDataURL("image/png", 1.0);

    // Fit width; keep ~ aspect ratio using a fixed height
    const imgW = pageW - marginX * 2;
    const imgH = 260;

    if (y + imgH + 60 > doc.internal.pageSize.getHeight()) {
      doc.addPage();
      y = 40;
    }

    doc.addImage(dataUrl, "PNG", marginX, y, imgW, imgH);
    y += imgH + 18;

    if (ch.caption) {
      doc.setFont("helvetica", "italic");
      doc.setFontSize(10);
      doc.text(ch.caption, marginX, y);
      y += 26;
    }
  });

  doc.save(file);
}
