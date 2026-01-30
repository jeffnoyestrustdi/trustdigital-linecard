import React, { useEffect, useState } from "react";

export default function Admin() {
  const [items, setItems] = useState([]);
  const [form, setForm] = useState({
    vendor: "",
    category: "",
    primaryOffering: "",
    secondaryOffering: "",
    tags: ""
  });

  const [enriching, setEnriching] = useState(false);
  const [logoPreview, setLogoPreview] = useState(null);
  const [enrichData, setEnrichData] = useState(null);
  const [selectedEnrich, setSelectedEnrich] = useState({
    website: false,
    logo: false,
    description: false,
    categories: false,
    tags: false,
    topProducts: {}
  });
  const [selectAll, setSelectAll] = useState(false);

  const [fileToUpload, setFileToUpload] = useState(null);
  const [localPreviewUrl, setLocalPreviewUrl] = useState(null);
  const [uploading, setUploading] = useState(false);

  async function load() {
    const r = await fetch("/api/linecard");
    setItems(await r.json());
  }

  useEffect(() => { load(); }, []);

  function initSelections(parsed) {
    if (!parsed) return;
    const confident = (parsed.confidence || 0) >= 0.6;
    setSelectedEnrich({
      website: !!parsed.website && confident,
      logo: !!parsed.logo && confident,
      description: !!parsed.description && confident,
      categories: Array.isArray(parsed.categories) && parsed.categories.length > 0 && confident,
      tags: Array.isArray(parsed.tags) && parsed.tags.length > 0 && confident,
      topProducts: (parsed.topProducts || []).reduce((acc, _p, i) => { acc[i] = confident; return acc; }, {})
    });
    setSelectAll(confident);
    if (parsed.logo) setLogoPreview(parsed.logo);
  }

  async function enrich() {
    const name = (form.vendor || "").trim();
    if (!name) { alert("Enter a vendor/manufacturer name first."); return; }
    setEnriching(true);
    setEnrichData(null);
    setLogoPreview(null);
    setSelectedEnrich({
      website: false, logo: false, description: false, categories: false, tags: false, topProducts: {}
    });
    setSelectAll(false);

    try {
      const r = await fetch(`/api/enrich?name=${encodeURIComponent(name)}`, { method: "GET" });
      if (!r.ok) { const text = await r.text(); alert(`Enrich failed: ${r.status} ${r.statusText}: ${text}`); setEnriching(false); return; }
      const j = await r.json();
      setEnrichData(j);
      initSelections(j);

      setForm(f => ({
        vendor: f.vendor || name,
        category: f.category || (j.categories && j.categories[0]) || f.category,
        primaryOffering: f.primaryOffering || (j.topProducts && j.topProducts[0] && j.topProducts[0].name) || f.primaryOffering,
        secondaryOffering: f.secondaryOffering || "",
        tags: f.tags || (j.tags ? j.tags.join(", ") : "")
      }));
    } catch (e) {
      alert("Enrich error: " + String(e));
    } finally { setEnriching(false); }
  }

  function onFileChange(e) {
    const f = e.target.files && e.target.files[0];
    if (!f) return;
    setFileToUpload(f);
    const url = URL.createObjectURL(f);
    setLocalPreviewUrl(url);
  }

  async function uploadLogo() {
    if (!fileToUpload) { alert("Choose a file first."); return; }
    setUploading(true);
    try {
      const reader = await new Promise((resolve, reject) => {
        const r = new FileReader();
        r.onload = () => resolve(r.result);
        r.onerror = () => reject(r.error);
        r.readAsDataURL(fileToUpload);
      });
      const parts = reader.split(",");
      if (parts.length !== 2) throw new Error("Unexpected data URL from FileReader");
      const base64 = parts[1];
      const payload = { filename: fileToUpload.name, data: base64 };
      const r = await fetch("/api/upload-logo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        credentials: "include"
      });
      if (!r.ok) { const txt = await r.text(); alert(`Upload failed: ${r.status} ${r.statusText}: ${txt}`); setUploading(false); return; }
      const j = await r.json();
      if (j.url) {
        setLogoPreview(j.url);
        setSelectedEnrich(s => ({ ...s, logo: true }));
        setFileToUpload(null);
        if (localPreviewUrl) { URL.revokeObjectURL(localPreviewUrl); setLocalPreviewUrl(null); }
      } else {
        alert("Upload returned no url");
      }
    } catch (e) {
      alert("Upload error: " + String(e));
    } finally { setUploading(false); }
  }

  function toggleSelectAll(val) {
    setSelectAll(val);
    if (!enrichData) return;
    const tp = (enrichData.topProducts || []).reduce((acc, _p, i) => { acc[i] = val; return acc; }, {});
    setSelectedEnrich({
      website: val && !!enrichData.website,
      logo: val && !!enrichData.logo,
      description: val && !!enrichData.description,
      categories: val && Array.isArray(enrichData.categories) && enrichData.categories.length > 0,
      tags: val && Array.isArray(enrichData.tags) && enrichData.tags.length > 0,
      topProducts: tp
    });
  }

  function toggleField(field) { setSelectedEnrich(s => ({ ...s, [field]: !s[field] })); }
  function toggleProduct(index) { setSelectedEnrich(s => ({ ...s, topProducts: { ...s.topProducts, [index]: !s.topProducts?.[index] } })); }

  async function add() {
    let enrich = null;
    if (enrichData) {
      enrich = {};
      if (selectedEnrich.website && enrichData.website) enrich.website = enrichData.website;
      if (selectedEnrich.description && enrichData.description) enrich.description = enrichData.description;
      if (selectedEnrich.categories && enrichData.categories) enrich.categories = enrichData.categories;
      if (selectedEnrich.tags && enrichData.tags) enrich.tags = enrichData.tags;
      const selectedProducts = (enrichData.topProducts || [])
        .map((p, i) => ({ i, p })).filter(x => selectedEnrich.topProducts && selectedEnrich.topProducts[x.i]).map(x => x.p);
      if (selectedProducts.length) enrich.topProducts = selectedProducts;
    }

    const payload = {
      vendor: form.vendor.trim(),
      category: form.category.trim(),
      primaryOffering: form.primaryOffering.trim(),
      secondaryOffering: form.secondaryOffering.trim(),
      tags: form.tags.split(",").map(t => t.trim()).filter(Boolean),
      enrich: enrich || null,
      logo: (selectedEnrich.logo && logoPreview) ? logoPreview : null
    };

    const r = await fetch("/api/vendor", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
      credentials: "include"
    });

    if (!r.ok) {
      const text = (await r.text()) || "(no body)";
      alert(`${r.status} ${r.statusText}: ${text}`);
    } else {
      setForm({ vendor:"", category:"", primaryOffering:"", secondaryOffering:"", tags:"" });
      setEnrichData(null); setLogoPreview(null);
      setSelectedEnrich({ website:false, logo:false, description:false, categories:false, tags:false, topProducts:{} });
      setSelectAll(false);
      load();
    }
  }

  async function remove(id) {
    const r = await fetch(`/api/vendor?id=${encodeURIComponent(id)}`, {
      method: "DELETE",
      credentials: "include"
    });
    if (!r.ok) { const text = (await r.text()) || "(no body)"; alert(`${r.status} ${r.statusText}: ${text}`); }
    else load();
  }

  return (
    <div style={{ padding: 20 }}>
      <h1>Line Card Admin</h1>
      <p>Signed-in users only. Admin actions restricted by allowlist.</p>

      <div style={{ display:"grid", gap:10, maxWidth: 900 }}>
        <div style={{ display: "flex", gap: 10 }}>
          <input placeholder="Vendor / Manufacturer" value={form.vendor} onChange={e=>setForm({...form, vendor:e.target.value})} style={{ flex: 1 }}/>
          <button onClick={enrich} disabled={enriching}>{enriching ? "Enriching..." : "Enrich"}</button>
        </div>

        {enrichData && (
          <div style={{ border: "1px solid #e6e6e6", padding: 12, borderRadius: 6, background: "#fff" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <strong>Enrichment preview</strong>
              <label style={{ fontSize: 13 }}>
                <input type="checkbox" checked={selectAll} onChange={e => toggleSelectAll(e.target.checked)} /> Select all
              </label>
            </div>

            <div style={{ display: "flex", gap: 12, marginTop: 8, alignItems: "center" }}>
              {logoPreview && (
                <img src={logoPreview} alt="logo" style={{ height: 56, width: "auto", objectFit: "contain", border: "1px solid #eee", padding: 6 }} onError={() => setLogoPreview(null)}/>
              )}
              <div style={{ fontSize: 13, color: "#333" }}>
                <div>
                  <label><input type="checkbox" checked={!!selectedEnrich.website} onChange={() => toggleField("website")} /> Website:</label>
                  <span style={{ marginLeft: 8 }}>{enrichData.website || "(none)"}</span>
                </div>
                <div style={{ marginTop: 6 }}>
                  <label><input type="checkbox" checked={!!selectedEnrich.description} onChange={() => toggleField("description")} /> Description:</label>
                  <div style={{ marginLeft: 20, marginTop: 4, color: "#444" }}>{enrichData.description || "(none)"}</div>
                </div>
              </div>
            </div>

            <div style={{ marginTop: 10 }}>
              <label><input type="checkbox" checked={!!selectedEnrich.categories} onChange={() => toggleField("categories")} /> Categories:</label>
              <div style={{ marginLeft: 20 }}>{(enrichData.categories || []).map(c => <span key={c} style={{ display: "inline-block", marginRight: 8, background:"#f2f2f2", padding:"2px 8px", borderRadius:4 }}>{c}</span>)}</div>
            </div>

            <div style={{ marginTop: 8 }}>
              <label><input type="checkbox" checked={!!selectedEnrich.tags} onChange={() => toggleField("tags")} /> Tags:</label>
              <div style={{ marginLeft: 20 }}>{(enrichData.tags || []).join(", ")}</div>
            </div>

            <div style={{ marginTop: 10 }}>
              <div style={{ fontWeight: 600 }}>Top Products</div>
              {(enrichData.topProducts || []).length === 0 && <div style={{ marginLeft: 6, color: "#666" }}>(none)</div>}
              <ul style={{ marginTop: 6 }}>
                {(enrichData.topProducts || []).map((p, i) => (
                  <li key={i} style={{ marginBottom: 6 }}>
                    <label>
                      <input type="checkbox" checked={!!selectedEnrich.topProducts?.[i]} onChange={() => toggleProduct(i)} />{" "}
                      <strong>{p.name}</strong>
                    </label>
                    {p.url && <span style={{ marginLeft: 8, color: "#0066cc" }}>({p.url})</span>}
                    {p.description && <div style={{ marginLeft: 24, color: "#444", fontSize: 13 }}>{p.description}</div>}
                  </li>
                ))}
              </ul>
            </div>

            <div style={{ marginTop: 8, fontSize: 12, color: "#666" }}>
              Confidence: {(enrichData.confidence || 0).toFixed(2)} — Sources: {(enrichData.sources || []).join(", ") || "(none)"}
            </div>
          </div>
        )}

        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <input type="file" accept="image/*" onChange={onFileChange} />
          <button onClick={uploadLogo} disabled={!fileToUpload || uploading}>{uploading ? "Uploading..." : "Upload Logo"}</button>
          {localPreviewUrl && <img src={localPreviewUrl} alt="local preview" style={{ height: 48 }} />}
        </div>

        <input placeholder="Category" value={form.category} onChange={e=>setForm({...form, category:e.target.value})}/>
        <input placeholder="Primary Offering" value={form.primaryOffering} onChange={e=>setForm({...form, primaryOffering:e.target.value})}/>
        <input placeholder="Secondary Offering" value={form.secondaryOffering} onChange={e=>setForm({...form, secondaryOffering:e.target.value})}/>
        <input placeholder="Tags (comma separated)" value={form.tags} onChange={e=>setForm({...form, tags:e.target.value})}/>

        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={add}>Add Vendor Entry</button>
          <button onClick={() => { setEnrichData(null); setLogoPreview(null); setSelectedEnrich({ website:false, logo:false, description:false, categories:false, tags:false, topProducts:{} }); }}>Clear Enrichment</button>
        </div>
      </div>

      <hr style={{ margin:"20px 0" }} />

      <table width="100%" cellPadding="8" style={{ borderCollapse:"collapse" }}>
        <thead>
          <tr>
            <th align="left">Vendor</th>
            <th align="left">Category</th>
            <th align="left">Primary</th>
            <th align="left">Secondary</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {items.map(x => (
            <tr key={x.id} style={{ borderTop:"1px solid #ddd" }}>
              <td>{x.vendor}</td>
              <td>{x.category}</td>
              <td>{x.primaryOffering}</td>
              <td>{x.secondaryOffering}</td>
              <td><button onClick={()=>remove(x.id)}>Delete</button></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
