"use client";
import { useState } from "react";
import { api } from "@/lib/client";

const DEMO = [
  { label: "Cutting Supervisor", email: "supervisor@apparelflow.test" },
  { label: "Cutting Verifier", email: "verifier@apparelflow.test" },
  { label: "Sewing Supervisor", email: "sewing@apparelflow.test" },
];

export default function Login() {
  const [email, setEmail] = useState(""); const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  async function submit(e: React.FormEvent) {
    e.preventDefault(); setError("");
    const r = await api("/api/login", { method: "POST", body: JSON.stringify({ email, password }) });
    if (r.ok) window.location.href = "/"; else setError(r.data.error ?? "Login failed");
  }
  return (
    <main>
      <h1>ApparelFlow ERP - Cutting Gate</h1>
      <div className="grid">
        <form className="card" onSubmit={submit}>
          <h2>Sign in</h2>
          <label htmlFor="email">Email</label>
          <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <label htmlFor="pw">Password</label>
          <input id="pw" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
          {error && <div className="err" role="alert">{error}</div>}
          <p><button type="submit">Sign in</button></p>
        </form>
        <div className="card">
          <h2>Demo credentials</h2>
          <p className="muted">Password for all: <b>Passw0rd!</b></p>
          {DEMO.map((d) => (
            <div key={d.email} style={{ marginBottom: 12 }}>
              <button type="button" className="secondary"
                onClick={() => { setEmail(d.email); setPassword("Passw0rd!"); }}>{d.label}</button>
              <div className="muted">{d.email}</div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}