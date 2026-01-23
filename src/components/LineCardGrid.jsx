import React, { useMemo, useState } from "react";
import Popover from "./Popover";

export default function LineCardGrid({ rows }) {
  const [active, setActive] = useState(null);

  const categories = useMemo(() => {
    const set = new Set(rows.map((r) => r.category));
    return Array.from(set).sort();
  }, [rows]);

  const vendors = useMemo(() => {
    const set = new Set(rows.map((r) => r.vendor));
    return Array.from(set).sort();
  }, [rows]);

  const byKey = useMemo(() => {
    const map = new Map();
    for (const r of rows) map.set(`${r.vendor}__${r.category}`, r);
    return map;
  }, [rows]);

  const isMobile = typeof window !== "undefined" && window.innerWidth < 900;
  if (isMobile) {
    return (
      <div style={{ display: "grid", gap: 12 }}>
        {rows.map((r, i) => (
          <div key={i} style={{ border: "1px solid #eee", borderRadius: 14, padding: 12 }}>
            <div style={{ fontWeight: 800 }}>{r.vendor}</div>
            <div style={{ opacity: 0.8, marginBottom: 8 }}>{r.category}</div>
            <div><b>Primary:</b> {r.primaryOffering || "—"}</div>
            <div><b>Secondary:</b> {r.secondaryOffering || "—"}</div>
            {(r.tags?.length ?? 0) > 0 && (
              <div style={{ marginTop: 8, display: "flex", gap: 6, flexWrap: "wrap" }}>
                {r.tags.map((t) => (
                  <span key={t} style={{ border: "1px solid #ddd", borderRadius: 999, padding: "4px 8px", fontSize: 12 }}>
                    {t}
                  </span>
                ))}
              </div>
            )}
            {(r.links?.length ?? 0) > 0 && (
              <div style={{ marginTop: 10, display: "flex", gap: 10, flexWrap: "wrap" }}>
                {r.links.map((l) => (
                  <a key={l.url} href={l.url} style={{ textDecoration: "none" }}>
                    {l.title}
                  </a>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div style={styles.wrap}>
      <div style={styles.table}>
        <div style={{ ...styles.cell, ...styles.corner, position: "sticky", top: 0, left: 0, zIndex: 5 }}>
          Category \ Vendor
        </div>

        {vendors.map((v) => (
          <div key={v} style={{ ...styles.cell, ...styles.header, position: "sticky", top: 0, zIndex: 4 }}>
            {v}
          </div>
        ))}

        {categories.map((c) => (
          <React.Fragment key={c}>
            <div style={{ ...styles.cell, ...styles.side, position: "sticky", left: 0, zIndex: 3 }}>
              {c}
            </div>

            {vendors.map((v) => {
              const key = `${v}__${c}`;
              const item = byKey.get(key);
              const has = Boolean(item);

              return (
                <button
                  key={key}
                  style={{ ...styles.cell, ...styles.btn, ...(has ? styles.btnHas : styles.btnEmpty) }}
                  onClick={() => has && setActive({ vendor: v, category: c })}
                  disabled={!has}
                >
                  {has ? "View" : "—"}
                </button>
              );
            })}
          </React.Fragment>
        ))}
      </div>

      {active && (
        <Popover
          item={byKey.get(`${active.vendor}__${active.category}`)}
          onClose={() => setActive(null)}
        />
      )}
    </div>
  );
}

const styles = {
  wrap: { overflow: "auto", border: "1px solid #eee", borderRadius: 16 },
  table: {
    display: "grid",
    gridTemplateColumns: "220px repeat(auto-fit, minmax(180px, 1fr))",
    minWidth: 900
  },
  cell: {
    padding: 12,
    borderBottom: "1px solid #eee",
    borderRight: "1px solid #eee",
    background: "white"
  },
  corner: { fontWeight: 800 },
  header: { fontWeight: 800, textAlign: "center" },
  side: { fontWeight: 800 },
  btn: { cursor: "pointer", textAlign: "center", background: "white", border: "none", fontSize: 14 },
  btnHas: { background: "#fff" },
  btnEmpty: { opacity: 0.5, cursor: "default" }
};
