import React, { useEffect, useMemo, useState } from "react";
import LineCardGrid from "./components/LineCardGrid";

export default function App() {
  const [rows, setRows] = useState([]);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");
  const [compareVendors, setCompareVendors] = useState([]);

  useEffect(() => {
    fetch("/data/linecard.json")
      .then((r) => r.json())
      .then(setRows)
      .catch(() => setRows([]));
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
        r.vendor.toLowerCase().includes(q) ||
        r.category.toLowerCase().includes(q) ||
        (r.primaryOffering || "").toLowerCase().includes(q) ||
        (r.secondaryOffering || "").toLowerCase().includes(q) ||
        (r.tags || []).join(" ").toLowerCase().includes(q);

      return matchesCategory && matchesCompare && matchesQuery;
    });
  }, [rows, query, category, compareVendors]);

  function toggleCompareVendor(v) {
    setCompareVendors((prev) => {
      if (prev.includes(v)) return prev.filter((x) => x !== v);
      return [...prev, v].slice(0, 6);
    });
  }

  function reset() {
    setQuery("");
    setCategory("All");
    setCompareVendors([]);
  }

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <div>
          <h1 style={styles.h1}>Modern Infrastructure Line Card</h1>
          <p style={styles.sub}>
            Compare vendors by category and see TrustDigital’s primary + secondary offerings.
          </p>
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
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <button onClick={reset} style={styles.button}>Reset</button>
        </div>
      </header>

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

      <footer style={styles.footer}>
        <a href="https://www.trustdigital.net/contact" style={styles.cta}>
          Talk to an Engineer
        </a>
      </footer>
    </div>
  );
}

const styles = {
  page: { fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Arial", padding: 16 },
  header: { display: "flex", gap: 16, alignItems: "flex-end", justifyContent: "space-between", flexWrap: "wrap" },
  h1: { margin: 0, fontSize: 28 },
  sub: { margin: "6px 0 0", opacity: 0.75 },
  controls: { display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" },
  input: { padding: "10px 12px", borderRadius: 10, border: "1px solid #ccc", minWidth: 260 },
  select: { padding: "10px 12px", borderRadius: 10, border: "1px solid #ccc" },
  button: { padding: "10px 12px", borderRadius: 10, border: "1px solid #ccc", background: "white", cursor: "pointer" },
  compareBar: { marginTop: 12, padding: 12, border: "1px solid #eee", borderRadius: 14 },
  compareTitle: { fontWeight: 600, marginBottom: 8 },
  compareChips: { display: "flex", flexWrap: "wrap", gap: 8 },
  chip: { padding: "8px 10px", borderRadius: 999, border: "1px solid #ccc", background: "white", cursor: "pointer" },
  chipActive: { border: "1px solid #111", fontWeight: 700 },
  main: { marginTop: 16 },
  footer: { marginTop: 18, display: "flex", justifyContent: "flex-end" },
  cta: { display: "inline-block", padding: "12px 14px", borderRadius: 12, border: "1px solid #111", textDecoration: "none", color: "#111" }
};
