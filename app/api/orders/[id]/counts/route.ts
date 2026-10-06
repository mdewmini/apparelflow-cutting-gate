import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole, parseId } from "@/lib/auth";
import { flagFor } from "@/lib/gatekeeper";

const schema = z.object({
  counts: z.array(z.object({
    componentId: z.number().int().positive(),
    actualQty: z.number().int().min(0).max(1000000),
  })).min(1),
});

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const g = await requireRole("cutting_verifier");
  if (g.error) return g.error;
  const orderId = parseId(params.id);
  if (!orderId) return Response.json({ error: "Bad order id" }, { status: 400 });
  const p = schema.safeParse(await req.json().catch(() => null));
  if (!p.success) return Response.json({ error: "Counts must be whole numbers >= 0" }, { status: 400 });

  return prisma.$transaction(async (tx) => {
    const order = await tx.cuttingOrder.findUnique({ where: { id: orderId }, include: { items: true } });
    if (!order) return Response.json({ error: "Order not found" }, { status: 404 });
    if (order.status !== "PENDING_VERIFICATION")
      return Response.json({ error: "Order is not awaiting verification" }, { status: 409 });
    const byComponent = new Map(order.items.map((i) => [i.componentId, i]));
    for (const c of p.data.counts)
      if (!byComponent.has(c.componentId))
        return Response.json({ error: `Unknown component ${c.componentId}` }, { status: 422 });
    for (const c of p.data.counts) {
      const item = byComponent.get(c.componentId)!;
      await tx.verificationItem.update({
        where: { id: item.id },
        data: { actualQty: c.actualQty, status: flagFor(item.expectedQty, c.actualQty) },
      });
    }
    return Response.json({ ok: true });
  });
}