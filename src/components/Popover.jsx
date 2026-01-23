import React from "react";

export default function Popover({ item, onClose }) {
  if (!item) return null;

  return (
    <div style={styles.backdrop} onClick={onClose}>
      <div style={styles.panel} onClick={(e) => e.stopPropagation()}>
        <div style={styles.top}>
          <div>
            <div style={styles.title}>{item.vendor}</div>
            <div style={styles.subtitle}>{item.category}</div>
          </div>
          <button onClick={onClose} style={styles.close}>✕</button>
        </div>

        <div style={styles.section}>
          <div style={styles.label}>Primary</div>
          <div>{item.primaryOffering || "—"}</div>
        </div>

        <div style={styles.section}>
          <div style={styles.label}>Secondary</div>
          <div>{item.secondaryOffering || "—"}</div>
        </div>

        {(item.tags?.length ?? 0) > 0 && (
          <div style={styles.section}>
            <div style={styles.label}>Tags</div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {item.tags.map((t) => (
                <span key={t} style={styles.tag}>{t}</span>
              ))}
            </div>
          </div>
        )}

        {(item.links?.length ?? 0) > 0 && (
          <div style={styles.section}>
            <div style={styles.label}>Links</div>
            <div style={{ display: "grid", gap: 8 }}>
              {item.links.map((l) => (
                <a key={l.url} href={l.url} style={styles.link}>
                  {l.title}
                </a>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const styles = {
  backdrop: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,.45)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    zIndex: 50
  },
  panel: {
    width: "min(640px, 100%)",
    background: "white",
    borderRadius: 16,
    padding: 16,
    boxShadow: "0 20px 60px rgba(0,0,0,.2)"
  },
  top: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 },
  title: { fontWeight: 900, fontSize: 22 },
  subtitle: { opacity: 0.75, marginTop: 2 },
  close: { border: "1px solid #ddd", background: "white", borderRadius: 10, padding: "6px 10px", cursor: "pointer" },
  section: { marginTop: 12, paddingTop: 12, borderTop: "1px solid #eee" },
  label: { fontWeight: 800, marginBottom: 6 },
  tag: { border: "1px solid #ddd", borderRadius: 999, padding: "4px 10px", fontSize: 12 },
  link: { textDecoration: "none" }
};
