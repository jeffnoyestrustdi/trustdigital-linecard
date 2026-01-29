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

  // Enrichment state
  const [enrichName, setEnrichName] = useState("");
  const [enriching, setEnriching] = useState(false);
  const [enrichResult, setEnrichResult] = useState(null);
  const [selectedFields, setSelectedFields] = useState({
    website: false,
    domain: false,
    logo: false,
    description: false,
    topProducts: false,
    categories: false,
    tags: false
  });

  // Logo upload state
  const [logoFile, setLogoFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadedLogoUrl, setUploadedLogoUrl] = useState("");

  async function load() {
    const r = await fetch("/api/linecard");
    setItems(await r.json());
  }

  useEffect(() => { load(); }, []);

  async function enrich() {
    if (!enrichName.trim()) {
      alert("Please enter a manufacturer name to enrich");
      return;
    }
    setEnriching(true);
    setEnrichResult(null);
    setSelectedFields({ website: false, domain: false, logo: false, description: false, topProducts: false, categories: false, tags: false });
    try {
      const r = await fetch(`/api/enrich?name=${encodeURIComponent(enrichName.trim())}`, { credentials: "include" });
      if (!r.ok) {
        const text = await r.text();
        alert(`Enrichment failed: ${r.status} ${r.statusText}\n${text}`);
      } else {
        const data = await r.json();
        setEnrichResult(data);
        // Pre-populate form vendor name if empty
        if (!form.vendor) {
          setForm({ ...form, vendor: enrichName.trim() });
        }
      }
    } catch (err) {
      alert("Enrichment error: " + err.message);
    } finally {
      setEnriching(false);
    }
  }

  async function uploadLogo() {
    if (!logoFile) {
      alert("Please select a logo file");
      return;
    }
    setUploading(true);
    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const base64 = e.target.result.split(",")[1]; // Remove data:image/...;base64, prefix
        const payload = { filename: logoFile.name, data: base64 };
        const r = await fetch("/api/upload-logo", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(payload),
          credentials: "include"
        });
        if (!r.ok) {
          const text = await r.text();
          alert(`Logo upload failed: ${r.status} ${r.statusText}\n${text}`);
        } else {
          const data = await r.json();
          setUploadedLogoUrl(data.url);
          alert(`Logo uploaded successfully: ${data.url}`);
        }
        setUploading(false);
      };
      reader.readAsDataURL(logoFile);
    } catch (err) {
      alert("Logo upload error: " + err.message);
      setUploading(false);
    }
  }

  function toggleField(field) {
    setSelectedFields({ ...selectedFields, [field]: !selectedFields[field] });
  }

  async function add() {
    const payload = {
      vendor: form.vendor.trim(),
      category: form.category.trim(),
      primaryOffering: form.primaryOffering.trim(),
      secondaryOffering: form.secondaryOffering.trim(),
      tags: form.tags.split(",").map(t => t.trim()).filter(Boolean)
    };

    // Add selected enrichment fields
    if (enrichResult) {
      const enrich = {};
      Object.keys(selectedFields).forEach(key => {
        if (selectedFields[key] && enrichResult[key] !== undefined) {
          enrich[key] = enrichResult[key];
        }
      });
      if (Object.keys(enrich).length > 0) {
        payload.enrich = enrich;
      }
    }

    // Add logo URL if uploaded or selected from enrichment
    if (uploadedLogoUrl) {
      payload.logo = uploadedLogoUrl;
    } else if (selectedFields.logo && enrichResult?.logo) {
      payload.logo = enrichResult.logo;
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
      setEnrichResult(null);
      setUploadedLogoUrl("");
      setLogoFile(null);
      setEnrichName("");
      setSelectedFields({ website: false, domain: false, logo: false, description: false, topProducts: false, categories: false, tags: false });
      load();
    }
  }

  async function remove(id) {
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
      <p>Signed-in users only. Admin actions restricted by allowlist.</p>

      {/* Enrichment Section */}
      <div style={{ border: "2px solid #007bff", borderRadius: 8, padding: 20, marginBottom: 20, backgroundColor: "#f8f9fa" }}>
        <h2>Step 1: Enrich Manufacturer (Optional)</h2>
        <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 15 }}>
          <input
            placeholder="Manufacturer name to enrich"
            value={enrichName}
            onChange={e => setEnrichName(e.target.value)}
            style={{ flex: 1, padding: 8, fontSize: 16 }}
          />
          <button onClick={enrich} disabled={enriching} style={{ padding: "8px 16px", fontSize: 16 }}>
            {enriching ? "Enriching..." : "Enrich with GPT"}
          </button>
        </div>

        {enrichResult && (
          <div style={{ border: "1px solid #ccc", borderRadius: 4, padding: 15, backgroundColor: "white" }}>
            <h3>Enrichment Results (Select fields to include):</h3>
            <div style={{ display: "grid", gap: 10 }}>
              {enrichResult.website && (
                <label style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                  <input type="checkbox" checked={selectedFields.website} onChange={() => toggleField("website")} />
                  <div>
                    <strong>Website:</strong> <a href={enrichResult.website} target="_blank" rel="noopener noreferrer">{enrichResult.website}</a>
                  </div>
                </label>
              )}
              {enrichResult.domain && (
                <label style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                  <input type="checkbox" checked={selectedFields.domain} onChange={() => toggleField("domain")} />
                  <div><strong>Domain:</strong> {enrichResult.domain}</div>
                </label>
              )}
              {enrichResult.logo && (
                <label style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                  <input type="checkbox" checked={selectedFields.logo} onChange={() => toggleField("logo")} />
                  <div>
                    <strong>Logo:</strong> <img src={enrichResult.logo} alt="logo" style={{ maxWidth: 64, maxHeight: 64, marginLeft: 8 }} />
                    <div style={{ fontSize: 12, color: "#666" }}>{enrichResult.logo}</div>
                  </div>
                </label>
              )}
              {enrichResult.description && (
                <label style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                  <input type="checkbox" checked={selectedFields.description} onChange={() => toggleField("description")} />
                  <div><strong>Description:</strong> {enrichResult.description}</div>
                </label>
              )}
              {enrichResult.topProducts && enrichResult.topProducts.length > 0 && (
                <label style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                  <input type="checkbox" checked={selectedFields.topProducts} onChange={() => toggleField("topProducts")} />
                  <div>
                    <strong>Top Products:</strong>
                    <ul style={{ margin: "5px 0", paddingLeft: 20 }}>
                      {enrichResult.topProducts.map((p, i) => (
                        <li key={i}>
                          {p.name} {p.url && <a href={p.url} target="_blank" rel="noopener noreferrer">(link)</a>}
                          {p.description && ` - ${p.description}`}
                        </li>
                      ))}
                    </ul>
                  </div>
                </label>
              )}
              {enrichResult.categories && enrichResult.categories.length > 0 && (
                <label style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                  <input type="checkbox" checked={selectedFields.categories} onChange={() => toggleField("categories")} />
                  <div><strong>Categories:</strong> {enrichResult.categories.join(", ")}</div>
                </label>
              )}
              {enrichResult.tags && enrichResult.tags.length > 0 && (
                <label style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                  <input type="checkbox" checked={selectedFields.tags} onChange={() => toggleField("tags")} />
                  <div><strong>Tags:</strong> {enrichResult.tags.join(", ")}</div>
                </label>
              )}
              {enrichResult.confidence !== undefined && (
                <div><strong>Confidence:</strong> {(enrichResult.confidence * 100).toFixed(0)}%</div>
              )}
              {enrichResult.notes && (
                <div><strong>Notes:</strong> {enrichResult.notes}</div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Logo Upload Section */}
      <div style={{ border: "2px solid #28a745", borderRadius: 8, padding: 20, marginBottom: 20, backgroundColor: "#f8f9fa" }}>
        <h2>Step 2: Upload Logo (Optional)</h2>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <input
            type="file"
            accept="image/*"
            onChange={e => setLogoFile(e.target.files[0])}
            style={{ flex: 1 }}
          />
          <button onClick={uploadLogo} disabled={uploading || !logoFile} style={{ padding: "8px 16px", fontSize: 16 }}>
            {uploading ? "Uploading..." : "Upload Logo"}
          </button>
        </div>
        {uploadedLogoUrl && (
          <div style={{ marginTop: 10 }}>
            <strong>Uploaded Logo URL:</strong> <a href={uploadedLogoUrl} target="_blank" rel="noopener noreferrer">{uploadedLogoUrl}</a>
            <br />
            <img src={uploadedLogoUrl} alt="uploaded logo" style={{ maxWidth: 128, maxHeight: 128, marginTop: 8 }} />
          </div>
        )}
      </div>

      {/* Vendor Form */}
      <div style={{ border: "2px solid #6c757d", borderRadius: 8, padding: 20, marginBottom: 20, backgroundColor: "#f8f9fa" }}>
        <h2>Step 3: Add Vendor Entry</h2>
        <div style={{ display:"grid", gap:10 }}>
          <input placeholder="Vendor" value={form.vendor} onChange={e=>setForm({...form, vendor:e.target.value})}/>
          <input placeholder="Category" value={form.category} onChange={e=>setForm({...form, category:e.target.value})}/>
          <input placeholder="Primary Offering" value={form.primaryOffering} onChange={e=>setForm({...form, primaryOffering:e.target.value})}/>
          <input placeholder="Secondary Offering" value={form.secondaryOffering} onChange={e=>setForm({...form, secondaryOffering:e.target.value})}/>
          <input placeholder="Tags (comma separated)" value={form.tags} onChange={e=>setForm({...form, tags:e.target.value})}/>
          <button onClick={add} style={{ padding: "12px", fontSize: 16, fontWeight: "bold" }}>Add Vendor Entry</button>
        </div>
      </div>

      <hr style={{ margin:"20px 0" }} />

      {/* Vendor List */}
      <h2>Existing Vendors</h2>
      <table width="100%" cellPadding="8" style={{ borderCollapse:"collapse", border: "1px solid #ddd" }}>
        <thead style={{ backgroundColor: "#e9ecef" }}>
          <tr>
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
              <td>
                {x.logoUrl && <img src={x.logoUrl} alt="logo" style={{ maxWidth: 48, maxHeight: 48 }} />}
              </td>
              <td><button onClick={()=>remove(x.rowKey)}>Delete</button></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
