import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const hash = await bcrypt.hash("Passw0rd!", 10);
  const users = [
    { email: "supervisor@apparelflow.test", role: "cutting_supervisor", fullName: "Sam Supervisor" },
    { email: "verifier@apparelflow.test", role: "cutting_verifier", fullName: "Vera Verifier" },
    { email: "sewing@apparelflow.test", role: "sewing_supervisor", fullName: "Sewa Sewing" },
  ];
  for (const u of users)
    await prisma.user.upsert({ where: { email: u.email }, update: {}, create: { ...u, passwordHash: hash } });

  const recipes = [
    { recipeCode: "REC-BL01", name: "Casual Blouse", category: "Blouse", stdFabricYards: 1.8, wastageCap: 5.0,
      parts: [["Front Body Panel", 1], ["Back Body Panel", 1], ["Sleeves (Left & Right)", 2], ["Collar & Stand", 1], ["Sleeve Cuffs", 2]] },
    { recipeCode: "REC-CT02", name: "Crop Top", category: "Crop Top", stdFabricYards: 1.1, wastageCap: 8.0,
      parts: [["Front Chest Panel", 1], ["Back Support Panel", 1], ["Neck Binding Strip", 1], ["Hem Elastic Casing", 1], ["Side Strap Accents", 2]] },
  ] as const;
  for (const r of recipes) {
    if (await prisma.recipe.findUnique({ where: { recipeCode: r.recipeCode } })) continue;
    await prisma.recipe.create({
      data: {
        recipeCode: r.recipeCode, name: r.name, category: r.category,
        stdFabricYards: r.stdFabricYards, wastageCap: r.wastageCap,
        components: { create: r.parts.map(([componentName, piecesPerGarment]) => ({ componentName, piecesPerGarment })) },
      },
    });
  }

  // Audit trail can never be updated or deleted, even by buggy code.
  await prisma.$executeRawUnsafe(`
    CREATE OR REPLACE FUNCTION forbid_log_change() RETURNS trigger AS $$
    BEGIN RAISE EXCEPTION 'verification_logs is append-only'; END; $$ LANGUAGE plpgsql;`);
  await prisma.$executeRawUnsafe(`DROP TRIGGER IF EXISTS verification_logs_immutable ON verification_logs;`);
  await prisma.$executeRawUnsafe(`
    CREATE TRIGGER verification_logs_immutable BEFORE UPDATE OR DELETE ON verification_logs
    FOR EACH ROW EXECUTE FUNCTION forbid_log_change();`);
  console.log("Seed complete.");
}
main().finally(() => prisma.$disconnect());