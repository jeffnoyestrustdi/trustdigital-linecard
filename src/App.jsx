// src/App.jsx
import React, { useEffect, useMemo, useState } from "react";
import LineCardGrid from "./components/LineCardGrid";
import Admin from "./pages/Admin"; // <-- create this file (or adjust path)

// Hide the big header when embedded in an iframe (Squarespace)
const isEmbedded = typeof window !== "undefined" && window.self !== window.top;

export default function App() {
  // ---- Simple routing (no router library) ----
  const path = typeof window !== "undefined" ? window.location.pathname : "/";
  const isAdminRoute = path.startsWith("/admin");

  // If /admin, render admin portal and skip the public UI entirely
  if (isAdminRoute) {
    return <Admin />;
  }

  // ---- Public Linecard UI (your existing app) ----
  const [rows, setRows] = useState([]);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");
  const [compareVendors, setCompareVendors] = useState([]);

  useEffect(() => {
    fetch("/api/linecard")
      .then((r) => r.json())
      .then(setRows)
      .catch((err) => {
        console.error("Failed to load /data/linecard.json", err);
        setRows([]);
      });
  }, []);

  const categories = useMemo(() => {
    const set = new Set(rows.map((r) => r.category));
    return ["All", ...Array.from(set).sort()];
  }, [rows]);

  const vendors = useMemo(() => {
    const set = new Set(rows.map((r) => r.vendor));
    return Array.from(set).sort();
  }, [rows]);

  const filteredRows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((r) => {
      const matchesCategory = category === "All" || r.category === category;
      const matchesCompare = compareVendors.length === 0 || compareVendors.includes(r.vendor);

      const matchesQuery =
        q === "" ||
        (r.vendor || "").toLowerCase().includes(q) ||
        (r.category || "").toLowerCase().includes(q) ||
        (r.primaryOffering || "").toLowerCase().includes(q) ||
        (r.secondaryOffering || "").toLowerCase().includes(q) ||
        (r.tags || []).join(" ").toLowerCase().includes(q);

      return matchesCategory && matchesCompare && matchesQuery;
    });
  }, [rows, query, category, compareVendors]);

  function toggleCompareVendor(v) {
    setCompareVendors((prev) => {
      if (prev.includes(v)) return prev.filter((x) => x !== v);
      return [...prev, v].slice(0, 6); // limit chip selection
    });
  }

  function reset() {
    setQuery("");
    setCategory("All");
    setCompareVendors([]);
  }

  return (
    <div style={styles.page}>
      {/* Header shows on the standalone site, hides when embedded in Squarespace */}
      {!isEmbedded && (
        <header style={styles.header}>
          <div style={styles.headerLeft}>
            {/* Optional logo: put your logo at /public/logo-trustdigital.svg or .png and uncomment */}
            {/*
            <img
              src="/logo-trustdigital.svg"
              alt="TrustDigital"
              style={{ height: 44, marginRight: 12 }}
            />
            */}
            <div>
              <h1 style={styles.h1}>Modern Infrastructure Line Card</h1>
              <p style={styles.sub}>
                Compare vendors by category and see TrustDigital’s primary + secondary offerings.
              </p>
            </div>
          </div>

          <div style={styles.controls}>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search vendors, categories, keywords…"
              style={styles.input}
            />
            <select value={category} onChange={(e) => setCategory(e.target.value)} style={styles.select}>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <button onClick={reset} style={styles.button}>
              Reset
            </button>
          </div>
        </header>
      )}

      {/* When embedded, we still want controls, but in a slimmer bar */}
      {isEmbedded && (
        <div style={styles.embedControls}>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search vendors, categories, keywords…"
            style={styles.input}
          />
          <select value={category} onChange={(e) => setCategory(e.target.value)} style={styles.select}>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <button onClick={reset} style={styles.button}>
            Reset
          </button>
        </div>
      )}

      <section style={styles.compareBar}>
        <div style={styles.compareTitle}>Compare vendors (optional):</div>
        <div style={styles.compareChips}>
          {vendors.map((v) => {
            const active = compareVendors.includes(v);
            return (
              <button
                key={v}
                onClick={() => toggleCompareVendor(v)}
                style={{ ...styles.chip, ...(active ? styles.chipActive : {}) }}
              >
                {v}
              </button>
            );
          })}
        </div>
      </section>

      <main style={styles.main}>
        <LineCardGrid rows={filteredRows} />
      </main>

      {/* Footer hides when embedded (Squarespace will provide site footer) */}
      {!isEmbedded && (
        <footer style={styles.footer}>
          <div style={{ opacity: 0.75 }}>© {new Date().getFullYear()} TrustDigital</div>
          <a href="https://www.trustdigital.net/contact" style={styles.cta}>
            Talk to an Engineer
          </a>
        </footer>
      )}
    </div>
  );
}

const TD_NAVY = "#0B1F33";
const TD_STEEL = "#1F3A52";
const TD_GRAY = "#F4F6F8";

const styles = {
  page: {
    fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Arial",
    background: TD_GRAY,
    minHeight: "100vh",
    padding: 16,
  },

  header: {
    display: "flex",
    gap: 16,
    alignItems: "flex-end",
    justifyContent: "space-between",
    flexWrap: "wrap",
    background: "white",
    padding: 16,
    borderBottom: `4px solid ${TD_NAVY}`,
    borderRadius: 16,
  },

  headerLeft: { display: "flex", alignItems: "center", gap: 12 },

  h1: { margin: 0, fontSize: 28, color: TD_NAVY },
  sub: { margin: "6px 0 0", opacity: 0.8 },

  embedControls: {
    display: "flex",
    gap: 8,
    alignItems: "center",
    flexWrap: "wrap",
    background: "white",
    padding: 12,
    borderRadius: 16,
    borderLeft: `6px solid ${TD_STEEL}`,
  },

  controls: { display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" },

  input: { padding: "10px 12px", borderRadius: 10, border: "1px solid #ccc", minWidth: 260 },
  select: { padding: "10px 12px", borderRadius: 10, border: "1px solid #ccc" },

  button: {
    padding: "10px 14px",
    borderRadius: 10,
    border: "none",
    background: TD_STEEL,
    color: "white",
    cursor: "pointer",
    fontWeight: 700,
  },

  compareBar: {
    marginTop: 12,
    padding: 12,
    borderRadius: 14,
    background: "white",
    borderLeft: `6px solid ${TD_STEEL}`,
  },

  compareTitle: { fontWeight: 700, marginBottom: 8, color: TD_NAVY },
  compareChips: { display: "flex", flexWrap: "wrap", gap: 8 },

  chip: {
    padding: "8px 12px",
    borderRadius: 999,
    border: `1px solid ${TD_STEEL}`,
    background: "white",
    cursor: "pointer",
    color: TD_NAVY,
  },

  chipActive: { background: TD_STEEL, color: "white" },

  main: { marginTop: 16 },

  footer: {
    marginTop: 18,
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    background: "white",
    borderRadius: 16,
    borderTop: `1px solid ${TD_STEEL}`,
  },

  cta: {
    display: "inline-block",
    padding: "12px 16px",
    borderRadius: 12,
    background: TD_NAVY,
    color: "white",
    textDecoration: "none",
    fontWeight: 800,
  },
};
