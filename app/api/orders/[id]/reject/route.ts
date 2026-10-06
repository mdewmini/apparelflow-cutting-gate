import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole, parseId } from "@/lib/auth";
import { wastagePct, variancesOf } from "@/lib/gatekeeper";

const schema = z.object({ note: z.string().trim().min(5).max(500) });

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const g = await requireRole("cutting_verifier");
  if (g.error) return g.error;
  const orderId = parseId(params.id);
  if (!orderId) return Response.json({ error: "Bad order id" }, { status: 400 });
  const p = schema.safeParse(await req.json().catch(() => null));
  if (!p.success) return Response.json({ error: "Rejection reason is mandatory (min 5 chars)" }, { status: 400 });

  return prisma.$transaction(async (tx) => {
    const order = await tx.cuttingOrder.findUnique({
      where: { id: orderId }, include: { items: true, recipe: true } });
    if (!order) return Response.json({ error: "Order not found" }, { status: 404 });
    const moved = await tx.cuttingOrder.updateMany({
      where: { id: orderId, status: "PENDING_VERIFICATION" }, data: { status: "REJECTED" } });
    if (moved.count !== 1) return Response.json({ error: "Order is not awaiting verification" }, { status: 409 });
    await tx.verificationLog.create({
      data: { orderId, verifierId: g.session.id, decision: "REJECTED", rejectionNote: p.data.note,
              wastagePct: wastagePct(order.actualFabricYds, order.targetQty, order.recipe.stdFabricYards),
              variances: variancesOf(order.items) },
    });
    return Response.json({ ok: true, status: "REJECTED" });
  });
}