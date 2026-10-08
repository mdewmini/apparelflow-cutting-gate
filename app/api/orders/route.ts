import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { expectedQty } from "@/lib/gatekeeper";

const include = {
  recipe: true,
  items: { include: { component: true }, orderBy: { id: "asc" as const } },
  logs: { orderBy: { id: "desc" as const }, take: 1 },
};

// Supervisor: all orders. Verifier: ONLY orders awaiting verification. Sewing: no access.
export async function GET() {
  const g = await requireRole("cutting_supervisor", "cutting_verifier");
  if (g.error) return g.error;
  const where = g.session.role === "cutting_verifier" ? { status: "PENDING_VERIFICATION" } : {};
  return Response.json(await prisma.cuttingOrder.findMany({ where, include, orderBy: { id: "desc" } }));
}

const orderSchema = z.object({
  recipeId: z.number().int().positive(),
  targetQty: z.number().int().positive().max(100000),
  fabricRollId: z.string().trim().min(1).max(50),
  actualFabricYds: z.number().int().positive().max(1000000),
});

export async function POST(req: Request) {
  const g = await requireRole("cutting_supervisor");
  if (g.error) return g.error;

  const parsed = orderSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success)
    return Response.json({ error: "Invalid input", details: parsed.error.flatten().fieldErrors }, { status: 400 });
  const d = parsed.data;

  const recipe = await prisma.recipe.findUnique({ where: { id: d.recipeId }, include: { components: true } });
  if (!recipe) return Response.json({ error: "Recipe not found" }, { status: 404 });

  const order = await prisma.cuttingOrder.create({
    data: {
      orderNo: `CUT-${Date.now().toString().slice(-8)}`,
      recipeId: recipe.id, targetQty: d.targetQty,
      fabricRollId: d.fabricRollId, actualFabricYds: d.actualFabricYds,
      status: "PENDING_VERIFICATION",
      createdBy: g.session.id,
      items: { create: recipe.components.map((c) => ({
        componentId: c.id, expectedQty: expectedQty(d.targetQty, c.piecesPerGarment) })) },
    },
    include,
  });
  return Response.json(order, { status: 201 });
}