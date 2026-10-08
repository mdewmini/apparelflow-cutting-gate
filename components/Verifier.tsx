"use client";
import { useCallback, useEffect, useState } from "react";
import { api, isInt, flag } from "@/lib/client";

export default function Verifier() {
  const [orders, setOrders] = useState<any[]>([]); const [sel, setSel] = useState<any>(null);
  const [counts, setCounts] = useState<Record<number, string>>({});
  const [note, setNote] = useState(""); const [approveNote, setApproveNote] = useState("");
  const [msg, setMsg] = useState(""); const [noteErr, setNoteErr] = useState("");
  const load = useCallback(async () => { const r = await api("/api/orders"); if (r.ok) setOrders(r.data); }, []);
  useEffect(() => { load(); }, [load]);

  function pick(o: any) {
    setSel(o); setMsg(""); setNote(""); setApproveNote(""); setNoteErr("");
    setCounts(Object.fromEntries(o.items.map((i: any) => [i.componentId, i.actualQty === null ? "" : String(i.actualQty)])));
  }
  const rows = sel ? sel.items.map((i: any) => {
    const raw = counts[i.componentId] ?? ""; const valid = isInt(raw);
    return { ...i, raw, valid, flag: valid ? flag(i.expectedQty, Number(raw)) : null };
  }) : [];
  const allowApprove = rows.length > 0 && rows.every((r: any) => r.valid && r.flag !== "RED");

  async function saveCounts() {
    return api(`/api/orders/${sel.id}/counts`, { method: "PUT", body: JSON.stringify({
      counts: rows.filter((r: any) => r.valid).map((r: any) => ({ componentId: r.componentId, actualQty: Number(r.raw) })) }) });
  }
  async function approve() {
    const s = await saveCounts(); if (!s.ok) return setMsg(s.data.error);
    const r = await api(`/api/orders/${sel.id}/approve`, { method: "POST", body: JSON.stringify({ note: approveNote }) });
    setMsg(r.ok ? `Verified. Fabric wastage ${r.data.wastagePct}%` : r.data.error);
    if (r.ok) { setSel(null); load(); }
  }
  async function reject() {
    if (note.trim().length < 5) return setNoteErr("A rejection reason (min 5 characters) is mandatory");
    setNoteErr(""); await saveCounts();
    const r = await api(`/api/orders/${sel.id}/reject`, { method: "POST", body: JSON.stringify({ note }) });
    setMsg(r.ok ? "Batch rejected and returned to supervisor" : r.data.error);
    if (r.ok) { setSel(null); load(); }
  }

  return (<>
    <div className="card"><h2>Pending verification</h2>
      {orders.length === 0 && <p className="muted">No batches waiting.</p>}
      {orders.map((o) => (<p key={o.id}><button className="secondary" onClick={() => pick(o)}>{o.orderNo} - {o.recipe.name} x {o.targetQty}</button></p>))}
      {msg && <p className="ok" role="status">{msg}</p>}
    </div>
    {sel && (<div className="card"><h2>{sel.orderNo} - count every component</h2>
      <table><thead><tr><th>Component</th><th>Expected</th><th>Actual count</th><th>Status</th></tr></thead><tbody>
        {rows.map((r: any) => (<tr key={r.id}><td>{r.component.componentName}</td><td>{r.expectedQty}</td>
          <td><input aria-label={`Actual ${r.component.componentName}`} inputMode="numeric" value={r.raw}
            aria-invalid={r.raw !== "" && !r.valid}
            onChange={(e) => setCounts({ ...counts, [r.componentId]: e.target.value })} />
            {r.raw !== "" && !r.valid && <div className="err">Whole numbers only</div>}</td>
          <td>{r.flag ? <span className={`badge ${r.flag}`}>{r.flag}</span> : "-"}</td></tr>))}
      </tbody></table>
      <label htmlFor="approveNote">Approval note for sewing (optional)</label>
      <textarea id="approveNote" rows={2} maxLength={500} value={approveNote} onChange={(e) => setApproveNote(e.target.value)} />
      <label htmlFor="note">Rejection reason (required to reject)</label>
      <textarea id="note" rows={3} value={note} onChange={(e) => setNote(e.target.value)} aria-invalid={!!noteErr} />
      <div className="err">{noteErr}</div>
      {!allowApprove && <p className="err">Approval disabled: every component must be counted with no RED shortage.</p>}
      <div className="row"><button disabled={!allowApprove} onClick={approve}>Approve batch</button>
        <button className="danger" onClick={reject}>Reject batch</button></div>
    </div>)}
  </>);
}