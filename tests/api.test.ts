import { describe, it, expect, vi, beforeEach } from "vitest";

const { prismaMock, getSession } = vi.hoisted(() => {
  const prismaMock: any = {
    cuttingOrder: { findUnique: vi.fn(), updateMany: vi.fn(), findMany: vi.fn() },
    verificationLog: { create: vi.fn() },
    $transaction: (fn: any) => fn(prismaMock),
  };
  return { prismaMock, getSession: vi.fn() };
});
vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));
vi.mock("@/lib/session", () => ({ getSession }));

import { POST as approve } from "@/app/api/orders/[id]/approve/route";
import { POST as reject } from "@/app/api/orders/[id]/reject/route";
import { GET as queue } from "@/app/api/sewing/queue/route";

const ctx = { params: { id: "1" } };
const verifier = { id: 7, role: "cutting_verifier", fullName: "Vera" };
const order = (actuals: (number | null)[]) => ({
  id: 1, status: "PENDING_VERIFICATION", targetQty: 50, actualFabricYds: 90,
  recipe: { stdFabricYards: 1.8, components: actuals.map((_, i) => ({ id: i + 1 })) },
  items: actuals.map((a, i) => ({ componentId: i + 1, expectedQty: 10, actualQty: a })),
});
const jsonReq = (body: unknown) => new Request("http://x", { method: "POST", body: JSON.stringify(body) });
const post = () => new Request("http://x", { method: "POST" });

beforeEach(() => {
  vi.clearAllMocks();
  prismaMock.cuttingOrder.updateMany.mockResolvedValue({ count: 1 });
});

describe("API rules", () => {
  it("Test 1: all-GREEN order is approved by a verifier (identity from session)", async () => {
    getSession.mockResolvedValue(verifier);
    prismaMock.cuttingOrder.findUnique.mockResolvedValue(order([10, 10, 12]));
    const res = await approve(post(), ctx);
    expect(res.status).toBe(200);
    expect(prismaMock.verificationLog.create.mock.calls[0][0].data.verifierId).toBe(7);
  });
  it("Test 2: a RED component blocks approval with 422", async () => {
    getSession.mockResolvedValue(verifier);
    prismaMock.cuttingOrder.findUnique.mockResolvedValue(order([10, 9, 10]));
    const res = await approve(post(), ctx);
    expect(res.status).toBe(422);
    expect(prismaMock.cuttingOrder.updateMany).not.toHaveBeenCalled();
  });
  it("Test 3: rejecting without a note fails validation", async () => {
    getSession.mockResolvedValue(verifier);
    expect((await reject(jsonReq({ note: "  " }), ctx)).status).toBe(400);
    expect((await reject(jsonReq({}), ctx)).status).toBe(400);
  });
  it("Test 4: non-verifier roles get 403 on approve", async () => {
    for (const role of ["cutting_supervisor", "sewing_supervisor"]) {
      getSession.mockResolvedValue({ id: 1, role, fullName: "x" });
      expect((await approve(post(), ctx)).status).toBe(403);
    }
    getSession.mockResolvedValue(null);
    expect((await approve(post(), ctx)).status).toBe(401);
  });
  it("Test 5: sewing queue query is hard-filtered to VERIFIED", async () => {
    getSession.mockResolvedValue({ id: 3, role: "sewing_supervisor", fullName: "S" });
    prismaMock.cuttingOrder.findMany.mockResolvedValue([]);
    await queue();
    expect(prismaMock.cuttingOrder.findMany.mock.calls[0][0].where).toEqual({ status: "VERIFIED" });
    getSession.mockResolvedValue({ id: 1, role: "cutting_supervisor", fullName: "x" });
    expect((await queue()).status).toBe(403);
  });
});