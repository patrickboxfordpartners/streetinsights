import { verifyToken } from "@clerk/backend";
import type { Request } from "express";

export async function clerkUserId(req: Request): Promise<string | null> {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) return null;
  const secretKey = process.env.CLERK_SECRET_KEY;
  if (!secretKey) return null;
  try {
    const payload = await verifyToken(header.slice("Bearer ".length), { secretKey });
    return payload.sub ?? null;
  } catch {
    return null;
  }
}
