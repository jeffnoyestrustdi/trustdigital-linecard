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

  async function load() {
    const r = await fetch("/api/linecard");
    setItems(await r.json());
  }

  useEffect(() => { load(); }, []);

  async function add() {
    const payload = {
      vendor: form.vendor.trim(),
      category: form.category.trim(),
      primaryOffering: form.primaryOffering.trim(),
      secondaryOffering: form.secondaryOffering.trim(),
      tags: form.tags.split(",").map(t => t.trim()).filter(Boolean)
    };

    const r = await fetch("/api/vendor", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload)
    });

    if (!r.ok) alert(await r.text());
    else {
      setForm({ vendor:"", category:"", primaryOffering:"", secondaryOffering:"", tags:"" });
      load();
    }
  }

  async function remove(id) {
    const r = await fetch(`/api/vendor?id=${encodeURIComponent(id)}`, { method: "DELETE" });
    if (!r.ok) alert(await r.text());
    else load();
  }

  return (
    <div style={{ padding: 20 }}>
      <h1>Line Card Admin</h1>
      <p>Signed-in users only. Admin actions restricted by allowlist.</p>

      <div style={{ display:"grid", gap:10, maxWidth: 700 }}>
        <input placeholder="Vendor" value={form.vendor} onChange={e=>setForm({...form, vendor:e.target.value})}/>
        <input placeholder="Category" value={form.category} onChange={e=>setForm({...form, category:e.target.value})}/>
        <input placeholder="Primary Offering" value={form.primaryOffering} onChange={e=>setForm({...form, primaryOffering:e.target.value})}/>
        <input placeholder="Secondary Offering" value={form.secondaryOffering} onChange={e=>setForm({...form, secondaryOffering:e.target.value})}/>
        <input placeholder="Tags (comma separated)" value={form.tags} onChange={e=>setForm({...form, tags:e.target.value})}/>
        <button onClick={add}>Add Vendor Entry</button>
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
