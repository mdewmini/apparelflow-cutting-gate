"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/client";
import Supervisor from "@/components/Supervisor";
import Verifier from "@/components/Verifier";
import Sewing from "@/components/Sewing";

type Me = { id: number; role: string; fullName: string };
const ROLE_LABEL: Record<string, string> = {
  cutting_supervisor: "Cutting Supervisor", cutting_verifier: "Cutting Verifier", sewing_supervisor: "Sewing Supervisor",
};

export default function Home() {
  const [me, setMe] = useState<Me | null>(null);
  useEffect(() => {
    api("/api/me").then((r) => (r.ok ? setMe(r.data) : (window.location.href = "/login")));
  }, []);
  if (!me) return <main>Loading...</main>;
  async function logout() { await api("/api/logout", { method: "POST" }); window.location.href = "/login"; }
  return (
    <main>
      <div className="row" style={{ justifyContent: "space-between" }}>
        <h1>ApparelFlow - {ROLE_LABEL[me.role]}</h1>
        <div className="row"><span>{me.fullName}</span>
          <button className="secondary" onClick={logout}>Switch role / Log out</button></div>
      </div>
      {me.role === "cutting_supervisor" && <Supervisor />}
      {me.role === "cutting_verifier" && <Verifier />}
      {me.role === "sewing_supervisor" && <Sewing />}
    </main>
  );
}