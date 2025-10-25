import React, { useEffect, useMemo, useState } from "react";
import {
  format,
  formatDistanceToNowStrict,
  isToday,
  parse,
  parseISO,
} from "date-fns";
import {
  exportToCSV,
  exportToXLSX,
  exportTablePDF,
} from "../utils/exportUtils";
import { useRole } from "../auth/useRole";

const API_BASE = process.env.REACT_APP_API_BASE || "http://localhost:5678";
const PAGE_SIZE = 10;

function parseDateSmart(d) {
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

export default function SubmissionsDashboard() {
  const [raw, setRaw] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterToday, setFilterToday] = useState(false);
  const [sortBy, setSortBy] = useState("date_desc"); // date_desc | date_asc | name_asc | name_desc
  const [page, setPage] = useState(1);
  const [exportOpen, setExportOpen] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [successMsg, setSuccessMsg] = useState("");  

  const { isAdmin } = useRole();

  async function fetchSubmissions() {
    try {
      
      const res = await fetch(`${API_BASE}/webhook/get-submissions`, {
        headers: { Accept: "application/json" },
      });
      const data = await res.json();
      setRaw(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Error fetching submissions:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchSubmissions();
  }, []);

  // Process: search, filter, sort
  const processed = useMemo(() => {
    let list = raw.map((r) => {
      const dateObj = parseDateSmart(r.date);
      return {
        ...r,
        _dateObj: dateObj,
        _name: (r.name || "").toLowerCase(),
        _email: (r.email || "").toLowerCase(),
      };
    });

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter((x) => x._name.includes(q) || x._email.includes(q));
    }

    if (filterToday) {
      list = list.filter((x) => x._dateObj && isToday(x._dateObj));
    }

    list.sort((a, b) => {
      switch (sortBy) {
        case "date_desc": {
          const ta = a._dateObj ? a._dateObj.getTime() : 0;
          const tb = b._dateObj ? b._dateObj.getTime() : 0;
          return tb - ta;
        }
        case "date_asc": {
          const ta = a._dateObj ? a._dateObj.getTime() : 0;
          const tb = b._dateObj ? b._dateObj.getTime() : 0;
          return ta - tb;
        }
        case "name_asc":
          return (a._name || "").localeCompare(b._name || "");
        case "name_desc":
          return (b._name || "").localeCompare(a._name || "");
        default:
          return 0;
      }
    });

    return list;
  }, [raw, search, filterToday, sortBy]);

  // Reset to page 1 whenever filters/search/sort change
  useEffect(() => {
    setPage(1);
  }, [search, filterToday, sortBy]);

  function normalizeForExport(list) {
    return list.map((s) => ({
      Name: s.name || "",
      Email: s.email || "",
      Date: s._dateObj ? format(s._dateObj, "MM/dd/yyyy") : "",
    }));
  }

  // Export ALL rows currently in processed (not just current page)
  function handleExportExcel() {
    const data = normalizeForExport(processed);
    exportToXLSX(
      [{ name: "Submissions Dashboard", data }],
      "Submissions_Dashboard.xlsx"
    );
    setExportOpen(false);
  }

  function handleExportPDF() {
    const data = normalizeForExport(processed);
    exportTablePDF({
      title: "Submissions Dashboard",
      columns: ["Name", "Email", "Date"],
      rows: data,
      file: "Submissions_Dashboard.pdf",
      summaryLines: [
        `Rows exported: ${data.length}`,
        `Generated on: ${format(new Date(), "MM/dd/yyyy HH:mm")}`,
      ],
    });
    setExportOpen(false);
  }

  // Pagination slice
  const total = processed.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const startIdx = (page - 1) * PAGE_SIZE;
  const visible = processed.slice(startIdx, startIdx + PAGE_SIZE);

  const goToPage = (p) => {
    const clamped = Math.min(Math.max(1, p), totalPages);
    setPage(clamped);
  };

  const renderPageButtons = () => {
    const windowSize = 5;
    const half = Math.floor(windowSize / 2);
    let start = Math.max(1, page - half);
    let end = Math.min(totalPages, start + windowSize - 1);
    start = Math.max(1, Math.min(start, end - windowSize + 1));

    const buttons = [];
    for (let p = start; p <= end; p++) {
      buttons.push(
        <button
          key={p}
          onClick={() => goToPage(p)}
          disabled={p === page}
          className={`btn btn-page ${p === page ? "btn-page--active" : ""}`}
        >
          {p}
        </button>
      );
    }
    return buttons;
  };

  async function handleDelete(id) {
    if (!id || deletingId) return alert("Missing record id!");
    console.log("handleDelete → id:", id);   
    const yes = window.confirm("Delete this record? This cannot be undone!");
    if (!yes) return;

    const prev = raw;
    setDeletingId(id);
    setRaw((r) => r.filter((x) => x.id !== id));

    try {
      const res = await fetch(
        `${API_BASE}/webhook/delete-submission?id=${encodeURIComponent(id)}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      const payload = await res.json().catch(() => ({}));
      if (!res.ok || payload?.ok === false) {
        setRaw(prev); // rollback
        const msg = payload?.error || res.statusText || "Delete failed";
        alert(msg);
      } else {
        // await fetchSubmissions();  
        setSuccessMsg("Record Deleted Successfully!");
        setTimeout(() => setSuccessMsg(""), 2500);
      }
    } catch (e) {
      setRaw(prev); // rollback
      alert("Network error during delete!");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="container">
      <div className="card">
        {/* Header with title left, export on right */}
        <div className="card-header">
          <h2>Submissions Dashboard</h2>

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
                  onMouseDown={(e) => {
                    e.preventDefault();
                    handleExportExcel();
                  }}
                >
                  Excel (.xlsx)
                </button>
                <button
                  type="button"
                  className="export-item"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    handleExportPDF();
                  }}
                >
                  PDF (.pdf)
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="card-body">
          {successMsg && (
            <div className="alert success" role="status">
              {successMsg}
            </div>
          )}

          <div className="controls grid">
            <input
              className="input"
              type="text"
              placeholder="Search name or email…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />

            <select
              className="select"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
            >
              <option value="date_desc">Sort: Newest first</option>
              <option value="date_asc">Sort: Oldest first</option>
              <option value="name_asc">Sort: Name A → Z</option>
              <option value="name_desc">Sort: Name Z → A</option>
            </select>

            <label className="checkbox">
              <input
                type="checkbox"
                checked={filterToday}
                onChange={(e) => setFilterToday(e.target.checked)}
              />
              <span style={{ fontSize: "16px" }}>Today only</span>
            </label>
          </div>

          {/* Table */}
          {loading ? (
            <p>Loading...</p>
          ) : visible.length > 0 ? (
            <>
              <table className="table">
                <thead>
                  <tr>
                    <th>Full Name</th>
                    <th>Email</th>
                    <th>Date Submitted</th>
                    <th>When</th>
                    {/* <th>Actions</th> */}
                    {isAdmin && <th>Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {visible.map((s) => (
                    <tr key={s.id || `${s.name}-${s.email}`}>
                      <td>{s.name}</td>
                      <td>{s.email}</td>
                      <td>
                        {s._dateObj ? format(s._dateObj, "MM/dd/yyyy") : "N/A"}
                      </td>
                      <td className="nowrap">
                        {s._dateObj
                          ? `${formatDistanceToNowStrict(s._dateObj)} ago`
                          : ""}
                      </td>
                      {isAdmin && (
                      <td>
                        <button
                          className={`btn btn-danger ${deletingId === s.id ? "is-loading" : ""}`}
                          disabled={deletingId === s.id}
                          onClick={() => handleDelete(s.id)}
                          title="Delete this record"
                        >
                          {deletingId === s.id ? (
                            <>
                              <span className="spinner" aria-hidden="true" />
                              Deleting…
                            </>
                          ) : (
                            "Delete"
                          )}
                        </button>
                      </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Pagination */}
              <div className="pagination">
                <button
                  onClick={() => goToPage(page - 1)}
                  disabled={page <= 1}
                  className="btn"
                >
                  ◀ Prev
                </button>

                {renderPageButtons()}

                <button
                  onClick={() => goToPage(page + 1)}
                  disabled={page >= totalPages}
                  className="btn"
                >
                  Next ▶
                </button>

                <span className="pagination__meta">
                  Page {page} of {totalPages} • {total} total
                </span>
              </div>
            </>
          ) : (
            <p className="error">No Submissions Found!</p>
          )}
        </div>
      </div>
    </div>
  );
}
