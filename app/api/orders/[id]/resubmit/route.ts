import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole, parseId } from "@/lib/auth";

const schema = z.object({ actualFabricYds: z.number().positive().max(1000000).optional() });

// Supervisor re-cuts a REJECTED batch and sends it back to QC.
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const g = await requireRole("cutting_supervisor");
  if (g.error) return g.error;
  const orderId = parseId(params.id);
  if (!orderId) return Response.json({ error: "Bad order id" }, { status: 400 });
  const p = schema.safeParse(await req.json().catch(() => ({})));
  if (!p.success) return Response.json({ error: "Invalid fabric yards" }, { status: 400 });

  return prisma.$transaction(async (tx) => {
    const moved = await tx.cuttingOrder.updateMany({
      where: { id: orderId, status: "REJECTED" },
      data: { status: "PENDING_VERIFICATION", ...(p.data.actualFabricYds ? { actualFabricYds: p.data.actualFabricYds } : {}) },
    });
    if (moved.count !== 1) return Response.json({ error: "Only REJECTED orders can be resubmitted" }, { status: 409 });
    await tx.verificationItem.updateMany({ where: { orderId }, data: { actualQty: null, status: null } });
    return Response.json({ ok: true, status: "PENDING_VERIFICATION" });
  });
}