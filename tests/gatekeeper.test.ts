import { describe, it, expect } from "vitest";
import { canApprove, flagFor, wastagePct, expectedQty } from "@/lib/gatekeeper";

describe("domain rules", () => {
  it("traffic lights", () => {
    expect(flagFor(100, 100)).toBe("GREEN");
    expect(flagFor(100, 101)).toBe("YELLOW");
    expect(flagFor(100, 99)).toBe("RED");
  });
  it("multiplier engine: 50 garments x 2 cuffs = 100", () => expect(expectedQty(50, 2)).toBe(100));
  it("wastage %", () => expect(wastagePct(94.5, 50, 1.8)).toBe(5));
  it("uncounted or missing components block approval", () => {
    expect(canApprove([{ componentId: 1, expectedQty: 5, actualQty: null }], 1)).toBe(false);
    expect(canApprove([{ componentId: 1, expectedQty: 5, actualQty: 5 }], 2)).toBe(false);
  });
  it("YELLOW (excess) may proceed", () =>
    expect(canApprove([{ componentId: 1, expectedQty: 5, actualQty: 6 }], 1)).toBe(true));
});