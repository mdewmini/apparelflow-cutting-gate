import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";

export async function GET() {
  const g = await requireRole("cutting_supervisor", "cutting_verifier");
  if (g.error) return g.error;
  return Response.json(await prisma.recipe.findMany({ include: { components: true }, orderBy: { id: "asc" } }));
}