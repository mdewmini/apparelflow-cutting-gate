"use client";
import { useCallback, useEffect, useState } from "react";
import { api, isInt, isPosNum } from "@/lib/client";

export default function Supervisor() {
  const [recipes, setRecipes] = useState<any[]>([]); const [orders, setOrders] = useState<any[]>([]);
  const [f, setF] = useState({ recipeId: "", qty: "", roll: "", yards: "" });
  const [errs, setErrs] = useState<Record<string, string>>({}); const [msg, setMsg] = useState("");
  const load = useCallback(async () => {
    const [r, o] = await Promise.all([api("/api/recipes"), api("/api/orders")]);
    if (r.ok) setRecipes(r.data);
    if (o.ok) setOrders(o.data);
  }, []);
  useEffect(() => { load(); }, [load]);
  const recipe = recipes.find((r) => String(r.id) === f.recipeId);

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setMsg("");
    const er: Record<string, string> = {};
    if (!f.recipeId) er.recipeId = "Select a recipe";
    if (!isInt(f.qty) || Number(f.qty) < 1) er.qty = "Whole number of 1 or more (no decimals or negatives)";
    if (!f.roll.trim()) er.roll = "Fabric roll ID is required";
    if (!isInt(f.yards) || Number(f.yards) < 1) er.yards = "Whole number of yards, 1 or more (no decimals or negatives)";
    setErrs(er); if (Object.keys(er).length) return;
    const r = await api("/api/orders", { method: "POST", body: JSON.stringify({
      recipeId: Number(f.recipeId), targetQty: Number(f.qty),
      fabricRollId: f.roll.trim(), actualFabricYds: Number(f.yards) }) });
    if (r.ok) { setMsg(`Order ${r.data.orderNo} sent to verification`); setF({ recipeId: "", qty: "", roll: "", yards: "" }); load(); }
    else setMsg(r.data.error ?? "Failed");
  }
  async function resubmit(id: number) {
    const r = await api(`/api/orders/${id}/resubmit`, { method: "POST", body: "{}" });
    setMsg(r.ok ? "Re-cut batch resubmitted" : r.data.error); load();
  }

  return (<>
    <form className="card" onSubmit={submit} noValidate>
      <h2>New cutting order</h2>
      <div className="grid">
        <div><label htmlFor="rec">Recipe</label>
          <select id="rec" value={f.recipeId} onChange={(e) => setF({ ...f, recipeId: e.target.value })} aria-invalid={!!errs.recipeId}>
            <option value="">Select...</option>
            {recipes.map((r) => <option key={r.id} value={r.id}>{r.recipeCode} - {r.name}</option>)}
          </select><div className="err">{errs.recipeId}</div></div>
        <div><label htmlFor="qty">Target batch quantity</label>
          <input id="qty" inputMode="numeric" value={f.qty} onChange={(e) => setF({ ...f, qty: e.target.value })} aria-invalid={!!errs.qty} />
          <div className="err">{errs.qty}</div></div>
        <div><label htmlFor="roll">Fabric roll ID</label>
          <input id="roll" value={f.roll} placeholder="FAB-ROLL-882" onChange={(e) => setF({ ...f, roll: e.target.value })} aria-invalid={!!errs.roll} />
          <div className="err">{errs.roll}</div></div>
        <div><label htmlFor="yds">Actual fabric used (yards)</label>
          <input id="yds" inputMode="decimal" value={f.yards} onChange={(e) => setF({ ...f, yards: e.target.value })} aria-invalid={!!errs.yards} />
          <div className="err">{errs.yards}</div></div>
      </div>
      {recipe && isInt(f.qty) && (
        <p className="muted"><b>Expected components:</b> {recipe.components.map((c: any) => `${c.componentName}: ${c.piecesPerGarment * Number(f.qty)}`).join(" | ")}
          {" | "}<b>Expected fabric:</b> {(Number(f.qty) * recipe.stdFabricYards).toFixed(1)} yds</p>)}
      <button type="submit">Submit to verification</button>
      {msg && <p className="ok" role="status">{msg}</p>}
    </form>
    <div className="card"><h2>My cutting orders</h2>
      <table><thead><tr><th>Order</th><th>Recipe</th><th>Qty</th><th>Status</th><th>Note</th><th></th></tr></thead><tbody>
        {orders.map((o) => (<tr key={o.id}><td>{o.orderNo}</td><td>{o.recipe.recipeCode}</td><td>{o.targetQty}</td>
          <td><span className={`badge ${o.status}`}>{o.status}</span></td>
          <td>{o.status === "REJECTED" ? o.logs[0]?.rejectionNote : ""}</td>
          <td>{o.status === "REJECTED" && <button onClick={() => resubmit(o.id)}>Resubmit after re-cut</button>}</td></tr>))}
      </tbody></table></div>
  </>);
}