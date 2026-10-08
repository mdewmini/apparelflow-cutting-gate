"use client";
import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/client";

export default function Sewing() {
  const [q, setQ] = useState<any[]>([]); const [msg, setMsg] = useState("");
  const load = useCallback(async () => { const r = await api("/api/sewing/queue"); if (r.ok) setQ(r.data); }, []);
  useEffect(() => { load(); }, [load]);
  async function start(id: number) {
    const r = await api(`/api/sewing/start/${id}`, { method: "POST" });
    setMsg(r.ok ? "Sewing started" : r.data.error); load();
  }
  return (<div className="card"><h2>Sewing queue (verified batches only)</h2>
    {q.length === 0 && <p className="muted">No verified batches yet.</p>}
    {msg && <p className="ok" role="status">{msg}</p>}
    {q.map((o) => { const log = o.logs[0]; return (
      <div key={o.id} className="card"><h3>{o.orderNo} - {o.recipe.name} x {o.targetQty}</h3>
        <p className="muted">Verified by <b>{log?.verifier.fullName}</b> on {log && new Date(log.timestamp).toLocaleString()} | Fabric wastage: <b>{log?.wastagePct}%</b> (cap {o.recipe.wastageCap}%)</p>
          {log?.approvalNote && <p><b>Verifier note:</b> {log.approvalNote}</p>}
        <table><thead><tr><th>Component</th><th>Expected</th><th>Actual</th><th>Flag</th></tr></thead><tbody>
          {o.items.map((i: any) => (<tr key={i.id}><td>{i.component.componentName}</td><td>{i.expectedQty}</td><td>{i.actualQty}</td>
            <td><span className={`badge ${i.status}`}>{i.status}</span></td></tr>))}
        </tbody></table>
        {o.sewingStartedAt ? <p className="ok">Sewing started {new Date(o.sewingStartedAt).toLocaleString()}</p>
          : <button onClick={() => start(o.id)}>Start sewing assembly</button>}
      </div>); })}
  </div>);
}