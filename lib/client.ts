export async function api(path: string, init?: RequestInit) {
    const r = await fetch(path, { ...init, headers: { "Content-Type": "application/json" } });
    const data = await r.json().catch(() => ({}));
    return { ok: r.ok, status: r.status, data };
  }
  export const isInt = (v: string) => /^\d+$/.test(v.trim());
  export const isPosNum = (v: string) => /^\d+(\.\d+)?$/.test(v.trim()) && Number(v) > 0;
  export const flag = (e: number, a: number) => (a === e ? "GREEN" : a > e ? "YELLOW" : "RED");