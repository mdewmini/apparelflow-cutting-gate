import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";

// Query isolation: the filter is hard-coded in the DB query; no URL params are read.
export async function GET() {
  const g = await requireRole("sewing_supervisor");
  if (g.error) return g.error;
  const orders = await prisma.cuttingOrder.findMany({
    where: { status: "VERIFIED" },
    include: {
      recipe: true,
      items: { include: { component: true }, orderBy: { id: "asc" } },
      logs: { where: { decision: "APPROVED" }, include: { verifier: { select: { fullName: true } } } },
    },
    orderBy: { updatedAt: "desc" },
  });
  return Response.json(orders);
}