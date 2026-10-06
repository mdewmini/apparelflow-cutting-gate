import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

export type Role = "cutting_supervisor" | "cutting_verifier" | "sewing_supervisor";
export type Session = { id: number; role: Role; fullName: string };
const ROLES: Role[] = ["cutting_supervisor", "cutting_verifier", "sewing_supervisor"];

function key() {
  if (!process.env.JWT_SECRET) throw new Error("JWT_SECRET is not set");
  return new TextEncoder().encode(process.env.JWT_SECRET);
}

export async function signToken(s: Session) {
  return new SignJWT({ role: s.role, fullName: s.fullName })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(String(s.id))
    .setIssuedAt()
    .setExpirationTime("8h")
    .sign(key());
}

/** Identity ALWAYS comes from the signed cookie, never from a request body. */
export async function getSession(): Promise<Session | null> {
  const token = cookies().get("token")?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, key());
    const role = payload.role as Role;
    if (!ROLES.includes(role)) return null;
    return { id: Number(payload.sub), role, fullName: String(payload.fullName) };
  } catch {
    return null;
  }
}