import { getSession, type Role, type Session } from "./session";

type Guard = { session: Session; error?: undefined } | { error: Response; session?: undefined };

/** 401 if not logged in, 403 if logged in with the wrong role. */
export async function requireRole(...roles: Role[]): Promise<Guard> {
  const session = await getSession();
  if (!session) return { error: Response.json({ error: "Unauthorized" }, { status: 401 }) };
  if (!roles.includes(session.role))
    return { error: Response.json({ error: "Forbidden: insufficient role" }, { status: 403 }) };
  return { session };
}

export function parseId(raw: string) {
  const n = Number(raw);
  return Number.isInteger(n) && n > 0 ? n : null;
}