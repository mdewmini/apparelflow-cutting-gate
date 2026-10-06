import { NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { signToken, type Role } from "@/lib/session";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const p = z.object({ email: z.string().email(), password: z.string().min(1) }).safeParse(body);
  if (!p.success) return Response.json({ error: "Valid email and password required" }, { status: 400 });

  const user = await prisma.user.findUnique({ where: { email: p.data.email.toLowerCase() } });
  const ok = user ? await bcrypt.compare(p.data.password, user.passwordHash) : false;
  if (!user || !ok) return Response.json({ error: "Invalid email or password" }, { status: 401 });

  const me = { id: user.id, role: user.role as Role, fullName: user.fullName };
  const res = NextResponse.json(me);
  res.cookies.set("token", await signToken(me), {
    httpOnly: true, sameSite: "lax", path: "/", maxAge: 8 * 3600,
    secure: process.env.NODE_ENV === "production",
  });
  return res;
}