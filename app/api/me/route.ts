import { getSession } from "@/lib/session";
export async function GET() {
  const s = await getSession();
  return s ? Response.json(s) : Response.json({ error: "Unauthorized" }, { status: 401 });
}