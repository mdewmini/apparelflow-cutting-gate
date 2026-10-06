export type Flag = "GREEN" | "YELLOW" | "RED";

export const flagFor = (expected: number, actual: number): Flag =>
  actual === expected ? "GREEN" : actual > expected ? "YELLOW" : "RED";

export const expectedQty = (targetQty: number, perGarment: number) => targetQty * perGarment;

/** Wastage % = ((actual - expected) / expected) * 100, expected = target * std yards */
export const wastagePct = (actualYds: number, targetQty: number, stdYds: number) => {
  const expected = targetQty * stdYds;
  return Math.round(((actualYds - expected) / expected) * 10000) / 100;
};

type Item = { componentId: number; expectedQty: number; actualQty: number | null };

/** Approval only if EVERY recipe component is counted and none is RED. */
export function canApprove(items: Item[], recipeComponentCount: number): boolean {
  if (recipeComponentCount === 0 || items.length !== recipeComponentCount) return false;
  return items.every((i) => i.actualQty !== null && flagFor(i.expectedQty, i.actualQty) !== "RED");
}

export const variancesOf = (items: Item[]) =>
  items.map((i) => ({
    componentId: i.componentId,
    expected: i.expectedQty,
    actual: i.actualQty,
    variance: (i.actualQty ?? 0) - i.expectedQty,
    flag: i.actualQty === null ? "RED" : flagFor(i.expectedQty, i.actualQty),
  }));