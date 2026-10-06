import { prisma } from "@/lib/prisma";
import { requireRole, parseId } from "@/lib/auth";

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const g = await requireRole("sewing_supervisor");
  if (g.error) return g.error;
  const id = parseId(params.id);
  if (!id) return Response.json({ error: "Bad order id" }, { status: 400 });
  const r = await prisma.cuttingOrder.updateMany({
    where: { id, status: "VERIFIED", sewingStartedAt: null },
    data: { sewingStartedAt: new Date() },
  });
  if (r.count !== 1) return Response.json({ error: "Order not in queue or already started" }, { status: 409 });
  return Response.json({ ok: true });
}