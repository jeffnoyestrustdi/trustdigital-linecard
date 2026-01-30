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
  const [enrichData, setEnrichData] = useState(null);
  const [enrichLoading, setEnrichLoading] = useState(false);
  const [selectedFields, setSelectedFields] = useState({});
  const [logoFile, setLogoFile] = useState(null);
  const [logoUrl, setLogoUrl] = useState("");
  const [uploadingLogo, setUploadingLogo] = useState(false);

  async function load() {
    try {
      const r = await fetch("/api/vendor");
      if (r.ok) {
        setItems(await r.json());
      }
    } catch (e) {
      console.error("Failed to load vendors:", e);
    }
  }

  useEffect(() => { load(); }, []);

  async function enrich() {
    if (!form.vendor.trim()) {
      alert("Please enter a vendor name first");
      return;
    }
    setEnrichLoading(true);
    setEnrichData(null);
    setSelectedFields({});
    try {
      const r = await fetch(`/api/enrich?name=${encodeURIComponent(form.vendor.trim())}`);
      if (!r.ok) {
        const err = await r.json().catch(() => ({ error: "Unknown error" }));
        alert(`Enrich failed: ${err.error || r.statusText}`);
        return;
      }
      const data = await r.json();
      setEnrichData(data);
      // Auto-select non-null fields with reasonable confidence
      const autoSelect = {};
      if (data.website) autoSelect.website = true;
      if (data.description) autoSelect.description = true;
      if (data.categories && data.categories.length) autoSelect.categories = true;
      if (data.tags && data.tags.length) autoSelect.tags = true;
      if (data.logo) autoSelect.logo = true;
      setSelectedFields(autoSelect);
    } catch (e) {
      alert("Enrich error: " + e.message);
    } finally {
      setEnrichLoading(false);
    }
  }

  function applyEnrichment() {
    if (!enrichData) return;
    const updates = { ...form };
    if (selectedFields.description && enrichData.description) {
      // Map description to primaryOffering if you prefer
      updates.primaryOffering = enrichData.description;
    }
    if (selectedFields.categories && enrichData.categories) {
      updates.category = enrichData.categories.join(", ");
    }
    if (selectedFields.tags && enrichData.tags) {
      updates.tags = enrichData.tags.join(", ");
    }
    setForm(updates);
    if (selectedFields.logo && enrichData.logo) {
      setLogoUrl(enrichData.logo);
    }
  }

  async function handleLogoUpload() {
    if (!logoFile) {
      alert("Please select a logo file");
      return;
    }
    setUploadingLogo(true);
    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = reader.result.split(",")[1];
        const r = await fetch("/api/upload-logo", {
          method: "POST",
          headers: { "content-type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ filename: logoFile.name, data: base64 })
        });
        if (!r.ok) {
          const err = await r.json().catch(() => ({ error: "Upload failed" }));
          alert("Upload failed: " + (err.error || r.statusText));
          return;
        }
        const result = await r.json();
        setLogoUrl(result.url);
        alert("Logo uploaded successfully!");
      };
      reader.readAsDataURL(logoFile);
    } catch (e) {
      alert("Upload error: " + e.message);
    } finally {
      setUploadingLogo(false);
    }
  }

  async function add() {
    const payload = {
      vendor: form.vendor.trim(),
      category: form.category.trim(),
      primaryOffering: form.primaryOffering.trim(),
      secondaryOffering: form.secondaryOffering.trim(),
      tags: form.tags.split(",").map(t => t.trim()).filter(Boolean),
      logo: logoUrl || undefined,
      enrich: enrichData || undefined
    };

    if (!payload.vendor) {
      alert("Vendor name is required");
      return;
    }

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
      setEnrichData(null);
      setSelectedFields({});
      setLogoFile(null);
      setLogoUrl("");
      load();
    }
  }

  async function remove(id) {
    if (!confirm("Delete this vendor entry?")) return;
    const r = await fetch(`/api/vendor?id=${encodeURIComponent(id)}`, {
      method: "DELETE",
      credentials: "include"
    });
    if (!r.ok) {
      const text = (await r.text()) || "(no body)";
      alert(`${r.status} ${r.statusText}: ${text}`);
    } else load();
  }

  return (
    <div style={{ padding: 20, maxWidth: 1200, margin: "0 auto" }}>
      <h1>Line Card Admin</h1>
      <p>Signed-in admins can enrich vendor data via GPT, upload logos, and manage entries.</p>

      <div style={{ display:"grid", gap:10, maxWidth: 700, marginBottom: 20 }}>
        <h2>Add Vendor Entry</h2>
        <input placeholder="Vendor Name*" value={form.vendor} onChange={e=>setForm({...form, vendor:e.target.value})}/>
        
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={enrich} disabled={enrichLoading || !form.vendor.trim()}>
            {enrichLoading ? "Enriching..." : "🔍 Enrich with GPT"}
          </button>
        </div>

        {enrichData && (
          <div style={{ border: "1px solid #ccc", padding: 10, borderRadius: 4, background: "#f9f9f9" }}>
            <h3>Enrichment Results (Confidence: {(enrichData.confidence * 100).toFixed(0)}%)</h3>
            {enrichData.notes && <p style={{ fontSize: "0.9em", color: "#666" }}>{enrichData.notes}</p>}
            
            <div style={{ display: "grid", gap: 8, fontSize: "0.95em" }}>
              {enrichData.website && (
                <label>
                  <input type="checkbox" checked={!!selectedFields.website} 
                    onChange={e => setSelectedFields({...selectedFields, website: e.target.checked})} />
                  {" "}Website: <a href={enrichData.website} target="_blank" rel="noopener noreferrer">{enrichData.website}</a>
                </label>
              )}
              {enrichData.description && (
                <label>
                  <input type="checkbox" checked={!!selectedFields.description} 
                    onChange={e => setSelectedFields({...selectedFields, description: e.target.checked})} />
                  {" "}Description: {enrichData.description}
                </label>
              )}
              {enrichData.categories && enrichData.categories.length > 0 && (
                <label>
                  <input type="checkbox" checked={!!selectedFields.categories} 
                    onChange={e => setSelectedFields({...selectedFields, categories: e.target.checked})} />
                  {" "}Categories: {enrichData.categories.join(", ")}
                </label>
              )}
              {enrichData.tags && enrichData.tags.length > 0 && (
                <label>
                  <input type="checkbox" checked={!!selectedFields.tags} 
                    onChange={e => setSelectedFields({...selectedFields, tags: e.target.checked})} />
                  {" "}Tags: {enrichData.tags.join(", ")}
                </label>
              )}
              {enrichData.logo && (
                <label>
                  <input type="checkbox" checked={!!selectedFields.logo} 
                    onChange={e => setSelectedFields({...selectedFields, logo: e.target.checked})} />
                  {" "}Logo: <img src={enrichData.logo} alt="logo" style={{ height: 24, verticalAlign: "middle" }} />
                </label>
              )}
              {enrichData.topProducts && enrichData.topProducts.length > 0 && (
                <div>
                  <strong>Top Products:</strong>
                  <ul style={{ margin: "4px 0" }}>
                    {enrichData.topProducts.map((p, i) => (
                      <li key={i}>{p.name}{p.url && ` - ${p.url}`}{p.description && ` (${p.description})`}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
            <button onClick={applyEnrichment} style={{ marginTop: 10 }}>
              Apply Selected Fields to Form
            </button>
          </div>
        )}

        <input placeholder="Category" value={form.category} onChange={e=>setForm({...form, category:e.target.value})}/>
        <input placeholder="Primary Offering" value={form.primaryOffering} onChange={e=>setForm({...form, primaryOffering:e.target.value})}/>
        <input placeholder="Secondary Offering" value={form.secondaryOffering} onChange={e=>setForm({...form, secondaryOffering:e.target.value})}/>
        <input placeholder="Tags (comma separated)" value={form.tags} onChange={e=>setForm({...form, tags:e.target.value})}/>

        <div style={{ border: "1px solid #ccc", padding: 10, borderRadius: 4 }}>
          <h3>Logo</h3>
          {logoUrl && <div><img src={logoUrl} alt="logo" style={{ maxHeight: 80, marginBottom: 10 }} /></div>}
          <input type="file" accept="image/*" onChange={e => setLogoFile(e.target.files[0])} />
          <button onClick={handleLogoUpload} disabled={uploadingLogo || !logoFile} style={{ marginLeft: 10 }}>
            {uploadingLogo ? "Uploading..." : "Upload Logo"}
          </button>
          {logoUrl && <div style={{ marginTop: 5, fontSize: "0.9em" }}>Current: {logoUrl}</div>}
        </div>

        <button onClick={add} style={{ padding: 10, fontSize: "1em", fontWeight: "bold", background: "#007bff", color: "#fff", border: "none", borderRadius: 4, cursor: "pointer" }}>
          Add Vendor Entry
        </button>
      </div>

      <hr style={{ margin:"30px 0" }} />

      <h2>Existing Entries</h2>
      <table width="100%" cellPadding="8" style={{ borderCollapse:"collapse", fontSize: "0.9em" }}>
        <thead>
          <tr style={{ background: "#f0f0f0" }}>
            <th align="left">Vendor</th>
            <th align="left">Category</th>
            <th align="left">Primary</th>
            <th align="left">Secondary</th>
            <th align="left">Logo</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {items.map(x => (
            <tr key={x.rowKey} style={{ borderTop:"1px solid #ddd" }}>
              <td>{x.vendor}</td>
              <td>{x.category}</td>
              <td>{x.primaryOffering}</td>
              <td>{x.secondaryOffering}</td>
              <td>{x.logoUrl ? <img src={x.logoUrl} alt="logo" style={{ maxHeight: 32 }} /> : "-"}</td>
              <td><button onClick={()=>remove(x.rowKey)}>Delete</button></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
