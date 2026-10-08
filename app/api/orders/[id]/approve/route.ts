import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole, parseId } from "@/lib/auth";
import { canApprove, wastagePct, variancesOf } from "@/lib/gatekeeper";

const bodySchema = z.object({ note: z.string().trim().max(500).optional() });

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const g = await requireRole("cutting_verifier");            // 401 / 403
  if (g.error) return g.error;
  const orderId = parseId(params.id);
  if (!orderId) return Response.json({ error: "Bad order id" }, { status: 400 });
  const body = bodySchema.safeParse(await req.json().catch(() => ({})));
  if (!body.success) return Response.json({ error: "Note must be 500 characters or fewer" }, { status: 400 });
  const approvalNote = body.data.note || null;

  return prisma.$transaction(async (tx) => {
    const order = await tx.cuttingOrder.findUnique({
      where: { id: orderId },
      include: { items: true, recipe: { include: { components: true } } },
    });
    if (!order) return Response.json({ error: "Order not found" }, { status: 404 });
    if (order.status !== "PENDING_VERIFICATION")
      return Response.json({ error: "Order is not awaiting verification" }, { status: 409 });

    // HARD STOP: recomputed on the server from stored counts, never from client flags.
    if (!canApprove(order.items, order.recipe.components.length))
      return Response.json(
        { error: "Approval blocked: a component is RED (shortage), missing or uncounted" },
        { status: 422 });

    const pct = wastagePct(order.actualFabricYds, order.targetQty, order.recipe.stdFabricYards);
    const moved = await tx.cuttingOrder.updateMany({
      where: { id: orderId, status: "PENDING_VERIFICATION" },
      data: { status: "VERIFIED" },
    });
    if (moved.count !== 1) return Response.json({ error: "Order state changed" }, { status: 409 });

    await tx.verificationLog.create({
      data: { orderId, verifierId: g.session.id, decision: "APPROVED", approvalNote,
              wastagePct: pct, variances: variancesOf(order.items) },
    });
    return Response.json({ ok: true, status: "VERIFIED", wastagePct: pct });
  });
}